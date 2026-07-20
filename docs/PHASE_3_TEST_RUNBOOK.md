# Phase 3 test-mode rollout runbook

Use a Stripe sandbox and a disposable/staging Supabase project. Keep
`STRIPE_LIVE_MODE=false` throughout this runbook.

## 1. Apply and deploy

```bash
npx supabase db push
npx supabase functions deploy create-connect-onboarding-link
npx supabase functions deploy stripe-connect-webhook --no-verify-jwt
npx supabase functions deploy create-booking-payment-intent
npx supabase functions deploy stripe-payment-webhook --no-verify-jwt
npx supabase functions deploy capture-due-booking-payments --no-verify-jwt
npx supabase functions deploy resolve-booking-dispute --no-verify-jwt
npx supabase functions deploy cancel-held-booking
```

Required Supabase Edge Function secrets:

- `STRIPE_SECRET_KEY=sk_test_…`
- `STRIPE_LIVE_MODE=false`
- `APP_URL=https://<your exact Vercel domain>`
- `STRIPE_CONNECT_WEBHOOK_SECRET=whsec_…`
- `STRIPE_PAYMENT_WEBHOOK_SECRET=whsec_…`

Required Vercel Production and Preview variable:

- `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…`

Never place a Stripe secret, webhook secret, Supabase secret key, or service-role
key in Vercel browser variables.

## 2. Configure Stripe event destinations

Create two test-mode event destinations:

1. Connected accounts →
   `https://<project-ref>.supabase.co/functions/v1/stripe-connect-webhook`
   with only `account.updated`.
2. Platform account →
   `https://<project-ref>.supabase.co/functions/v1/stripe-payment-webhook`
   with:
   - `payment_intent.amount_capturable_updated`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `payment_intent.succeeded`

Store each destination's distinct signing secret in the matching Supabase
secret above.

## 3. Configure automatic release

Follow the Vault + Cron SQL in `DEPLOYMENT.md`. Confirm the cron invocation gets
HTTP 200 and initially reports zero claimed payments. Do not put the Supabase
secret key directly in the cron command.

## 4. Two-account acceptance pass

Use separate browser profiles for a booker and musician.

1. Musician completes Stripe-hosted payout onboarding; Settings shows payout
   readiness only after the signed `account.updated` webhook.
2. Booker sends a gig 24–72 hours away. Musician accepts.
3. Booker authorizes a Stripe test card. The browser must not mark the booking
   held until `amount_capturable_updated` arrives.
4. Confirm both participants see held status, while neither can write held,
   released, payment, connected-account, or cancellation rows directly.

## 5. Cancellation matrix

Run each with a new held booking:

| Scenario | Expected Stripe result | Expected Backline result |
|---|---|---|
| Booker cancels ≥24h before | PaymentIntent cancelled | Full hold released; booking cancelled |
| Booker cancels <24h before | Final capture of 50% musician amount + proportional fee | Payment partially refunded; booking cancelled; musician sees private payout notice |
| Musician cancels before show | PaymentIntent cancelled | Full hold released; booking cancelled; linked opening reopens |
| Either tries after showtime | No Stripe mutation | Cancellation rejected; dispute path remains available |

## 6. Dispute matrix

1. File as either participant while held and before showtime + 24 hours.
2. Confirm booking and payment both become disputed in one transaction.
3. Confirm the other participant can read the case and a stranger cannot.
4. Confirm automatic capture claims zero work for that booking.
5. From a trusted server/admin context only, invoke
   `resolve-booking-dispute` once with `release` and once on a separate booking
   with `refund`. Include a non-empty resolution note.
6. Confirm same-resolution retries are idempotent and the opposite resolution
   fails.

For a captured destination-charge refund, verify Stripe shows both the connected
transfer reversal and application-fee refund.

## 7. Exit evidence

Save screenshots or IDs for:

- connected account and `account.updated` event;
- PaymentIntent and all four lifecycle webhook deliveries;
- early, late, and musician cancellation records;
- disputed booking plus release/refund resolution;
- cron job and a successful function invocation;
- green database advisors and disposable-project RLS suite.

Do not switch to live keys after this pass. Live mode still requires the
staff-authenticated operator surface, support ownership, written cancellation
and dispute terms, accounting/tax approval, and payout monitoring.
