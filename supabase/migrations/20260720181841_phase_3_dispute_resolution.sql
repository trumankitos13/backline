-- Trusted dispute resolution primitive. Stripe actions happen first in the
-- Edge Function; this RPC commits the matching booking/payment/dispute state
-- together so retries cannot leave a half-resolved case.

alter table public.booking_payments
  add column stripe_refund_id text unique,
  add constraint booking_payments_refund_format check (
    stripe_refund_id is null or stripe_refund_id ~ '^re_[A-Za-z0-9]+$'
  );

create function public.resolve_booking_dispute(
  dispute_id uuid,
  resolution text,
  resolution_note text,
  stripe_refund_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  dispute public.booking_disputes%rowtype;
  payment public.booking_payments%rowtype;
  booking public.bookings%rowtype;
  expected_status public.booking_dispute_status;
begin
  if resolution not in ('release', 'refund') then
    raise exception 'resolution must be release or refund';
  end if;
  if resolution_note is null or char_length(btrim(resolution_note)) not between 1 and 2000 then
    raise exception 'resolution note must contain 1 to 2000 characters';
  end if;
  if stripe_refund_id is not null and stripe_refund_id !~ '^re_[A-Za-z0-9]+$' then
    raise exception 'refund id invalid';
  end if;
  if resolution = 'release' and stripe_refund_id is not null then
    raise exception 'release resolution cannot include a refund id';
  end if;

  expected_status := case resolution
    when 'release' then 'resolved_release'::public.booking_dispute_status
    else 'resolved_refund'::public.booking_dispute_status
  end;

  select * into dispute
  from public.booking_disputes
  where id = dispute_id
  for update;
  if not found then raise exception 'dispute not found'; end if;
  if dispute.booking_id is null then raise exception 'disputed booking was deleted'; end if;

  select * into booking
  from public.bookings
  where id = dispute.booking_id
  for update;
  if not found then raise exception 'disputed booking not found'; end if;

  select * into payment
  from public.booking_payments
  where booking_id = dispute.booking_id
  for update;
  if not found then raise exception 'disputed payment not found'; end if;

  if dispute.status <> 'open' then
    if dispute.status <> expected_status then
      raise exception 'dispute was already resolved differently';
    end if;
    return jsonb_build_object(
      'disputeId', dispute.id,
      'bookingId', dispute.booking_id,
      'resolution', resolution,
      'alreadyResolved', true
    );
  end if;
  if booking.status::text <> 'disputed' then
    raise exception 'booking is not frozen for dispute review';
  end if;

  if resolution = 'release' then
    update public.booking_payments
    set status = 'transferred', failure_code = null, failure_message = null, updated_at = now()
    where id = payment.id;
    update public.bookings set status = 'released' where id = booking.id;
  else
    update public.booking_payments
    set status = 'refunded',
        stripe_refund_id = coalesce(resolve_booking_dispute.stripe_refund_id, payment.stripe_refund_id),
        failure_code = null,
        failure_message = null,
        updated_at = now()
    where id = payment.id;
    update public.bookings set status = 'refunded' where id = booking.id;
  end if;

  update public.booking_disputes
  set status = expected_status,
      resolution_note = btrim(resolve_booking_dispute.resolution_note),
      resolved_at = now()
  where id = dispute.id;

  return jsonb_build_object(
    'disputeId', dispute.id,
    'bookingId', dispute.booking_id,
    'resolution', resolution,
    'alreadyResolved', false
  );
end;
$$;

revoke all on function public.resolve_booking_dispute(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_booking_dispute(uuid, text, text, text)
  to service_role;

-- The resolution Edge Function records a pending refund id before Stripe has
-- finished processing it, but no browser role may read or write that id.
grant select, update on public.booking_disputes to service_role;
grant select, update on public.booking_payments to service_role;
grant select, update on public.bookings to service_role;
