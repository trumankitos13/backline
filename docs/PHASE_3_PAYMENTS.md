# Phase 3 payments architecture

## Chosen flow

Backline will use Stripe Connect destination charges, one PaymentIntent per
booking, and manual capture for eligible near-term gigs:

1. The musician completes Stripe-hosted Connect onboarding.
2. After the musician accepts an offer, the booker authorizes the booking total.
3. Stripe reports `payment_intent.amount_capturable_updated`; the signed webhook
   moves the payment and booking to `held`.
4. Either participant may file a dispute through 24 hours after showtime. The
   insert atomically freezes the booking and payment so release cannot race it.
5. Every ten minutes, a secret-authenticated worker atomically claims eligible,
   undisputed holds and captures them after the 24-hour window.
6. Stripe transfers the musician amount to the connected account and leaves the
   service fee with Backline. A signed success webhook moves the records to their
   terminal states.

The browser integration uses Stripe's Payment Element. It receives only the
publishable key and one PaymentIntent client secret; it cannot choose amounts,
destinations, fees, metadata identities, or booking state.

The Vite client never receives a Stripe secret, connected-account identifier,
PaymentIntent identifier, or authority to mark money held/released. It receives
only a client secret for Stripe's payment UI and safe receipt/status fields.

## Authorization-window constraint

Ordinary online card authorizations generally expire in about five to seven
days, depending on network and transaction classification. The real expiry must
come from Stripe's `capture_before` value; it must not be inferred from a fixed
seven-day timer.

Therefore:

- near-term gig: authorize only when the expected capture is safely before the
  returned expiry;
- long-dated gig: collect and save a payment method with explicit consent, then
  ask for/attempt authorization closer to the performance;
- an authorization that expires is never shown as held;
- automatic or extended authorization is an optional later optimization, not a
  launch assumption.

The initial implementation opens authorization at most **72 hours before the
gig** and rejects shows less than 15 minutes away. This conservative gate leaves
room for the 24-hour post-show capture/dispute window and can be widened only
after capture-expiry behavior is measured in test and production data.

## State ownership

`bookings.status` describes the marketplace agreement. `booking_payments.status`
describes Stripe. The browser can create offers and the invited musician can
accept/decline, but only verified server/webhook paths may advance payment-backed
states.

Stripe event IDs are stored before applying an event so retries are idempotent.
Handlers must tolerate duplicate and out-of-order delivery by retrieving the
current Stripe object when the event alone is insufficient. Full event payloads
are not retained in Postgres.

Webhook reconciliation also treats the booking row as authoritative: a delayed
authorization cannot revive a cancelled booking or unfreeze a dispute. If a
payment is captured outside the guarded worker while disputed, the money state
is recorded but the booking remains frozen for operator resolution.

The capture worker cannot select a disputed booking. Its database claim changes
the payment to `capture_pending` in the same transaction that checks booking
status and the absence of an open dispute. That closes the last-millisecond race
between filing and capture. A worker interrupted after claiming can reclaim the
reservation after 15 minutes; Stripe capture uses a stable idempotency key.

## Dispute resolution

Resolution is a trusted server operation, never a participant/browser update:

- **release:** capture an uncaptured PaymentIntent (or verify it already
  succeeded), then atomically mark payment transferred, booking released, and
  dispute `resolved_release`;
- **refund:** cancel an uncaptured PaymentIntent, or create a full refund for a
  captured destination charge with both `reverse_transfer` and
  `refund_application_fee`, then atomically mark the payment/booking refunded
  and the dispute `resolved_refund`.

Stripe calls and the database RPC are independently idempotent. A pending refund
keeps the dispute frozen; retries retrieve the recorded Stripe Refund rather
than creating another one. The resolution endpoint accepts only a Supabase
secret key and must sit behind a future staff-authenticated operator surface.

## Held-booking cancellation

The cancellation endpoint authenticates the participant, then atomically moves
the payment to `cancellation_pending` before contacting Stripe. That claim and
the dispute insert lock booking/payment rows in the same order, so only one can
win.

- Booker at least 24 hours before showtime: cancel the authorization and release
  the full hold.
- Booker inside 24 hours: final-capture 50% of the musician amount plus 50% of
  the original service fee. Stripe automatically releases the uncaptured rest.
- Musician before showtime: cancel the authorization in full and reopen a linked
  opening. The cancellation audit row is the durable input for the later
  reliability score.
- At/after showtime: cancellation closes; participants must use the dispute
  process during its release window.

The browser never supplies the role, cutoff, payout, or fee. The database derives
all four from the canonical booking and payment rows. A signed success webhook
recognizes late-cancellation metadata and reconciles the payment as partially
refunded without marking the gig completed.

## Money model

All persisted payment amounts are integer minor units:

- `musician_amount_cents`: the advertised take-home;
- `service_fee_cents`: Backline's fee paid on top by the booker;
- `total_amount_cents`: their exact sum;
- `currency`: lowercase ISO currency code (`usd` for launch).

Stripe processing fees and indirect-charge negative-balance liability belong to
the platform. Refund, dispute, late-cancellation, tax, and 1099 behavior require
legal/accounting review before live mode.

## Security boundaries

- Authenticated user functions validate the Supabase user JWT and booking role.
- Dispute inserts are limited by RLS to booking participants and the window
  ending 24 hours after the canonical `gig_at`; clients cannot resolve cases.
- The scheduled capture function accepts only a Supabase secret key in the
  `apikey` header and is deployed with gateway JWT verification disabled.
- The Stripe webhook disables gateway JWT verification only because Stripe signs
  the raw request body; invalid signatures fail before any database write.
- Stripe and Supabase secret/service keys exist only in Edge Function secrets.
- Payment tables use RLS, no client write policies, and column-limited reads.
- Webhook writes use idempotency keys and database uniqueness constraints.

## Rollout gates

1. Local migration reset and database advisors are clean.
2. RLS tests prove participants can read safe status and cannot write payments.
3. Stripe test-mode Connect onboarding succeeds for a test musician.
4. RLS tests prove a participant can freeze a hold while a stranger and duplicate
   dispute cannot.
5. Duplicate, invalid-signature, out-of-order, failed, expired, cancelled, and
   successful webhook fixtures are covered.
6. A two-account browser test completes authorize → held → disputed and a second
   undisputed booking completes held → capture → transferred.
7. Legal/accounting review approves cancellation, dispute resolution, refunds,
   tax reporting, and marketplace terms before any live-mode charge.

References:

- [Stripe: place a hold on a payment method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method)
- [Stripe: destination charges](https://docs.stripe.com/connect/destination-charges)
- [Stripe: webhook handling](https://docs.stripe.com/webhooks)
- [Supabase: securing Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Supabase: Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
