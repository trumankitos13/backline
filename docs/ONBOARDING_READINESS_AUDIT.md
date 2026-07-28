# Onboarding-readiness audit — August 5 musician beta

**Audited:** 2026-07-28, against `33f25e6` (post-Phase-4).
**Question asked:** can we put real gig musicians on this app on August 5?

**Answer:** the *code* is in good shape — genuinely better than the roadmap's own
inventory suggests. What stands between you and August 5 is almost entirely
**operational**: an unverified Supabase deployment, transactional email, and the
absence of any legal surface. Two code defects would have broken signup at the
mixer itself; both are fixed in this change.

Verified locally: `npm run typecheck`, `npm test` (27 passing), `npm run build`
all pass.

---

## P0 — blocks onboarding

### 1. Onboarding silently dropped profiles that Postgres rejected — FIXED

`api.setUser` was fire-and-forget: `dispatch()` then a `persist()` whose only
failure handler was `console.error`. `SignupSteps` never awaited it and
navigated into the app unconditionally.

The consequence at a mixer: a musician picks a handle someone else already took
(`dave`, `drums`, `sub`), the unique index on `profiles.handle` rejects the
write, and they land in the app looking fully signed up — while their account
has **no profile row**. They are invisible in Discover, unreachable by DM, and
nothing they do that day persists. The same failure mode covers a dropped
connection on venue wifi, which is the normal case in a loud room.

Compounding it, `SignupSteps` accepted handles of **2** characters while the
`profiles_handle_format` constraint requires **3**. Any musician named Al, Jo,
or CJ was guaranteed to hit this on their first try.

**Fixed:** `setUser` now returns a promise, persists before adopting the profile,
and rejects on failure. `SignupSteps` awaits it, shows a saving state, surfaces
"@handle is already taken" (returning to step 1) or the underlying error, and
only navigates on success. Client handle validation now mirrors the DB
constraint exactly. Regression tests in `src/components/welcome/SignupSteps.test.tsx`.

### 2. Auth email will throttle at roughly two signups per hour — NOT FIXED (ops)

`supabase/config.toml` sets `[auth.rate_limit] email_sent = 2` per hour, and the
hosted project's built-in email service carries a comparably low cap that
Supabase documents as **not for production use**. If "Confirm email" is enabled
on the cloud project — it is **on by default** — then a room of twenty musicians
signing up in the same twenty minutes means roughly two of them receive their
confirmation link and the rest silently never do.

There is no code fix for this. Before August 5 you need **either**:

