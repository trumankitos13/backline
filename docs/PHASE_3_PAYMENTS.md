# Phase 3 payments architecture

## Chosen flow

Backline will use Stripe Connect destination charges, one PaymentIntent per
booking, and manual capture for eligible near-term gigs:

1. The musician completes Stripe-hosted Connect onboarding.
2. After the musician accepts an offer, the booker authorizes the booking total.
3. Stripe reports `payment_intent.amount_capturable_updated`; the signed webhook
   moves the payment and booking to `held`.
4. After the gig and dispute window, a server-side action captures the intent.
5. Stripe transfers the musician amount to the connected account and leaves the
   service fee with Backline. A signed success webhook moves the records to their
   terminal states.

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

## State ownership

`bookings.status` describes the marketplace agreement. `booking_payments.status`
describes Stripe. The browser can create offers and the invited musician can
accept/decline, but only verified server/webhook paths may advance payment-backed
states.

Stripe event IDs are stored before applying an event so retries are idempotent.
Handlers must tolerate duplicate and out-of-order delivery by retrieving the
current Stripe object when the event alone is insufficient. Full event payloads
are not retained in Postgres.

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
- The Stripe webhook disables gateway JWT verification only because Stripe signs
  the raw request body; invalid signatures fail before any database write.
- Stripe and Supabase secret/service keys exist only in Edge Function secrets.
- Payment tables use RLS, no client write policies, and column-limited reads.
- Webhook writes use idempotency keys and database uniqueness constraints.

## Rollout gates

1. Local migration reset and database advisors are clean.
2. RLS tests prove participants can read safe status and cannot write payments.
3. Stripe test-mode Connect onboarding succeeds for a test musician.
4. Duplicate, invalid-signature, out-of-order, failed, expired, cancelled, and
   successful webhook fixtures are covered.
5. A two-account browser test completes authorize → held → capture → transferred.
6. Legal/accounting review approves cancellation, disputes, tax reporting, and
   marketplace terms before any live-mode charge.

References:

- [Stripe: place a hold on a payment method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method)
- [Stripe: destination charges](https://docs.stripe.com/connect/destination-charges)
- [Stripe: webhook handling](https://docs.stripe.com/webhooks)
- [Supabase: securing Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Supabase: Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
