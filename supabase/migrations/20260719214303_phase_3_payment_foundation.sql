-- Phase 3 payment foundation.
--
-- Booking state describes the marketplace agreement. Payment state describes
-- Stripe's asynchronous lifecycle. Keeping them separate prevents a browser
-- update (or an out-of-order webhook) from claiming that money moved.
--
-- Stripe identifiers are server-managed. Authenticated users receive only the
-- safe, column-limited status fields needed for onboarding and receipts.

alter table public.bookings
  add column gig_at timestamptz,
  add constraint bookings_gig_at_range check (
    gig_at is null
    or (gig_at >= created_at - interval '5 minutes' and gig_at <= created_at + interval '2 years')
  );

create function public.enforce_booking_schedule_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.gig_at is distinct from old.gig_at then
    raise exception 'booking schedule cannot change after the offer is sent';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_booking_schedule_immutable()
  from public, anon, authenticated;

create trigger enforce_booking_schedule_immutable_before_update
  before update on public.bookings
  for each row execute function public.enforce_booking_schedule_immutable();

-- Replace the Phase 2 demo transition guard: payment-backed states are now
-- reachable only from a trusted server path (service-role calls have no
-- auth.uid()). Offer response/cancellation remains participant-controlled.
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
  else
    raise exception 'invalid booking transition: % to %', old_status, new_status;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create type public.payment_status as enum (
  'pending',
  'requires_payment_method',
  'requires_action',
  'held',
  'captured',
  'transferred',
  'cancelled',
  'failed',
  'disputed',
  'refunded',
  'partially_refunded'
);

create table public.connected_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text not null unique,
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connected_accounts_stripe_id_format check (
    stripe_account_id ~ '^acct_[A-Za-z0-9]+$'
  )
);

create table public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id text unique references public.bookings(id) on delete set null,
  payer_id uuid references public.profiles(id) on delete set null,
  payee_id uuid references public.profiles(id) on delete set null,
  stripe_payment_intent_id text unique,
  stripe_latest_charge_id text unique,
  stripe_transfer_id text unique,
  currency text not null default 'usd',
  musician_amount_cents integer not null,
  service_fee_cents integer not null,
  total_amount_cents integer not null,
  status public.payment_status not null default 'pending',
  authorization_expires_at timestamptz,
  failure_code text,
  failure_message text,
  attempt_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_payments_distinct_participants check (
    payer_id is null or payee_id is null or payer_id <> payee_id
  ),
  constraint booking_payments_currency_format check (currency ~ '^[a-z]{3}$'),
  constraint booking_payments_positive_musician_amount check (musician_amount_cents > 0),
  constraint booking_payments_nonnegative_service_fee check (service_fee_cents >= 0),
  constraint booking_payments_total_matches check (
    total_amount_cents = musician_amount_cents + service_fee_cents
  ),
  constraint booking_payments_intent_format check (
    stripe_payment_intent_id is null or stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$'
  ),
  constraint booking_payments_charge_format check (
    stripe_latest_charge_id is null or stripe_latest_charge_id ~ '^ch_[A-Za-z0-9]+$'
  ),
  constraint booking_payments_transfer_format check (
    stripe_transfer_id is null or stripe_transfer_id ~ '^tr_[A-Za-z0-9]+$'
  ),
  constraint booking_payments_authorization_expiry check (
    status <> 'held' or authorization_expires_at is not null
  ),
  constraint booking_payments_positive_attempt check (attempt_number > 0)
);

create index booking_payments_payer_created_idx
  on public.booking_payments (payer_id, created_at desc);
create index booking_payments_payee_created_idx
  on public.booking_payments (payee_id, created_at desc);

-- Store only the minimum event envelope needed for idempotency and support.
-- Full Stripe payloads can contain customer/payment details and do not belong
-- in this generally exposed schema.
create table public.stripe_events (
  stripe_event_id text primary key,
  event_type text not null,
  object_id text,
  livemode boolean not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_attempts integer not null default 1,
  processing_error text,
  constraint stripe_events_id_format check (stripe_event_id ~ '^evt_[A-Za-z0-9]+$'),
  constraint stripe_events_type_length check (char_length(event_type) between 1 and 160),
  constraint stripe_events_error_length check (
    processing_error is null or char_length(processing_error) <= 500
  ),
  constraint stripe_events_positive_attempts check (processing_attempts > 0)
);

alter table public.connected_accounts enable row level security;
alter table public.booking_payments enable row level security;
alter table public.stripe_events enable row level security;

create policy "users can read their payout readiness"
  on public.connected_accounts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "booking participants can read payment status"
  on public.booking_payments for select to authenticated
  using ((select auth.uid()) in (payer_id, payee_id));

-- Deliberately no client write policies. Payment rows, Connect status, and
-- processed webhook ids are written only by server-side functions.
grant select (
  user_id,
  details_submitted,
  charges_enabled,
  payouts_enabled,
  created_at,
  updated_at
) on public.connected_accounts to authenticated;

grant select (
  id,
  booking_id,
  payer_id,
  payee_id,
  currency,
  musician_amount_cents,
  service_fee_cents,
  total_amount_cents,
  status,
  authorization_expires_at,
  created_at,
  updated_at
) on public.booking_payments to authenticated;

revoke all on public.stripe_events from anon, authenticated;
