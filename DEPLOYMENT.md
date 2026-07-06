# Deploying SitIn

This guide takes SitIn from your laptop to a live site at
**`sitin.kitesink.com`**, auto-deployed every time you push to GitHub, and lays
the groundwork for a real Supabase backend.

> **Read this first.** SitIn is currently a *static, client-side app* — every
> bit of data lives in the browser's `localStorage` and there is no backend
> code yet. That means:
>
> - **Phase 1 (Vercel + subdomain)** makes the app live *today* with no code
>   changes. Do this now.
> - **Phase 2 (Supabase)** is real development work: replacing the mock data
>   store with a real database, auth, and payments. Do this when you're ready to
>   make data persistent and shared between users. The plumbing is scaffolded
>   below so it's a smooth add.

---

## Phase 1 — Ship it live on Vercel

### What's already done
- `vercel.json` is committed. It tells Vercel to build with `npm run build`,
  serve the `dist/` folder, and — critically — **rewrite all routes to
  `index.html`** so deep links like `/discover` don't 404 on refresh (SitIn uses
  client-side routing via `BrowserRouter`).

### Steps

1. **Push your work to GitHub.** Vercel deploys from a branch. Right now you're
   on `claude/musicians-collab-app-prototype-v6bd8u`. Either merge it to `main`
   or point Vercel at this branch (step 3 covers this).
   ```bash
   git add vercel.json DEPLOYMENT.md
   git commit -m "Add Vercel config and deployment guide"
   git push
   ```

2. **Create the Vercel project.**
   - Go to <https://vercel.com/new> and sign in with your GitHub account.
   - Import the `trumankitos13/musician-finder` repository.
   - Vercel auto-detects **Vite**. Confirm the settings match `vercel.json`:
     - Framework Preset: **Vite**
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Click **Deploy**. In ~1 minute you'll get a live `*.vercel.app` URL. Open
     it and click around to confirm it works.

