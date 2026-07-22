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
- **Phase 0 COMPLETE:** CI (typecheck + build), Sentry/PostHog observability
  (dormant until keyed), the RLS isolation test suite, password reset, and —
  the last piece — **the catalog is DB-backed in cloud mode**:
  `backend.loadCatalog()` serves players/bands/venues/events/feed from
  Postgres, installed over the static arrays at boot (`installCatalog()` in
  `data.ts`), which stays the demo/unseeded fallback. Openings, pickup
  projects, and group chats persist in cloud mode too (`openings`,
  `user_projects`, `group_conversations` tables, owner-only RLS).

**Mocked / not yet real (the gap):**
- Cloud DMs, offer responses, booking cancellation, durable in-app alerts, and
  browser-push delivery are implemented; group-chat replies remain simulated,
  and the Phase 2 migrations/function still need deployment verification.
- Payments are wired through Stripe in the Phase 3 branch, but remain restricted
  to test mode until the two-account flow, failure fixtures, and legal/operations
  gates are complete.
- Public TikTok/YouTube reels are real provider embeds; generative gradients
  remain the fallback for profiles without a reel.
- Ratings are **session-only** (`state.ratingsGiven`, not persisted).
- SOS matching is client-side; "near me" isn't geographic.
- No native app.

## Guiding principles

1. **Two launch scenes, kept distinct (Austin + Nashville).** Marketplaces die
   of empty supply, not missing features. Seed each city deliberately before
   adding more markets or intra-city scene fragmentation.
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

### Phase 0 — Make the backend real (foundation hardening) ✅ DONE
**Goal:** cloud mode fully replaces demo for accounts, profiles, and catalog.
*(Shipped: migrations incl. escrow states + openings + catalog parity +
project/group-chat tables; DB-backed catalog behind `loadCatalog()`; RLS suite
covers isolation, fee privacy, and catalog parity. Remaining Phase 0 exit step
that only you can do: stand up the Supabase project per `DEPLOYMENT.md` and run
the suite green.)*
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

### Phase 1 — Real profiles + reels ✅ CODE COMPLETE
**Goal:** a player creates a public profile and features a reel that actually plays.
- Profile **editing** for your own player page (instruments, rate, gear,
  availability, neighborhood, bio) — writing through the backend.
- **Avatar storage:** upload a JPG/PNG/WebP to the owner-scoped Supabase
  `avatars` bucket; keep the generative fingerprint as the fallback.
- **Reels follow the newer V1 spec:** persist public TikTok/YouTube links and
  play them through the providers' official embed players. Backline does not
  store or transcode copied social video.
- **Exit:** edit a profile and add a reel on one device, then discover and play
  both from another account/device.

### Phase 2 — Messaging + booking (realtime, real state machine) ✅ CODE COMPLETE
**Goal:** two real users message and move a booking through its lifecycle.
- ✅ Account-to-account DMs use participant-scoped tables and **Supabase
  Realtime** subscriptions; cloud replies persist and sync live, while demo
  mode alone retains canned replies.
- ✅ **Booking state machine in Postgres:** `offer → accepted → held → released`,
  with `declined` and pre-payment `cancelled` terminal paths, server-owned
  timestamps, and transition guards (only the invited musician can accept or
  decline); valid cancellation actions are exposed in the thread UI.
- ✅ **Notifications:** durable, deduplicated in-app alerts, cross-device read
  state, browser-push subscriptions, preference controls, hard mute, and quiet
  hours are implemented. The push-delivery Edge Function handles urgent booking
  alerts and optional message pushes. Group, SOS, and payment notifications land
  with the normalized group/SOS models and real payments in Phases 3–4. Per the
  newer V1 spec, general email notifications remain deferred.
- **Operational exit (pending):** deploy migrations and the Edge Function,
  configure VAPID + the database webhook, then verify two accounts can move a
  booking offer → accepted/cancelled with live chat and cross-device alerts.

### Phase 3 — Payments (real money) ⚠️ hardest, regulated
**Goal:** money moves booker → escrow → musician's bank, minus platform fee.
- **Foundation implemented (test-mode gate):** hosted Express onboarding,
  server-owned destination-charge PaymentIntents, Payment Element authorization,
  signed Connect/payment webhooks, participant dispute freezes, and an
  idempotent scheduled capture worker. A server-only resolver safely releases
  or fully refunds frozen destination charges. Held-booking cancellation now
  enforces the 24-hour/50% V1 policy without trusting browser-supplied amounts.
- **Stripe Connect (Express):** musicians onboard as connected accounts (Stripe
  handles KYC/identity/tax/1099). Replace `PaymentSheet` with Stripe
  Elements/Checkout.
- **Escrow-style hold:** PaymentIntent with **manual capture** at booking; capture
  on **gig completion**; transfer/payout to the musician; **application fee** =
  platform take. Refunds + the "cancel-friendly up to 24h" policy as real logic.
- **Remaining hardening:** automated Stripe fixtures, a staff-authenticated
  operator surface, reliability scoring from player-bail audit events, payout
  schedule verification, and the full two-account test-mode runbook.
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

### Phase 7 — Launch & growth (two scenes, then many)
- **Closed beta in Austin and Nashville:** hand-seed supply independently in
  both scenes (recruit real musicians, venues, and bands), invites/referrals,
  waitlist, white-glove onboarding, and support.
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
