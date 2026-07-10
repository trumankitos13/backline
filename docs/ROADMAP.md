# Backline — roadmap to a fully functional app

Where we are and how we get to a real product: a musician in one city can sign
up, build a profile with a real video reel, get discovered, receive a booking
offer, **get paid to their bank after the gig**, and rate — all real, on web and
mobile.

## Where we are today (honest inventory)

**Done (prototype quality):**
- Full React + TS + Tailwind app, Backline identity, all surfaces (Discover/SOS,
  profiles, bands/venues, feed, messaging, booking, payment, onboarding).
- A **pluggable backend seam** — `src/lib/backend/` (`local.ts` localStorage vs
  `supabase.ts`), selected by env. The store (`src/lib/store.tsx`) updates
  optimistically and writes through this seam. **This is the contract everything
  real plugs into.**
- Supabase backend, **substantially built** (not just scaffolding): schema +
  RLS (owner-scoped, tested), a `handle_new_user` trigger that auto-creates a
  profile, catalog seed, and a working `supabase.ts` that persists auth,
  onboarding, and all user data through the seam.
- **Phase 0 in progress:** CI (typecheck + build), Sentry/PostHog observability
  (dormant until keyed), an RLS cross-user isolation test suite, and password
  reset — all landed. Remaining: point the app's catalog reads at Postgres.

**Mocked / not yet real (the gap):**
- Catalog (musicians, bands, venues, gigs, feed) is static data in `data.ts`.
- Messaging replies are simulated `setTimeout`s; booking acceptance is faked.
- Payments are a **UI mock** (`PaymentSheet` "Hold $X" — no real money).
- Reels are **generative gradient placeholders** (`video.tsx`) — no real video.
- Ratings are **session-only** (`state.ratingsGiven`, not persisted).
- SOS matching is client-side over the mock array; "near me" isn't geographic.
- No notifications, no native app, no CI/CD or observability.

## Guiding principles

1. **One city first (Austin).** Marketplaces die of empty supply, not missing
   features. Optimize for liquidity in one scene before breadth.
2. **Ship the critical path before breadth:** *find a sub → book → get paid.*
   SOS broadcast, feed, and native can follow.
3. **Keep demo mode working** the whole way — it's our dev velocity and our
   public "try it" surface. Every real feature lands behind the backend seam so
   `local.ts` keeps the app runnable with zero setup.
4. **Buy the hard, regulated, undifferentiated parts** (payments, video,
   notifications, auth infra). Build the marketplace logic and the experience.

## Build-vs-buy (decide early, avoid reinventing)

| Need | Recommendation |
| --- | --- |
| Auth + DB + storage + realtime | **Supabase** (already scaffolded) |
| Payments / payouts / KYC | **Stripe Connect (Express)** — non-negotiable buy |
| Video upload + transcode + delivery | **Mux** or **Cloudflare Stream** (do NOT build transcoding) |
| Transactional email | **Resend** or **Postmark** |
| SMS (SOS urgency) | **Twilio** |
| Push notifications | Web Push + **Expo Push** (native) |
| Error tracking / analytics | **Sentry** + **PostHog** |
| Hosting | **Vercel** (already `vercel.json`) + Supabase cloud |

---

## The critical path (MVP → first real paid booking)

This is the spine. Phases 0 → 3 get one real musician paid for one real gig.
Everything after is scale and network effects.

### Phase 0 — Make the backend real (foundation hardening)
**Goal:** cloud mode fully replaces demo for accounts, profiles, and catalog.
- Stand up a real Supabase project; run migrations; verify **RLS** actually
  isolates per-user data (write tests that try to read/write across users).
- Real **auth**: email+password and magic link; create a `profile` row on
  signup; **onboarding writes to Postgres** (not just `state.user`); password
  reset; session refresh.
- Migrate the mock catalog (musicians/bands/venues/gigs/feed) **into Postgres**;
  `supabase.ts` reads it; `data.ts` becomes seed-only.
- **CI/CD**: typecheck + build + preview deploys on PR; secrets management;
  Sentry + PostHog wired.
- **Exit:** sign up → onboard → see DB-backed catalog, all persisted server-side;
  pipeline green.

### Phase 1 — Real profiles + reels
**Goal:** a musician creates a profile and uploads a reel that actually plays.
- Profile **editing** for your own musician page (instruments, rate, gear,
  availability, neighborhood, bio) — writing through the backend.
- **Media pipeline** (the biggest lift): record/upload a short vertical video →
  Mux/Cloudflare Stream → thumbnail + HLS playback. Swap `VideoTile`/`ReelViewer`
  from gradient placeholders to real `<video>`/HLS. Keep the generative gel as
  the loading/empty state. Add avatar upload (fingerprint stays as fallback).
- **Exit:** upload a reel on one device, watch it back on another.

