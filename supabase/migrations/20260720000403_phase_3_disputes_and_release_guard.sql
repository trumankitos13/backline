create type public.booking_dispute_reason as enum ('no_show', 'quality', 'other');
create type public.booking_dispute_status as enum (
  'open',
  'resolved_release',
  'resolved_refund',
  'withdrawn'
);

create table public.booking_disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id text references public.bookings(id) on delete set null,
  filed_by uuid references public.profiles(id) on delete set null,
  reason public.booking_dispute_reason not null,
  details text not null default '',
  status public.booking_dispute_status not null default 'open',
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint booking_disputes_details_length check (char_length(details) <= 2000),
  constraint booking_disputes_resolution_length check (
    resolution_note is null or char_length(resolution_note) <= 2000
  ),
  constraint booking_disputes_resolution_shape check (
    (status = 'open' and resolved_at is null and resolution_note is null)
    or (status <> 'open' and resolved_at is not null)
  )
);

create unique index booking_disputes_one_open_per_booking_idx
  on public.booking_disputes (booking_id)
  where status = 'open';
create index booking_disputes_booking_idx on public.booking_disputes (booking_id);
create index booking_disputes_filer_idx on public.booking_disputes (filed_by);
create index booking_disputes_created_idx on public.booking_disputes (created_at desc);

create index booking_payments_release_queue_idx
  on public.booking_payments (updated_at, created_at)
  where status in ('held', 'capture_pending');
create index bookings_release_queue_idx
  on public.bookings (gig_at, id)
  where status = 'held';

alter table public.booking_disputes enable row level security;

create policy "booking participants can read disputes"
  on public.booking_disputes for select to authenticated
  using (
    exists (
      select 1
      from public.bookings booking
      where booking.id = booking_id
        and (select auth.uid()) in (booking.user_id, booking.musician_user_id)
    )
  );

create policy "booking participants can file timely disputes"
  on public.booking_disputes for insert to authenticated
  with check (
    filed_by = (select auth.uid())
    and status = 'open'
    and resolved_at is null
    and resolution_note is null
    and exists (
      select 1
      from public.bookings booking
      where booking.id = booking_id
        and (select auth.uid()) in (booking.user_id, booking.musician_user_id)
        and booking.status::text = 'held'
        and booking.gig_at is not null
        and now() <= booking.gig_at + interval '24 hours'
    )
  );

grant select on public.booking_disputes to authenticated;
grant insert (booking_id, filed_by, reason, details)
  on public.booking_disputes to authenticated;

-- Extend the booking state machine only after the dispute relation exists.
-- The insert trigger below runs in the filing user's transaction, so the
-- transition can prove that an open dispute by that participant was created.
create or replace function public.enforce_booking_transition()
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
  elsif old_status = 'accepted' and new_status = 'held' then
    if actor is not null then
      raise exception 'only the payment service can confirm a hold';
    end if;
    new.paid_at := now();
  elsif old_status = 'held' and new_status = 'released' then
    if actor is not null then
      raise exception 'only the payment service can confirm a release';
    end if;
    new.completed_at := now();
  elsif old_status = 'held' and new_status = 'cancelled' then
    if actor is not null then
      raise exception 'only the payment service can cancel a held booking';
    end if;
    new.cancelled_at := now();
  elsif old_status = 'held' and new_status = 'disputed' then
    if not exists (
      select 1
      from public.booking_disputes dispute
      where dispute.booking_id = old.id
        and dispute.filed_by = actor
        and dispute.status::text = 'open'
    ) then
      raise exception 'an open participant dispute is required to freeze a booking';
    end if;
  elsif old_status = 'disputed' and new_status in ('released', 'refunded') then
    if actor is not null then
      raise exception 'only the payment service can resolve a dispute';
    end if;
    if new_status = 'released' then
      new.completed_at := now();
    else
      new.cancelled_at := now();
    end if;
  else
    raise exception 'invalid booking transition: % to %', old_status, new_status;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create function private.freeze_disputed_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.bookings
  set status = 'disputed'
  where id = new.booking_id and status::text = 'held';
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'booking is no longer eligible for dispute';
  end if;

  update public.booking_payments
  set status = 'disputed', updated_at = now()
  where booking_id = new.booking_id and status = 'held';
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'held payment not found for disputed booking';
  end if;
  return new;
