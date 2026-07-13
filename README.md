# Backline 🎸 — your scene, on call

**Prototype** of a local-first social app for musicians, bands, venues, and gig
techs. The elevator pitch: *your drummer's van died in Waco and you play at 9 —
open Backline, find a drummer two neighborhoods over, watch their reel, message
them, book them, and pay them, all in one place.*

## What's in the prototype

- **Find a player** — search every role a stage needs (guitar, bass, drums,
  keys, vocals, horns, strings, DJ, sound tech, lighting tech) with filters for
  genre, distance, rate, and *available tonight*. An **SOS mode** cuts straight
  to who can cover a gig in the next few hours.
- **Profiles with reels** — every player has a short-form vertical video reel
  to advertise their playing, plus rates, gear, availability, bands, and
  reviews from past bookings.
- **Bands & groups** — band pages with members, upcoming gigs, and **open
  slots** ("need a weekend drummer", "looking for FOH") that anyone can answer
  with one tap.
- **Feed** — follow venues and bands to keep up with your town: show
  announcements, open mics, new reels, and urgent "need a sub" posts you can
  respond to instantly.
- **Messages → booking → payment** — DM any player; send a structured booking
  offer (gig, venue, date, amount) right in the thread; when they accept, pay
  through the app (mocked Stripe-style flow with escrow-style messaging).
- **Onboarding** — pick your roles, your neighborhood, and flip on
  "available tonight" to appear in SOS searches.

The app runs in one of two modes, chosen automatically at build time:

- **Demo mode** (no env vars): a fictional Austin, TX scene, all state persisted
  to `localStorage`, no accounts, no real payments. Use **Reset demo data** on
  the profile page to start over. This is what runs with `npm run dev` out of
  the box, and what the deployed site falls back to until Supabase is wired.
- **Cloud mode** (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` set): real
  Supabase Auth (email + password) and Postgres persistence, with per-user
  data protected by row-level security. See [`DEPLOYMENT.md`](DEPLOYMENT.md).

The musician/band/venue catalog is demo data in both modes (seeded into Postgres
via `supabase/seed.sql` in cloud mode).

## Run it

```bash
npm install
npm run dev       # → http://localhost:5173
```

`npm run build` typechecks and produces a static bundle in `dist/`.

## Additive Supabase rollout

For an existing Supabase project, apply the release in this order:

```bash
npx supabase db push
```

Then run the regenerated `supabase/seed.sql` in the Supabase dashboard's **SQL
editor**, then verify the app:

```bash
npm test
npm run build
```

`db push` does not reset user data. The catalog seed is additive and adds the
Nashville records. Run the Supabase RLS suite only against disposable project
credentials—never production—because it creates and deletes test users. See
[`DEPLOYMENT.md`](DEPLOYMENT.md) for setup and RLS-test details.

## Stack & architecture

Vite + React 19 + TypeScript + Tailwind v4, `react-router` for navigation.
See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the route map, data
model, and store API. Design decisions that matter for what comes next:

- `src/lib/types.ts` is the API contract; `src/lib/store.tsx`'s `api` object is
  the seam to the backend. The store updates optimistically and writes through
  to a pluggable backend (`src/lib/backend/`): `local.ts` (localStorage) or
  `supabase.ts` (auth + Postgres), selected by whether Supabase env vars exist.
- Database schema, RLS policies, and catalog seed live in `supabase/`.
- The UI is mobile-first (bottom tab bar) so screens translate directly to the
  planned native app.
- Video reels are placeholder tiles behind one component (`components/video.tsx`);
  swapping in real uploaded/streamed video touches only that file.

## Roadmap (post-prototype)

1. **Backend** — auth, Postgres (+PostGIS for real "near me"), media pipeline
   for reel uploads, WebSocket messaging, push notifications for SOS requests.
2. **Payments** — Stripe Connect: musicians onboard once, bookers pay in-app,
   platform fee + escrow-style capture until the gig happens.
3. **Mobile** — React Native/Expo app sharing the same types and API client;
   the web app stays as the desktop/booking surface.
4. **Trust** — verified profiles, reviews tied to completed bookings,
   cancellation policies.
