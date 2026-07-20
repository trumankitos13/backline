create or replace function private.notify_phase_3_booking_change()
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
  elsif new.status::text = 'refunded' then
    actor := new.musician_user_id;
    recipient := new.user_id;
    notice_kind := 'payment_refunded';
    notice_urgency := 'normal';
    notice_title := 'Payment refunded';
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
