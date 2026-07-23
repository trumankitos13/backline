create type public.booking_cancellation_role as enum ('booker', 'musician');
create type public.booking_cancellation_action as enum ('void', 'late_fee');
create type public.booking_cancellation_status as enum ('processing', 'completed');

create table public.booking_cancellations (
  id uuid primary key default gen_random_uuid(),
  booking_id text unique references public.bookings(id) on delete set null,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancelled_role public.booking_cancellation_role not null,
  action public.booking_cancellation_action not null,
  musician_payout_cents integer not null default 0,
  service_fee_cents integer not null default 0,
  status public.booking_cancellation_status not null default 'processing',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint booking_cancellations_nonnegative_amounts check (
    musician_payout_cents >= 0 and service_fee_cents >= 0
  ),
  constraint booking_cancellations_action_amounts check (
    (action = 'void' and musician_payout_cents = 0 and service_fee_cents = 0)
    or (action = 'late_fee' and musician_payout_cents > 0 and service_fee_cents >= 0)
  ),
  constraint booking_cancellations_completion_shape check (
    (status = 'processing' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create index booking_cancellations_actor_idx
  on public.booking_cancellations (cancelled_by, created_at desc);

alter table public.booking_cancellations enable row level security;

create policy "booking participants can read cancellations"
  on public.booking_cancellations for select to authenticated
  using (
    exists (
      select 1 from public.bookings booking
      where booking.id = booking_id
        and (select auth.uid()) in (booking.user_id, booking.musician_user_id)
    )
  );

grant select on public.booking_cancellations to authenticated;

create function public.claim_held_booking_cancellation(
  booking_id text,
  cancelled_by uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  booking public.bookings%rowtype;
  payment public.booking_payments%rowtype;
  cancellation public.booking_cancellations%rowtype;
  actor_role public.booking_cancellation_role;
  cancel_action public.booking_cancellation_action;
  payout_cents integer := 0;
  fee_cents integer := 0;
begin
  select * into booking
  from public.bookings
  where id = claim_held_booking_cancellation.booking_id
  for update;
  if not found then raise exception 'booking not found'; end if;

  select * into cancellation
  from public.booking_cancellations
  where booking_cancellations.booking_id = booking.id;
  if found then
    if cancellation.cancelled_by is distinct from claim_held_booking_cancellation.cancelled_by then
      raise exception 'booking cancellation already claimed';
    end if;
    select * into payment
    from public.booking_payments
    where booking_payments.booking_id = booking.id
    for update;
    if not found or payment.stripe_payment_intent_id is null then
      raise exception 'booking payment not found';
    end if;
    return jsonb_build_object(
      'cancellationId', cancellation.id,
      'bookingId', cancellation.booking_id,
      'paymentIntentId', payment.stripe_payment_intent_id,
      'action', cancellation.action,
      'musicianPayoutCents', cancellation.musician_payout_cents,
      'serviceFeeCents', cancellation.service_fee_cents,
      'status', cancellation.status
    );
  end if;

  if booking.status::text <> 'held' then
    raise exception 'only a held booking can use payment-aware cancellation';
  end if;
  if booking.gig_at is null or now() >= booking.gig_at then
    raise exception 'after showtime, file a dispute instead';
  end if;
  if claim_held_booking_cancellation.cancelled_by = booking.user_id then
    actor_role := 'booker';
  elsif claim_held_booking_cancellation.cancelled_by = booking.musician_user_id then
    actor_role := 'musician';
  else
    raise exception 'only a booking participant can cancel';
  end if;
  if exists (
    select 1 from public.booking_disputes dispute
    where dispute.booking_id = booking.id and dispute.status = 'open'
  ) then
    raise exception 'a disputed booking cannot be cancelled';
  end if;

  select * into payment
  from public.booking_payments
  where booking_payments.booking_id = booking.id
  for update;
  if not found or payment.status <> 'held' or payment.stripe_payment_intent_id is null then
    raise exception 'held Stripe payment not found';
  end if;

  if actor_role = 'booker' and booking.gig_at - now() < interval '24 hours' then
    cancel_action := 'late_fee';
    payout_cents := floor(payment.musician_amount_cents * 0.5)::integer;
    fee_cents := round(payment.service_fee_cents * 0.5)::integer;
  else
    cancel_action := 'void';
  end if;

  insert into public.booking_cancellations (
    booking_id, cancelled_by, cancelled_role, action,
    musician_payout_cents, service_fee_cents
  ) values (
    booking.id,
    claim_held_booking_cancellation.cancelled_by,
    actor_role,
    cancel_action,
    payout_cents,
    fee_cents
  ) returning * into cancellation;

  update public.booking_payments
  set status = 'cancellation_pending', updated_at = now(),
      failure_code = null, failure_message = null
  where id = payment.id and status = 'held';
  if not found then raise exception 'payment cancellation claim lost'; end if;

  return jsonb_build_object(
    'cancellationId', cancellation.id,
    'bookingId', booking.id,
    'paymentIntentId', payment.stripe_payment_intent_id,
    'action', cancel_action,
    'musicianPayoutCents', payout_cents,
    'serviceFeeCents', fee_cents,
    'status', cancellation.status
  );
end;
$$;

create function public.finalize_held_booking_cancellation(cancellation_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cancellation public.booking_cancellations%rowtype;
  payment public.booking_payments%rowtype;
  booking public.bookings%rowtype;
  recipient uuid;
  notice_body text;
begin
  select * into cancellation
  from public.booking_cancellations
  where id = cancellation_id
  for update;
  if not found then raise exception 'booking cancellation not found'; end if;
  if cancellation.booking_id is null then raise exception 'cancelled booking was deleted'; end if;
  if cancellation.status = 'completed' then
    return jsonb_build_object(
      'cancellationId', cancellation.id,
      'bookingId', cancellation.booking_id,
      'action', cancellation.action,
      'alreadyCompleted', true
    );
  end if;

  select * into booking
  from public.bookings
  where id = cancellation.booking_id
  for update;
  if not found then raise exception 'booking not found'; end if;

  select * into payment
  from public.booking_payments
  where booking_id = cancellation.booking_id
  for update;
  if not found then raise exception 'booking payment not found'; end if;
  if booking.status::text = 'held' and payment.status = 'cancellation_pending' then
    update public.booking_payments
    set status = case cancellation.action
          when 'void' then 'cancelled'::public.payment_status
          else 'partially_refunded'::public.payment_status
        end,
        failure_code = null,
        failure_message = null,
        updated_at = now()
    where id = payment.id;
    update public.bookings set status = 'cancelled' where id = booking.id;
  elsif booking.status::text = 'cancelled'
    and payment.status = (case cancellation.action
      when 'void' then 'cancelled'::public.payment_status
      else 'partially_refunded'::public.payment_status
    end) then
    -- The signed Stripe webhook reconciled first; finish the audit record and
    -- participant notification without replaying the state transition.
    null;
  else
    raise exception 'booking cancellation state changed during processing';
  end if;

  if cancellation.cancelled_role = 'musician' and booking.opening_id is not null then
    update public.openings
    set status = 'open'
    where id = booking.opening_id and status = 'filled';
  end if;

  recipient := case cancellation.cancelled_role
    when 'booker' then booking.musician_user_id
    else booking.user_id
  end;
  notice_body := case cancellation.action
    when 'late_fee' then
      '$' || trim(to_char(cancellation.musician_payout_cents / 100.0, 'FM999999990.00'))
      || ' late-cancellation payout for ' || booking.gig_title
    else booking.gig_title
  end;

  if recipient is not null and cancellation.cancelled_by is not null then
    insert into public.notifications (
      recipient_id, actor_id, kind, urgency, dedupe_key, title, body, href, payload
    ) values (
      recipient,
      cancellation.cancelled_by,
      'booking_cancelled',
      'high',
      'booking:' || booking.id || ':cancelled:' || recipient::text,
      case cancellation.action
        when 'late_fee' then 'Booking cancelled — late fee secured'
        else 'Booking cancelled'
      end,
      left(notice_body, 280),
      '/messages/c-' || cancellation.cancelled_by::text,
      jsonb_build_object(
        'bookingId', booking.id,
        'status', 'cancelled',
        'cancellationAction', cancellation.action
      )
    ) on conflict (dedupe_key) do nothing;
  end if;

  update public.booking_cancellations
  set status = 'completed', completed_at = now()
  where id = cancellation.id;

  return jsonb_build_object(
    'cancellationId', cancellation.id,
    'bookingId', cancellation.booking_id,
    'action', cancellation.action,
    'alreadyCompleted', false
  );
end;
$$;

revoke all on function public.claim_held_booking_cancellation(text, uuid)
  from public, anon, authenticated;
revoke all on function public.finalize_held_booking_cancellation(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_held_booking_cancellation(text, uuid) to service_role;
grant execute on function public.finalize_held_booking_cancellation(uuid) to service_role;
grant select, insert, update on public.booking_cancellations to service_role;
