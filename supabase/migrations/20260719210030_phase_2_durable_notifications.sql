-- Durable in-app notifications are the source of truth. Push is a best-effort
-- projection delivered from these rows; trigger writers never call a network
-- provider and never put private booking amounts into notification payloads.

create type public.notification_kind as enum (
  'direct_message',
  'booking_offer',
  'booking_accepted',
  'booking_declined',
  'booking_cancelled'
);

create type public.notification_urgency as enum ('low', 'normal', 'high');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind public.notification_kind not null,
  urgency public.notification_urgency not null default 'normal',
  dedupe_key text not null unique,
  title text not null,
  body text not null default '',
  href text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  push_started_at timestamptz,
  pushed_at timestamptz,
  push_error text,
  created_at timestamptz not null default now(),
  constraint notifications_title_length check (char_length(title) between 1 and 160),
  constraint notifications_body_length check (char_length(body) <= 280),
  constraint notifications_href_internal check (href like '/%'),
  constraint notifications_payload_object check (jsonb_typeof(payload) = 'object')
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_length check (char_length(endpoint) <= 2048),
  constraint push_subscriptions_key_lengths check (
    char_length(p256dh) between 20 and 512 and char_length(auth) between 8 and 256
  )
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default false,
  high_push boolean not null default true,
  normal_push boolean not null default false,
  hard_mute boolean not null default false,
  quiet_start time not null default '22:00',
  quiet_end time not null default '08:00',
  timezone text not null default 'America/Chicago',
  updated_at timestamptz not null default now(),
  constraint notification_preferences_timezone_length check (
    char_length(timezone) between 1 and 64
  )
);

alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;

create policy "users can read their notifications"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy "users can mark their notifications read"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create policy "users manage their push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users read their notification preferences"
  on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "users create their notification preferences"
  on public.notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "users update their notification preferences"
  on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, update (read_at) on public.notifications to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.notify_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation public.direct_conversations%rowtype;
  recipient uuid;
  actor_name text;
begin
  -- Booking cards have their own higher-priority notification from the booking
  -- trigger. A preceding human note remains a normal message notification.
  if new.booking_id is not null then
    return new;
  end if;

  select * into conversation
  from public.direct_conversations
  where id = new.conversation_id;

  recipient := case
    when conversation.participant_a = new.sender_id then conversation.participant_b
    else conversation.participant_a
  end;

  select coalesce(nullif(name, ''), nullif(handle, ''), 'Someone')
  into actor_name
  from public.profiles
  where id = new.sender_id;

  insert into public.notifications (
    recipient_id, actor_id, kind, urgency, dedupe_key, title, body, href, payload
  ) values (
    recipient,
    new.sender_id,
    'direct_message',
    'normal',
    'dm:' || new.id || ':' || recipient::text,
    actor_name || ' sent you a message',
    left(coalesce(new.body, ''), 280),
    '/messages/' || new.conversation_id::text,
    jsonb_build_object('conversationId', new.conversation_id, 'messageId', new.id)
  ) on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

create function private.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  actor uuid;
  actor_name text;
  notification_type public.notification_kind;
  notification_urgency public.notification_urgency;
  notification_title text;
  target_href text;
  state text := new.status::text;
begin
  if tg_op = 'INSERT' then
    if new.musician_user_id is null then
      return new;
    end if;
    recipient := new.musician_user_id;
    actor := new.user_id;
    notification_type := 'booking_offer';
    notification_urgency := 'high';
  elsif old.status is not distinct from new.status then
    return new;
  elsif state = 'accepted' then
    recipient := new.user_id;
    actor := new.musician_user_id;
    notification_type := 'booking_accepted';
    notification_urgency := 'high';
  elsif state = 'declined' then
    recipient := new.user_id;
    actor := new.musician_user_id;
    notification_type := 'booking_declined';
    notification_urgency := 'normal';
  elsif state = 'cancelled' then
    actor := auth.uid();
    recipient := case when actor = new.user_id then new.musician_user_id else new.user_id end;
    notification_type := 'booking_cancelled';
    notification_urgency := 'high';
  else
    return new;
  end if;

  if recipient is null or actor is null then
    return new;
  end if;

  select coalesce(nullif(name, ''), nullif(handle, ''), 'Someone')
  into actor_name
  from public.profiles
  where id = actor;

  notification_title := case notification_type
    when 'booking_offer' then actor_name || ' sent you a booking offer'
    when 'booking_accepted' then actor_name || ' accepted your offer'
    when 'booking_declined' then actor_name || ' declined your offer'
    when 'booking_cancelled' then actor_name || ' cancelled the booking'
    else 'Booking update'
  end;
  target_href := '/messages/c-' || actor::text;

  insert into public.notifications (
    recipient_id, actor_id, kind, urgency, dedupe_key, title, body, href, payload
  ) values (
    recipient,
    actor,
    notification_type,
    notification_urgency,
    'booking:' || new.id || ':' || state || ':' || recipient::text,
    notification_title,
    left(new.gig_title, 280),
    target_href,
    jsonb_build_object('bookingId', new.id, 'status', state)
  ) on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

revoke execute on function private.notify_direct_message() from public, anon, authenticated;
revoke execute on function private.notify_booking_change() from public, anon, authenticated;

create trigger notify_after_direct_message
  after insert on public.direct_messages
  for each row execute function private.notify_direct_message();

create trigger notify_after_booking_insert
  after insert on public.bookings
  for each row execute function private.notify_booking_change();

create trigger notify_after_booking_update
  after update of status on public.bookings
  for each row execute function private.notify_booking_change();

alter publication supabase_realtime add table public.notifications;