- custom SMTP wired to Resend or Postmark (the roadmap's own build-vs-buy call),
  with the sender domain verified — allow a day for DNS/DKIM propagation; **or**
- email confirmation turned off for the beta, which makes signup instant but
  leaves unverified addresses on accounts.

Custom SMTP is the right answer and you need it for password reset regardless.

Also worth raising before the event: `sign_in_sign_ups` is 30 per 5 minutes
**per IP**. Everyone on the venue's wifi shares one public IP. Twenty people
signing up cleanly fits; twenty people retrying because their confirmation email
never arrived does not.

### 3. No Terms of Service and no Privacy Policy — NOT FIXED (needs your input)

There is no `/terms` route, no `/privacy` route, and no reference to either
anywhere in `src/`, `index.html`, or `public/`. On August 5 you would be
collecting real names, email addresses, neighborhoods, and opt-in geolocation
with no published terms and no privacy notice.

This also blocks payments independently: Stripe Connect requires your platform
to present its own terms to connected accounts before onboarding them, and the
worker-classification question the roadmap flags (subs as 1099 contractors) is
exactly what those terms have to address.

This needs a decision from you, not code. The cheapest path that unblocks the
mixer is a beta-scoped ToS and privacy notice plus a checkbox on the signup
step. If payouts stay off for the beta, the Stripe terms requirement can wait.

### 4. Cloud deployment is unverified

Every Phase 0–4 exit criterion in `docs/ROADMAP.md` that says "deploy and verify"
is still open. Nothing in the repo can confirm the Supabase project exists, that
the 22 migrations have been applied to it, that the Edge Functions are deployed,
that VAPID keys and the database webhook are configured, or that Vercel has the
`VITE_SUPABASE_*` env vars set.

**If those env vars are absent, the deployed site runs in demo mode** — every
musician who signs up at the mixer writes to their own browser's localStorage
and nobody can see anybody. This is the single highest-consequence unknown, and
it is invisible from the app: the only tell is the "Cloud synced" vs
"Demo · mock data" label in the shell header (`src/components/shell.tsx:113`).

Check that label on the production URL before you leave for the mixer.

---

## P1 — will visibly hurt the beta

### 5. Real musicians share Discover with 19 fictional ones

`supabase/seed.sql` inserts 19 invented players across Austin and Nashville, and
`loadCatalog` merges them with real accounts into one list. A real musician
cannot tell which is which.

Messaging one is a dead end that looks like rudeness: canned replies are gated
behind `!isCloudBackend` (`src/lib/store.tsx:520`), so in cloud mode a DM to a
seeded player persists to Postgres and is answered by nobody, ever. A booking
offer to one is worse — `addBooking` sets `musician_user_id` to null when the
recipient isn't a real account, so no account exists that could accept it.

Options, roughly in order of cost:

- Don't seed the production project at all. Discover is empty until the mixer
  fills it, which is honest but a bad first impression for musician #1.
- Seed it, but badge seeded players as demo and disable message/book on them.
- Seed only bands, venues, and events (the scene context that makes the app feel
  alive) and skip the 19 players.

I'd take the third. It keeps the feed and venue pages populated while ensuring
every bookable human on the app is real. This is a product call, so I've left it
to you.

### 6. Every new profile rendered as a wall of zeros — FIXED

A fresh signup has no rate, no gig history, and no measured reply time, so their
own card read `0 MI · $0–$0 /GIG · ~0 MIN REPLY · 0 EVENTS` — directly beside
seeded players showing `12 MI · $150–$300 · ~8 MIN REPLY · 140 EVENTS`. The
first thing a musician does after signing up is look at their own page, and it
looked broken.

**Fixed:** zeroed stats are now suppressed or shown as "Rate on request" /
"New to Backline" / em-dashes in `MusicianCard` and `MusicianProfile`.

### 7. CI never ran the tests, and the tests leaked state — FIXED

`.github/workflows/ci.yml` ran typecheck and build but not `npm test`. On a
clean checkout of `33f25e6` the suite was **already failing**:
`supabase.test.ts` broke when Phase 4 added `.gt()` to the availability query
and the hand-rolled PostgREST mock had no such method. It had been red on `main`
with nothing to report it.

Separately, `vitest.config.ts` sets `globals: false`, which stops Testing
Library from installing its own auto-cleanup — `src/test/setup.ts` never
registered one, so every component render stayed mounted and leaked into later
tests in the same file. Each existing test file had only one test, so it never
surfaced.

**Fixed:** `npm test` added to CI, the mock extended to the full builder surface
with a comment explaining why, and `afterEach(cleanup)` registered in the setup
file.

### 8. Mid-onboarding drop-off landed on the marketing page — FIXED

A musician who created an account, got pulled into a conversation, and came back
later was routed by `App`'s profile gate to `/welcome`, where `signupOpen`
initialised from `needsAuth` alone — false, because they *were* signed in. They
got the hero and a "Get started" button rather than the stepper they abandoned.
Small, but it happens to a real fraction of a room. **Fixed** in `Welcome.tsx`.

---

## P2 — fine for the beta, worth knowing

- **754 kB JS (212 kB gzipped) in one chunk**, no code splitting. On venue LTE
  that's a slow first paint at exactly the moment you're handing someone a
  phone. Lazy-loading the routes is a contained change if you want it.
- **Ratings are session-only** (`state.ratingsGiven`) — they vanish on reload.
  Don't demo the rating flow as if it persists.
- **`config.toml` still points `site_url` at `http://127.0.0.1:3000`.** Cloud
  auth redirects come from the dashboard, not this file, but the production URL
  must be in the allow-list there or password-reset links will bounce.
- **No invite, waitlist, or referral mechanism**, and no operator/admin surface.
  For a hand-seeded beta that's acceptable — you are the admin, via the Supabase
  dashboard — but you have no in-app way to remove a bad actor or a test account.
- **Payments are correctly gated.** Every Edge Function checks `livemode`
  against `STRIPE_LIVE_MODE` and refuses on mismatch. Nothing here will
  accidentally move real money, which also means **nobody gets paid during the
  beta** unless you complete the Phase 3 exit work. Say that out loud at the
  mixer rather than letting the landing page's "get paid through the app"
  promise land unqualified.
- **RLS looks genuinely solid** — owner-scoped policies throughout, the auth
  trigger locked down, exact coordinates owner-only, fee privacy on openings,
  and a real isolation suite in `supabase/tests/`. Run it against a disposable
  project once the real one is up; it is the best evidence you have that the
  backend is safe to put strangers on.

---

## Before you leave for the mixer

Ordered by lead time — the first two have external dependencies and can't be
done the night before.

1. Wire custom SMTP (Resend/Postmark), verify the sender domain, send yourself a
   confirmation and a password reset. **Start this first; DNS takes hours.**
2. Publish a beta ToS and privacy notice; link them from the signup step.
3. Stand up / confirm the Supabase project: apply all 22 migrations, deploy the
   Edge Functions, configure VAPID and the database webhook, run
   `supabase/tests/rls.test.mjs` green against a disposable project.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel and redeploy.
   **Confirm the header reads "Cloud synced" on the production URL.**
5. Decide the seed question (§5) and seed the production project accordingly.
6. Run the full path end-to-end on two phones on cellular, not your laptop:
   sign up → onboard → edit profile → add a reel → find each other in Discover →
   DM → send an offer → accept. That is the demo you're giving.
7. Have the URL as a QR code, and expect the venue wifi to be bad.

---

*Written 2026-07-28. Items marked FIXED are in this branch; everything else is
open.*