end;
$$;

revoke execute on function private.freeze_disputed_booking()
  from public, anon, authenticated;

create trigger freeze_booking_after_dispute
  after insert on public.booking_disputes
  for each row execute function private.freeze_disputed_booking();

-- Atomically reserve release work before contacting Stripe. Moving the
-- payment out of `held` closes the dispute race; abandoned reservations may
-- be reclaimed after fifteen minutes.
create function public.claim_due_booking_payments(batch_size integer default 50)
returns table (
  payment_id uuid,
  booking_id text,
  stripe_payment_intent_id text
)
language sql
security definer
set search_path = ''
as $$
  with candidates as (
    select payment.id
    from public.booking_payments payment
    join public.bookings booking on booking.id = payment.booking_id
    where (
      payment.status = 'held'
      or (
        payment.status = 'capture_pending'
        and payment.updated_at < now() - interval '15 minutes'
      )
    )
      and payment.stripe_payment_intent_id is not null
      and payment.authorization_expires_at > now()
      and booking.status::text = 'held'
      and booking.gig_at is not null
      and booking.gig_at + interval '24 hours' <= now()
      and not exists (
        select 1
        from public.booking_disputes dispute
        where dispute.booking_id = booking.id and dispute.status = 'open'
      )
    order by booking.gig_at, payment.created_at
    limit greatest(1, least(coalesce(batch_size, 50), 100))
    for update of payment skip locked
  ), claimed as (
    update public.booking_payments payment
    set status = 'capture_pending', updated_at = now(), failure_code = null, failure_message = null
    from candidates
    where payment.id = candidates.id
    returning payment.id, payment.booking_id, payment.stripe_payment_intent_id
  )
  select claimed.id, claimed.booking_id, claimed.stripe_payment_intent_id
  from claimed;
$$;

revoke all on function public.claim_due_booking_payments(integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_booking_payments(integer) to service_role;

create function private.notify_phase_3_booking_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
  recipient uuid;
  notice_kind public.notification_kind;
  notice_urgency public.notification_urgency;
  notice_title text;
  notice_body text;
begin
  if old.status is not distinct from new.status or new.musician_user_id is null then
    return new;
  end if;

  if new.status::text = 'disputed' then
    actor := auth.uid();
    if actor is null then return new; end if;
    recipient := case when actor = new.user_id then new.musician_user_id else new.user_id end;
    notice_kind := 'booking_disputed';
    notice_urgency := 'high';
    notice_title := 'A booking payment was disputed';
    notice_body := new.gig_title;
  elsif new.status::text = 'released' then
    actor := new.user_id;
    recipient := new.musician_user_id;
    notice_kind := 'payment_released';
    notice_urgency := 'normal';
    notice_title := 'Payment released';
    notice_body := '$' || new.amount::text || ' for ' || new.gig_title;
  else
    return new;
  end if;

  insert into public.notifications (
    recipient_id, actor_id, kind, urgency, dedupe_key, title, body, href, payload
  ) values (
    recipient,
    actor,
    notice_kind,
    notice_urgency,
    'booking:' || new.id || ':' || new.status::text || ':' || recipient::text,
    notice_title,
    left(notice_body, 280),
    '/messages/c-' || actor::text,
    jsonb_build_object('bookingId', new.id, 'status', new.status::text)
  ) on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

revoke execute on function private.notify_phase_3_booking_change()
  from public, anon, authenticated;

create trigger notify_after_phase_3_booking_change
  after update of status on public.bookings
  for each row execute function private.notify_phase_3_booking_change();
