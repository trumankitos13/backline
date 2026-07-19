-- Phase 2: real account-to-account direct messages and an enforced booking
-- lifecycle. The original conversations/messages tables remain in place for
-- seeded catalog demos; these tables connect authenticated profile UUIDs.

create table public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_conversations_distinct_participants
    check (participant_a <> participant_b),
  constraint direct_conversations_canonical_order
    check (participant_a::text < participant_b::text),
  constraint direct_conversations_unique_pair unique (participant_a, participant_b)
);

create table public.direct_messages (
  id text primary key,
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  booking_id text references public.bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint direct_messages_content check (
    (body is not null and char_length(btrim(body)) between 1 and 4000)
    or booking_id is not null
  )
);

create table public.direct_conversation_reads (
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index direct_conversations_participant_b_idx
  on public.direct_conversations (participant_b, updated_at desc);
create index direct_messages_conversation_created_idx
  on public.direct_messages (conversation_id, created_at);
create index direct_messages_sender_id_idx
  on public.direct_messages (sender_id);
create index direct_messages_booking_id_idx
  on public.direct_messages (booking_id)
  where booking_id is not null;
create index direct_conversation_reads_user_id_idx
  on public.direct_conversation_reads (user_id);

alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.direct_conversation_reads enable row level security;

create policy "participants can read direct conversations"
  on public.direct_conversations for select to authenticated
  using ((select auth.uid()) in (participant_a, participant_b));

create policy "participants can create direct conversations"
  on public.direct_conversations for insert to authenticated
  with check ((select auth.uid()) in (participant_a, participant_b));

create policy "participants can read direct messages"
  on public.direct_messages for select to authenticated
  using (
    exists (
      select 1
      from public.direct_conversations conversation
      where conversation.id = conversation_id
        and (select auth.uid()) in (conversation.participant_a, conversation.participant_b)
    )
  );

create policy "participants can send direct messages"
  on public.direct_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.direct_conversations conversation
      where conversation.id = conversation_id
        and (select auth.uid()) in (conversation.participant_a, conversation.participant_b)
    )
  );

create policy "users can read their direct read markers"
  on public.direct_conversation_reads for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users can create their direct read markers"
  on public.direct_conversation_reads for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.direct_conversations conversation
      where conversation.id = conversation_id
        and (select auth.uid()) in (conversation.participant_a, conversation.participant_b)
    )
  );

create policy "users can update their direct read markers"
  on public.direct_conversation_reads for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert on public.direct_conversations to authenticated;
grant select, insert on public.direct_messages to authenticated;
grant select, insert, update on public.direct_conversation_reads to authenticated;

-- Existing bookings can point at seeded catalog musicians. Real bookings also
-- carry the invited account UUID, while musician_id remains the UI-facing
-- player id for backwards compatibility.
alter table public.bookings drop constraint if exists bookings_musician_id_fkey;
alter table public.bookings
  add column musician_user_id uuid references public.profiles(id) on delete restrict,
  add column responded_at timestamptz,
  add column paid_at timestamptz,
  add column completed_at timestamptz,
  add column cancelled_at timestamptz,
  add column updated_at timestamptz not null default now(),
  add constraint bookings_amount_bounds check (amount between 0 and 100000),
  add constraint bookings_gig_title_length check (char_length(btrim(gig_title)) between 1 and 160),
  add constraint bookings_venue_name_length check (
    venue_name is null or char_length(venue_name) <= 160
  ),
  add constraint bookings_date_length check (date is null or char_length(date) <= 80),
  add constraint bookings_time_length check (time is null or char_length(time) <= 80),
  add constraint bookings_real_recipient_matches_player check (
    musician_user_id is null or musician_id = musician_user_id::text
  );

alter type public.booking_status add value if not exists 'completed';
alter type public.booking_status add value if not exists 'cancelled';

create index bookings_musician_user_id_idx
  on public.bookings (musician_user_id, created_at desc)
  where musician_user_id is not null;

drop policy "own bookings: all" on public.bookings;
create policy "booking participants can read"
  on public.bookings for select to authenticated
  using ((select auth.uid()) in (user_id, musician_user_id));
create policy "bookers can create offers"
  on public.bookings for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status::text = 'offer'
    and (
      musician_user_id is not null
      or exists (
        select 1 from public.musicians musician where musician.id = musician_id
      )
    )
  );
create policy "booking participants can request transitions"
  on public.bookings for update to authenticated
  using ((select auth.uid()) in (user_id, musician_user_id))
  with check ((select auth.uid()) in (user_id, musician_user_id));

create function public.enforce_booking_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  old_status text := old.status::text;
  new_status text := new.status::text;
begin
  if new.user_id is distinct from old.user_id
    or new.musician_user_id is distinct from old.musician_user_id
    or new.musician_id is distinct from old.musician_id
    or new.gig_title is distinct from old.gig_title
    or new.venue_name is distinct from old.venue_name
    or new.date is distinct from old.date
    or new.time is distinct from old.time
    or new.amount is distinct from old.amount
    or new.opening_id is distinct from old.opening_id
    or new.created_at is distinct from old.created_at then
    raise exception 'booking details cannot change after the offer is sent';
  end if;

  -- Status timestamps are server-owned even when a caller includes them in a
  -- direct REST update.
  new.responded_at := old.responded_at;
  new.paid_at := old.paid_at;
  new.completed_at := old.completed_at;
  new.cancelled_at := old.cancelled_at;
  new.updated_at := old.updated_at;

  if new_status = old_status then
    return old;
  end if;

  if old_status = 'offer' and new_status in ('accepted', 'declined') then
    if actor is distinct from old.musician_user_id then
      raise exception 'only the invited player can respond to this offer';
    end if;
    new.responded_at := now();
  elsif old_status = 'offer' and new_status = 'cancelled' then
    if actor is distinct from old.user_id then
      raise exception 'only the booker can cancel this offer';
    end if;
    new.cancelled_at := now();
  elsif old_status = 'accepted' and new_status = 'cancelled' then
    if actor not in (old.user_id, old.musician_user_id) then
      raise exception 'only a booking participant can cancel';
    end if;
    new.cancelled_at := now();
  elsif old_status = 'accepted' and new_status = 'paid' then
    if actor is distinct from old.user_id then
      raise exception 'only the booker can mark the booking paid';
    end if;
    new.paid_at := now();
  elsif old_status = 'paid' and new_status = 'completed' then
    if actor is distinct from old.user_id then
      raise exception 'only the booker can complete this booking';
    end if;
    new.completed_at := now();
  else
    raise exception 'invalid booking transition: % to %', old_status, new_status;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.enforce_booking_transition() from public, anon, authenticated;

create trigger enforce_booking_transition_before_update
  before update on public.bookings
  for each row execute function public.enforce_booking_transition();

-- Postgres Changes is intentionally used for the first live-chat release: RLS
-- filters each event to conversation participants. Broadcast is the scale-up
-- path once message volume warrants the additional trigger infrastructure.
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.bookings;
