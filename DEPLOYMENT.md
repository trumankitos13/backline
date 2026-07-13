# Deploying & running Backline

This guide covers three things:

1. **Ship the app live** on Vercel (works today, no backend needed).
2. **Point a custom domain** at it.
3. **Set up and test the Supabase backend** — the part that turns Backline from
   a demo into a real, multi-user app. This is the focus below.

## Two modes (important mental model)

Backline picks its data source automatically at build time:

- **Demo mode** — no Supabase env vars. All state lives in `localStorage`, no
  accounts, no real payments. This is what runs with `npm run dev` out of the
  box, and what the deployed site falls back to until Supabase is wired. The
  site never breaks while you're mid-setup.
- **Cloud mode** — `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` set. Real
  Supabase Auth + Postgres, per-user data behind Row-Level Security. The welcome
  screen shows a sign-in panel; profiles, follows, conversations, bookings, and
  likes persist per account.

The seam is `src/lib/backend/` (`local.ts` vs `supabase.ts`), selected in
`src/lib/backend/index.ts`. The rest of the app doesn't know which is live.

---

## Part 1 — Ship it live on Vercel

`vercel.json` is already committed (builds with `npm run build`, serves `dist/`,
and rewrites all routes to `index.html` so client-side deep links don't 404).

1. Push to GitHub (you're on `dev`; `main` is the production branch).
2. <https://vercel.com/new> → sign in with GitHub → import
   `trumankitos13/musician-finder`. Vercel auto-detects **Vite**; confirm
   Build `npm run build`, Output `dist`. **Deploy.**
3. Production branch: **Settings → Git → Production Branch** → `main` (or point
   it at `dev` while iterating). Every push to that branch auto-deploys;
   other branches get preview URLs.

With no env vars set, the deploy runs in **demo mode** — safe to ship now.

## Part 2 — Custom domain

The marketing landing already lives at **kitesink.com/backline**. To put the app
on a subdomain (e.g. `app.kitesink.com`):

1. Vercel → **Settings → Domains** → add your domain.
2. Create the DNS record Vercel shows (a `CNAME` to `cname.vercel-dns.com`) at
   your DNS provider. On Cloudflare, set it to **DNS only** (grey cloud) so
   Vercel can issue TLS.
3. Wait for propagation + the green checkmark; HTTPS is automatic.

---

## Part 3 — Supabase backend: set up & test

### What's already in the repo
- `supabase/config.toml` — local project id `backline`.
- `supabase/migrations/*_initial_schema.sql` — full schema (catalog + per-user
  tables), an `auth.users → profiles` trigger, and Data API grants.
- `supabase/migrations/*_rls_policies.sql` — RLS on **every** table:
  catalog is public-read/no-write, user tables strictly owner-scoped.
- `supabase/migrations/*_booking_escrow_states.sql` — the escrow lifecycle:
  adds `held` / `released` to the booking-status enum.
- `supabase/migrations/*_openings_and_capabilities.sql` — the `openings` table
  (owner-only RLS — the fee column is on it, and fees are private) plus the
  capabilities columns (`band_members.admin`, `venues.managers`, project fields).
- `supabase/migrations/*_phase0_catalog_and_cloud_projects.sql` — catalog
  parity (links/reels/backline/hiring/event fields the 4-object refactor
  added) + `user_projects` and `group_conversations` (whole-document jsonb,
  owner-only RLS) + `bookings.opening_id`.
- `supabase/seed.sql` — the Austin and Nashville demo catalog (players, bands,
  venues, events, feed), **generated** from `src/lib/data.ts` via
  `node --experimental-strip-types scripts/gen-seed.ts > supabase/seed.sql`.
- `supabase/tests/rls.test.mjs` — the RLS isolation test suite (see below),
  including openings fee-privacy checks.
- `src/lib/backend/supabase.ts` — the real backend: auth + all user-data
  persistence (profiles, follows, chats, bookings, openings). Already wired;
  it just needs a project to talk to.

> The two tracks below get you a working, testable backend. **Track A (local)**
> is the fastest way to see cloud mode and run the tests — no cloud account, no
> risk. **Track B (cloud)** is for a real deployed environment.

---

### Track A — Local Supabase (recommended first)

Runs the whole stack (Postgres + Auth + Studio + a fake email inbox) in Docker
on your machine. Local email confirmation is **off**, so signups work instantly.

**Prerequisite:** Docker Desktop running. The `supabase` CLI is already a dev
dependency (`npx supabase`).

1. **Start the stack** (first run pulls images; applies migrations):
   ```bash
   npx supabase start
   ```
2. **Load the catalog seed** (and re-apply migrations from scratch):
   ```bash
   npx supabase db reset
   ```
3. **Get your local keys:**
   ```bash
   npx supabase status
   ```
   Note the values:
   - **API URL** → `http://127.0.0.1:54321`
   - **anon key** → the app's `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → for the RLS tests only (server-side, never in the app)
   - **Studio** (DB browser): <http://127.0.0.1:54323>
   - **Inbucket** (captured emails): <http://127.0.0.1:54324>

4. **Point the app at local Supabase** — create `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
   ```ini
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<anon key from `supabase status`>
   ```
   Then `npm run dev`. The welcome screen now shows the **sign-in panel** (cloud
   mode is on).

5. **Smoke-test the real flow:**
   - Create an account → complete onboarding → you land in the app.
   - Follow a band, send a message, then run the full money loop: send an
     offer → it's accepted → **Hold** → "Gig played — release" → rate.
   - Post an opening (Reels tab → "Post an opening") → it leads your Feed.
   - Open **Studio** (`:54323`) → **Table editor** → confirm rows appear in
     `profiles`, `follows`, `conversations`, `messages`, `bookings`,
     `openings` (booking status should read `held` → `released`); assembling a
     pickup band adds rows in `user_projects` + `group_conversations`.
   - **Prove the catalog is DB-backed:** in Studio, edit a musician's name in
     the `musicians` table → reload the app → the new name shows everywhere.
   - Sign out and back in → your data is still there (persistence works).

6. **Run the RLS isolation tests** against local:
   ```bash
   export SUPABASE_URL=http://127.0.0.1:54321
   export SUPABASE_ANON_KEY=<anon key>
   export SUPABASE_SERVICE_ROLE_KEY=<service_role key>
   node supabase/tests/rls.test.mjs
   ```
   You want **all checks passed** — this proves one user can't read, mutate, or
   forge another's data. Details in `supabase/tests/README.md`.

7. **Stop when done:** `npx supabase stop`.

---

### Track B — Cloud project

For a real, deployed backend.

1. **Create the project.** <https://supabase.com/dashboard> → **New project** →
   name it **Backline**, pick a region near your users, save the DB password.
2. **Grab keys** from **Project Settings → API**: the **Project URL** and the
   **anon / publishable** key. ⚠️ The `service_role` key is a secret — never put
   it in a `VITE_` var (those ship to the browser). It's only for the RLS tests.
3. **Apply the migrations:**
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   (Or paste each file in `supabase/migrations/` into the dashboard SQL editor,
   in filename order.) `db push` applies pending migrations; it does **not**
   reset user data.
4. **Add the regenerated catalog seed.** `db push` does *not* run `seed.sql`
   against a remote. Run the regenerated `supabase/seed.sql` in the dashboard
   **SQL editor**. It adds the Nashville catalog records alongside the existing
   catalog; it does not reset user data.
5. **Auth settings.** Cloud projects **require email confirmation by default**.
   For real use, keep it on (the app handles the "check your email" state). For
   quick testing, **Authentication → Providers → Email** → temporarily disable
   "Confirm email", or just confirm via the link Supabase emails you.
6. **Set env vars:**
   - Local: put the cloud URL + anon key in `.env.local`.
   - Vercel: **Settings → Environment Variables** → add `VITE_SUPABASE_URL` and
     `VITE_SUPABASE_ANON_KEY` (Production + Preview) → redeploy.
7. **Verify security:**
   ```bash
   npx supabase db advisors        # or the dashboard "Advisors" tab
   ```
   Confirm **no ERROR-level findings** (especially "RLS disabled" / "policy
   allows public write"). Then run the RLS suite against a **disposable** test
   project (never production — it creates/deletes users):
   ```bash
   export SUPABASE_URL=https://<test-ref>.supabase.co
   export SUPABASE_ANON_KEY=<anon>
   export SUPABASE_SERVICE_ROLE_KEY=<service_role>
   node supabase/tests/rls.test.mjs
   ```
   Run the Supabase RLS suite only with **disposable project credentials** —
   never production credentials, because the suite creates and deletes users.
   To run these in CI, add repo secrets `SUPABASE_TEST_URL`,
   `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY` (pointing at the
   disposable project); `.github/workflows/ci.yml` runs them on push and skips
   cleanly when absent.
8. **Verify the application before release:**
   ```bash
   npm test
   npm run build
   ```

### Additive cloud rollout checklist

For an existing cloud project, use this order:

```bash
npx supabase db push
```

Then run the regenerated `supabase/seed.sql` in the Supabase **SQL editor**,
followed by:

```bash
npm test
npm run build
```

`db push` does not reset user data. The catalog seed is additive and adds the
Nashville records. If you run `supabase/tests/rls.test.mjs`, use disposable
project credentials only—not production.

---

### Optional — observability

Both are dormant until keyed (see `.env.local.example`):
- **Sentry** (errors): set `VITE_SENTRY_DSN` (Project Settings → Client Keys).
- **PostHog** (analytics): set `VITE_POSTHOG_KEY` (+ `VITE_POSTHOG_HOST` if EU).

Add the same vars in Vercel for the deployed app.

### Phase 0 status: complete (code side)
- **The catalog is DB-backed in cloud mode.** At boot the app loads
  players/bands/venues/events/feed from Postgres and installs them over the
  static arrays; `src/lib/data.ts` remains the demo catalog and the fallback
  when the project isn't seeded (the app never boots empty).
- **Everything the app writes persists in cloud mode**: profiles, follows,
  chats (DMs *and* group chats), bookings (held/released), openings, and
  pickup projects.
- What remains for Phase 0 exit is on your side: stand up the project (Track A
  or B above), seed it, and run the RLS suite green.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Welcome screen shows no sign-in panel | Env vars not picked up — confirm `.env.local` has both `VITE_SUPABASE_*` and restart `npm run dev`. |
| `npx supabase start` fails | Docker isn't running, or ports 54321–54324 are taken. |
| RLS tests: "Catalog is empty" | Seed first: `npx supabase db reset` (local) or run `seed.sql` (cloud). |
| Signup succeeds but can't sign in (cloud) | Email confirmation is on — confirm via the email, or disable it for testing. |
| Local password-reset email not arriving | Check **Inbucket** at `:54324`; also set `[auth] site_url` in `config.toml` to your dev URL if the reset link points at `:3000`. |

## Quick reference

| Task | Command / location |
|---|---|
| Local build check | `npm run build` |
| Start local backend | `npx supabase start` → `npx supabase db reset` |
| Local keys | `npx supabase status` |
| Apply migrations to cloud | `npx supabase link` → `npx supabase db push` |
| Add regenerated cloud catalog | Run `supabase/seed.sql` in the Supabase SQL editor |
| Release verification | `npm test` → `npm run build` |
| Run RLS tests | `node supabase/tests/rls.test.mjs` (with `SUPABASE_*` env) |
| Trigger a deploy | `git push` to the production branch |
| Env vars (deployed) | Vercel → Settings → Environment Variables |