### Phase 2 — Messaging + booking (realtime, real state machine)
**Goal:** two real users message and move a booking through its lifecycle.
- Replace simulated replies with **Supabase Realtime** subscriptions; messages
  persist and sync live. (Touchpoint: the `setTimeout` blocks in `store.tsx`.)
- **Booking state machine on the server:** `offer → accepted | declined → paid →
  completed | cancelled`, with server-enforced transitions, timestamps, and
  guards (only the invited musician can accept, etc.).
- **Notifications:** email (Resend) + web push for new message / offer /
  acceptance / payment / gig reminder.
- **Exit:** a booking goes offer → accept → (ready to pay) with live chat and
  notifications, no fakery.

### Phase 3 — Payments (real money) ⚠️ hardest, regulated
**Goal:** money moves booker → escrow → musician's bank, minus platform fee.
- **Stripe Connect (Express):** musicians onboard as connected accounts (Stripe
  handles KYC/identity/tax/1099). Replace `PaymentSheet` with Stripe
  Elements/Checkout.
- **Escrow-style hold:** PaymentIntent with **manual capture** at booking; capture
  on **gig completion**; transfer/payout to the musician; **application fee** =
  platform take. Refunds + the "cancel-friendly up to 24h" policy as real logic.
- **Webhooks** to keep booking/payment state in sync; handle failures, disputes,
  payout schedules.
- **Exit:** a completed real booking results in a real bank payout.

> **After Phase 3 we have a real, working two-sided transaction.** Everything
> below makes it a *network* and a *business*.

---

## Beyond MVP — the network and the platform

### Phase 4 — Discovery, SOS, geo, feed (make the network live)
- **PostGIS** for true distance / "near me"; an **availability** model (the
  "free tonight" flag becomes a real, time-boxed status; optional calendar).
- **SOS as a real broadcast:** ping matching, available, nearby players (push +
  SMS), **first-accept-wins**, with the offer flow attached. (Today it's a
  client-side ranked list; make it actually reach people.)
- **Feed** for real: bands/venues create posts, a following graph, ranking, and
  "need-sub" posts wired into the SOS/booking flow.
- Server-side **search + filters**.

### Phase 5 — Trust, safety, quality
- **Verification** (Stripe-identity-backed badge), **reviews only after
  completed bookings**, reporting/blocking, moderation queue for reels/posts,
  dispute resolution, no-show/cancellation penalties.
- Rate limiting, abuse prevention, content moderation.

### Phase 6 — Native apps
- **React Native / Expo** sharing `src/lib` types and a common API client over
  the same Supabase backend. Native push (Expo). Ship to App Store + Play with
  parity on the core flow. (The mobile-first web layout was built for exactly
  this port.)

### Phase 7 — Launch & growth (one city, then many)
- **Closed beta in Austin:** hand-seed supply (recruit real musicians, venues,
  bands), invites/referrals, waitlist, white-glove onboarding, support.
- Instrument the **marketplace metrics** that matter: fill rate, time-to-fill an
  SOS, GMV, take rate, repeat-booking rate, supply/demand balance.
- Then a repeatable **multi-city playbook**.

## Cross-cutting (ongoing every phase)
- **Security & privacy:** run `/security-review` on changes touching auth,
  payments, RLS; least-privilege keys; PII handling.
- **Legal/compliance:** ToS, privacy policy, payments/KYC (Stripe), and the
  **worker-classification question** (subs as independent contractors, 1099) —
  get real advice before payments launch.
- **Accessibility & performance:** keep AA contrast + reduced-motion (already in
  the design system); code-split the growing bundle; image/video CDN.
- **Design system upkeep:** the token seam (`index.css` + `ui.tsx`) is the single
  source of truth — keep new surfaces on tokens.

## Biggest risks / unknowns (watch these)
1. **Marketplace cold-start** — no supply = no product. Phase 7 seeding is as
   important as the code.
2. **Payments + regulatory** — Connect onboarding friction, disputes, and worker
   classification can sink the model. De-risk early with a Stripe + legal spike.
3. **Video cost/complexity** — pick a managed host (Mux/CF Stream); watch
   storage/egress cost as reels grow.
4. **Trust between strangers transacting money** — verification, reviews, and
   dispute handling are load-bearing, not nice-to-haves.

## Suggested sequencing (rough)
- **Now → MVP:** Phase 0 → 1 → 2 → 3 (the critical path). This is the bulk of the
  real engineering and yields a working paid booking.
- **Then:** Phase 4 (SOS/feed/geo) and Phase 5 (trust) in parallel-ish.
- **Then:** Phase 6 (native) once the web product is proven.
- **Continuously:** Phase 7 seeding + metrics from the first beta users.

---

*This is a living document. As phases land, update the "Where we are" inventory
and check off exit criteria. Each phase should ship behind the backend seam so
demo mode keeps working the entire way.*
