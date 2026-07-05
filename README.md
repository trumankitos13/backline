# SitIn 🎸 — your scene, on call

**Prototype** of a local-first social app for musicians, bands, venues, and gig
techs. The elevator pitch: *your drummer's van died in Waco and you play at 9 —
open SitIn, find a drummer two neighborhoods over, watch their reel, message
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

Everything is mock data (a fictional Austin, TX scene) persisted to
`localStorage` — no backend, no real payments. Use **Reset demo data** on the
profile page to start over.

## Run it

```bash
npm install
npm run dev       # → http://localhost:5173
```

`npm run build` typechecks and produces a static bundle in `dist/`.

## Stack & architecture

Vite + React 19 + TypeScript + Tailwind v4, `react-router` for navigation.
See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the route map, data
model, and store API. Design decisions that matter for what comes next:

- `src/lib/types.ts` is the API contract; `src/lib/store.tsx`'s `api` object is
  the seam where a real backend (REST/WebSocket) replaces the simulated one.
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