3. **Set the production branch** (only if you're *not* using `main`).
   - Project → **Settings → Git → Production Branch**.
   - Set it to `claude/musicians-collab-app-prototype-v6bd8u`, or better, merge
     your work into `main` and leave the default. From now on, **every push to
     the production branch auto-deploys to production**; pushes to other branches
     get preview URLs.

### The auto-deploy loop you asked for
Once connected: `git push` → Vercel builds → live in ~60s. That's the whole
loop. No manual steps.

---

## Phase 2 — Point `sitin.kitesink.com` at Vercel

You own `kitesink.com`, and `sitin` will be a subdomain of it.

1. **Add the domain in Vercel.**
   - Project → **Settings → Domains** → add `sitin.kitesink.com` → **Add**.
   - Vercel shows you the exact DNS record to create. It will be a **CNAME**:

     | Type  | Name    | Value                    |
     |-------|---------|--------------------------|
     | CNAME | `sitin` | `cname.vercel-dns.com`   |

2. **Create that record at your DNS provider** (wherever `kitesink.com`'s DNS is
   managed — e.g. Cloudflare, Namecheap, GoDaddy). Add the CNAME exactly as
   Vercel specifies.
   - If your provider is **Cloudflare**, set the record to **DNS only** (grey
     cloud, proxy off) so Vercel can issue the TLS certificate.

3. **Wait for propagation** (usually minutes, up to ~24h). Vercel verifies the
   record and auto-provisions an HTTPS certificate. When the domain shows a green
   checkmark, `https://sitin.kitesink.com` is live.

> If you actually meant a deeper subdomain like `app.sitin.kitesink.com`, the
> steps are identical — just use that full name in Vercel and set the CNAME
> `Name` to `app.sitin`.

---

## Phase 3 — Backline backend on Supabase

This is where the app (working name **Backline**) stops being a demo and starts
persisting real, shared data. It is **development work, not just
configuration.** Today the entire data layer is the mock `api` object in
`src/lib/store.tsx` backed by `localStorage`. That object is the seam a real
backend slots into.

### Already scaffolded in this repo (the "Foundation" slice)
- `@supabase/supabase-js` (runtime) and `supabase` CLI (dev) installed, pinned,
  lockfile committed.
- `supabase/config.toml` — local project id set to `backline`.
- `supabase/migrations/*_backline_initial_schema.sql` — full Postgres schema
  mirroring `src/lib/types.ts`: catalog tables (musicians, bands, venues, gigs,
  feed) + per-user tables (profiles, follows, conversations, messages, bookings,
  likes), an `auth.users` → `profiles` trigger, and Data API grants.
- `supabase/migrations/*_backline_rls_policies.sql` — RLS **enabled on every
  table**: catalog is public-read/no-writes; user tables are strictly
  owner-scoped via `(select auth.uid())` with `USING` + `WITH CHECK`.
- `supabase/seed.sql` — placeholder for the catalog seed (still TODO).
- `src/lib/supabase.ts` — browser client (publishable key only).
- `src/vite-env.d.ts`, `.env.local.example` — typed, documented env vars.

> The app itself is **unchanged** and still runs on mock data — nothing imports
> `supabase.ts` yet, so the production bundle is byte-identical. This slice is
> safe to merge and deploy on its own.

### What you need to do (I can't create the cloud project for you)
1. **Create the project.** <https://supabase.com/dashboard> → **New project** →
   name it **Backline**. Pick a region near your users and save the database
   password.
2. **Grab the keys** from **Project Settings → API**: the **Project URL** and
   the **publishable / anon key**. ⚠️ Never put the `service_role`/secret key in
   this app — every `VITE_` var ships to the browser.
3. **Fill env vars.**
   - Local: `cp .env.local.example .env.local` and paste the two values.
   - Vercel: **Settings → Environment Variables** → add `VITE_SUPABASE_URL` and
     `VITE_SUPABASE_ANON_KEY` for Production + Preview, then redeploy.
4. **Apply the migrations** to the cloud project. Either:
   - Link and push with the CLI:
     ```bash
     npx supabase login
     npx supabase link --project-ref <your-project-ref>
     npx supabase db push
     ```
   - **or** paste each file in `supabase/migrations/` into the dashboard SQL
     editor in filename order.
5. **Seed the catalog.** Paste `supabase/seed.sql` into the dashboard SQL editor
   and run it (it inserts the Austin demo scene the user tables reference).
   Regenerate any time from the TypeScript source with
   `node scripts/gen-seed.ts > supabase/seed.sql`.
6. **Verify security.** Run `npx supabase db advisors` (or the dashboard
   Advisors tab) and confirm no ERROR-level findings — especially "RLS
   disabled" or "policy allows public write".

Once the env vars are set and the migrations + seed are applied, the app
switches itself into cloud mode: the welcome screen asks for an account, and
profiles, follows, conversations, bookings, and likes persist per-user in
Postgres. With no env vars it stays in demo mode (localStorage) — so the site
never breaks while you're mid-setup.

### What's already wired (done in this branch)
- **Auth** — email + password sign-up / sign-in / sign-out, session handling,
  and a sign-in screen on the welcome page (cloud mode only).
- **Store rewiring** — `src/lib/store.tsx` writes through to a pluggable backend
  (`src/lib/backend/`); `supabase.ts` maps every mutation to the RLS-protected
  tables, `local.ts` keeps the localStorage demo.
- **Seed** — `supabase/seed.sql`, generated from `src/lib/data.ts`.
- Verified end-to-end in demo mode (onboarding → messaging → persistence).

### Still ahead
1. **Runtime-verify cloud mode** — I couldn't test the Supabase path without a
   live project; do a smoke test after applying migrations + seed.
2. **Realtime messaging & SOS** via Supabase Realtime subscriptions.
3. **Payments** — stays mocked until Stripe Connect (a separate, larger project;
   see the README roadmap).

---

## Quick reference

| Task | Where |
|------|-------|
| Trigger a deploy | `git push` to the production branch |
| Change build settings | Vercel → Settings → General |
| Manage the domain | Vercel → Settings → Domains |
| DNS record | Your `kitesink.com` DNS provider: `CNAME sitin → cname.vercel-dns.com` |
| Secrets / env vars | Vercel → Settings → Environment Variables |
| Local build check | `npm run build` |
