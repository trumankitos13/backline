# Backline — repository audit

*Audit date: 2026-07-13. Scope: full repo — source, database migrations, RLS, CI, tooling, docs.*

**Verified during the audit:** `npm run typecheck` ✓ · `npm test` 18/18 ✓ · `npm run build` ✓ ·
`npm audit` 0 vulnerabilities ✓

---

## What's in good shape

Worth saying first, because a lot of this repo is genuinely well built for a prototype:

- **Clean backend seam.** `src/lib/backend/` (local vs Supabase behind one `Backend` interface)
  is exactly the right shape; the store never knows which is live, and demo mode means the
  deployed site never breaks mid-setup.
- **RLS is done right.** Every exposed table has RLS enabled; policies use
  `(select auth.uid())` for planner caching; UPDATE policies carry both `USING` and
  `WITH CHECK`; the fee column is deliberately owner-only with a documented plan for a
  public view that excludes it. The `handle_new_user` trigger follows the safe
  SECURITY DEFINER + empty search_path pattern.
- **RLS isolation tests exist** (`supabase/tests/rls.test.mjs`) and actually prove
  cross-user isolation, forgery rejection, and migration application — rare to see at this stage.
- **Docs are unusually good.** README/DEPLOYMENT/ARCHITECTURE/V1_SPEC explain the *why*,
  not just the *what*; comments in migrations and the store explain design intent.
- **Observability is dormant-by-default** and dynamically imported, so unconfigured builds
  ship zero Sentry/PostHog bytes (verified in the built bundle).
- **Type discipline**: strict TS, a single domain model (`src/lib/types.ts`) treated as the
  API contract, pure helpers extracted and unit-tested (`scheduling`, `sceneScope`, `actingAs`).

---

## High-priority findings

### 1. CI never runs the unit tests

`.github/workflows/ci.yml` runs typecheck and build only. The repo has 6 test files /
18 tests (`vitest`), and they never run in CI — a regression that breaks
`PostFlow.test.tsx` would merge green.

**Fix:** add a `npm test` step between Typecheck and Build in the `build` job. Cheap, immediate.

### 2. Cloud-mode "Reset everything" doesn't reset everything

`supabaseBackend.reset()` (`src/lib/backend/supabase.ts:607`) deletes follows, bookings,
conversations, liked_posts, responded_sub_posts — but **not** `openings`, `user_projects`,
or `group_conversations`. The profile-page button says "Yes, reset everything"
(`src/pages/MyProfile.tsx:422`), and the local backend genuinely clears all state, so the two
backends disagree. A cloud user who resets keeps their old openings, pickup projects, and
group chats after the reload.

**Fix:** add the three missing tables to the `Promise.all` in `reset()`.

### 3. Client-generated IDs can collide across users

`uid()` in `src/lib/store.tsx:293` is `prefix-Date.now().toString(36)-counter`, with the
counter starting at 0 per session. `messages.id`, `bookings.id`, `openings.id` are **global**
text primary keys, so two users sending their first message in the same millisecond generate
the same id — the second insert fails with a duplicate-key error that the fire-and-forget
`persist()` swallows, silently losing the write. It's also a mild griefing vector: any
authenticated user can pre-claim an id another client will later generate.

**Fix:** use `crypto.randomUUID()` (supported in all targets of this build) inside `uid()`,
keeping the prefix for debuggability. Longer term, consider composite PKs
(`user_id, id`) for user-owned tables.

### 4. Optimistic writes fail silently — the user is never told

The write-through pattern (`persist()` in `store.tsx:388`) logs to `console.error` and moves
on. In cloud mode a network blip means the UI shows a sent message / held booking that never
persisted, and it vanishes on next reload. There's no retry, rollback, or user-visible signal.
Related: `captureError`, `track`, and `identify` in `src/lib/observability.ts` are exported
but **never called** anywhere — Sentry only sees unhandled exceptions, and persist failures
are exactly the errors you'd want reported.

**Fix (incremental):**
1. Call `captureError(e, { op })` in the `persist()` catch (one line, immediate signal).
2. Call `identify()` on auth change in `AppProvider`.
3. Later: a small toast ("Couldn't save — retrying") + a bounded retry queue.

---

## Performance

### 5. One 683 kB JS chunk; no code splitting

The production build emits a single `index-*.js` (683 kB / 191 kB gzip) and Vite warns about
it. Three separable costs are all in the critical path:

- **supabase-js ships to demo users.** `backend/index.ts` statically imports both backends,
  so the GoTrue/PostgREST client (~100 kB+) is bundled even when no Supabase env vars exist
  (confirmed by grepping the bundle for `GoTrueClient`).
- **The full demo catalog ships to cloud users.** `data.ts` is 1,081 lines of seed data,
  always bundled (it's also the fallback, so this one is a judgment call).
- **All 11 routes load eagerly.** No `React.lazy` anywhere.

**Fix:** lazy-load routes with `React.lazy`/`Suspense` (the `Splash` component already exists
as a fallback), and make the backend selection async (`await import("./supabase")` only when
`isSupabaseConfigured`). Either alone roughly halves first-load JS for the common path.

### 6. Unread-counter race in cloud DMs

`supabaseBackend.addMessage` (`supabase.ts:468`) reads `unread` from the upsert result, then
writes `unread + 1` in a second statement. Two concurrent replies (or two tabs) lose an
increment. Fine for the single-writer prototype; will bite once messages come from real
counterparts.

**Fix (when it matters):** a Postgres RPC (`update ... set unread = unread + 1`) or a
DB-side trigger on message insert.

---

## Architecture & maintainability

### 7. The mutable catalog singleton is a memo-staleness trap

`installCatalog()` (`src/lib/data.ts:1012`) replaces the contents of the exported `PLAYERS` /
`BANDS` / … arrays **in place**, so their identity never changes. Components memoize over
them — e.g. `Discover.tsx:100` (`results`), `:124` (`tonightTotal`, deps `[]`) — which only
works because the catalog is currently installed before those components mount. Any future
change that swaps the catalog while a consumer is mounted (background refresh, realtime
update, in-page scene switch) silently shows stale data with no type error or warning.

**Fix:** move the catalog into React state/context (or a versioned store the memos can depend
on). Cheaper stopgap: have `installCatalog` bump a `catalogVersion` exposed via context and
include it in memo deps.

### 8. Scene list is hardcoded in four places

Adding a third scene requires touching `src/lib/scenes.ts`, plus `check (scene in ('austin',
'nashville'))` constraints in **three** migrations (profiles, catalog tables, openings). The
DB check constraints add little (RLS already gates writes; app validates the type) but force
a migration per scene.

**Fix:** either a `scenes` lookup table with FKs, or drop the check constraints and let
`SceneId` be the single source of truth. Also note `openings.instrument` is plain `text`
while every other table uses the `instrument_id` enum — worth unifying.

### 9. `store.tsx` mixes three concerns (915 lines)

The reducer, the write-through API, and the **demo simulation layer** (canned replies, fake
acceptances, staggered "stay" votes — ~300 lines of `window.setTimeout` choreography) live in
one file. The simulations also keep firing after sign-out: `persist()` guards on the auth
ref, but the `dispatch` still lands (e.g. a booking-accept timer can inject a conversation
into a signed-out, empty state).

**Fix:** extract the simulation into `src/lib/simulation.ts` behind the same `AppApi` seam,
cancel pending timers on sign-out/reset, and the store drops to ~600 focused lines. This also
maps cleanly to the roadmap moment when simulations are replaced by real counterparts.

### 10. Dead code / redundancy (small)

- `filterCatalogRoots` (`supabase.ts:59`) re-filters rows the query already filtered with
  `.eq("scene", scene)` — five redundant passes per catalog load.
- `conversationClientId` is exported but only used within its own module.
- `vitest.config.ts` duplicates the React plugin setup from `vite.config.ts`; a single
  `vite.config.ts` with a `test` block (using `defineConfig` from `vitest/config`) removes a file.

---

## Tooling & CI

### 11. No linter or formatter

There's no ESLint, no Prettier, no lint script, and nothing in CI. For a codebase with this
much intentional convention (and with `react-hooks` dependency rules being load-bearing —
see finding 7), this is the biggest missing guard-rail.

**Fix:** ESLint 9 flat config with `typescript-eslint` + `eslint-plugin-react-hooks`
+ `eslint-plugin-react-refresh`, Prettier (or ESLint stylistic), `"lint"` script, CI step.
Start with `--max-warnings 0` on new findings only if the initial sweep is noisy.

### 12. CI targets a `dev` branch that doesn't exist

`ci.yml` triggers on `push`/`pull_request` to `[dev, main]`, but the repo has no `dev`
branch (work flows through feature branches → `main`). Feature-branch pushes get no CI until
a PR opens — fine if intentional, but the `dev` reference is dead config. The RLS job's
`if: github.event_name == 'push'` + in-script secret check is reasonable.

**Fix:** drop `dev`, and consider `pull_request` on all target branches (it already is for
`main`). Optionally add `actions/setup-node` `cache: npm` — already present — and a
concurrency group — also present. Only the branch list needs cleanup.

### 13. TypeScript config gaps

- `tsconfig.json` includes only `src`, so `vite.config.ts`, `vitest.config.ts`, and
  `scripts/gen-seed.ts` are never typechecked (`npm run typecheck` skips them).
- `noUnusedLocals` / `noUnusedParameters` are `false` — with no linter either, dead code
  accumulates invisibly.
- No `engines` field in `package.json`; CI pins Node 22 but local contributors get no signal
  (`scripts/gen-seed.ts` run via `node` needs ≥22.6 type-stripping).

**Fix:** project references (`tsconfig.app.json` + `tsconfig.node.json`, the Vite scaffold
default), flip the two flags on, add `"engines": { "node": ">=22" }`.

### 14. `.gitignore` gaps

`*.local` covers `.env.local`, but a plain `.env` (an easy accident) would be committed.
Also missing: `coverage/`, `.vercel/`.

---

## Security & deployment hardening

*(RLS itself audited clean — see "What's in good shape". These are browser/edge items.)*

### 15. No security headers on the deployed site

`vercel.json` has only the SPA rewrite. Add:

```json
"headers": [
  {
    "source": "/(.*)",
    "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
    ]
  },
  {
    "source": "/assets/(.*)",
    "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
    ]
  }
]
```

A CSP is feasible too (Vite emits no inline scripts) but needs the Supabase/Sentry/PostHog
origins enumerated — do it when cloud mode goes live.

### 16. No error boundary

One render error blanks the whole app to a white screen. `@sentry/react` ships an
`ErrorBoundary`, but since Sentry is optional, add a small hand-rolled boundary at the
`App` level that shows a "something broke — reload" card and calls `captureError`.

### 17. Group-chat documents are trusted blindly

`load()` casts `group_conversations.data` / `user_projects.data` jsonb straight to
`Conversation` / `Band` (`supabase.ts:392,420`). One corrupt or maliciously-shaped row (the
owner can write any JSON through the API) crashes hydrate for that user. A tiny shape-check
(or Zod at the seam) turns "app won't boot" into "one document dropped."

---

## Docs & repo hygiene

### 18. DEPLOYMENT.md has drifted

- Line 35 tells you to import `trumankitos13/musician-finder` — the repo is now
  `trumankitos13/backline`.
- Line 33 says "you're on `dev`; `main` is the production branch" — there is no `dev` branch.

### 19. Smaller items

- `index.html` has no Open Graph / Twitter meta — links shared in a group chat (the app's
  own audience!) render bare. Five lines.
- No focus trap in the sheet/modal components (`ui.tsx`); keyboard users can tab behind an
  open sheet. `ReelViewer`'s keyboard support is otherwise good.
- `tomorrowIso()` (`scheduling.ts:23`) adds a UTC day and reformats in Central time — on the
  DST fall-back day (25h) it can return *today's* date. One-line fix: derive tomorrow from
  `todayIso()` string math instead of clock math.
- 9 list renders use `key={i}`/`key={index}` — fine for the static lists they're on today,
  worth a lint rule (finding 11 covers it).
- `@supabase/supabase-js` is pinned exact (`2.110.0`) while everything else uses ranges —
  fine if deliberate, but worth a lockfile-maintenance habit either way (Dependabot/Renovate
  config is absent).
- Consider a root `CLAUDE.md` / `CONTRIBUTING.md` distilling the conventions that currently
  live implicitly in ARCHITECTURE.md (e.g. "types.ts is the contract", "never loosen the
  openings policies") so agents and new contributors hit them before writing code.

---

## Suggested order of attack

**Quick wins (an afternoon, low risk):**
1. Add `npm test` to CI (#1) and drop the dead `dev` branch refs (#12, #18).
2. Fix cloud `reset()` (#2).
3. `crypto.randomUUID()` in `uid()` (#3).
4. `captureError` in `persist()` + `identify` on auth change (#4, first half).
5. Security headers + asset caching in `vercel.json` (#15).
6. `.gitignore`, `engines`, OG meta (#14, #13 part, #19).

**Next (a day or two):**
7. ESLint + Prettier + CI lint step (#11).
8. Route-level code splitting + async backend import (#5).
9. Error boundary (#16).
10. Extract the simulation layer from the store (#9).

**When cloud mode gets real users:**
11. Catalog-as-state instead of in-place mutation (#7).
12. Unread RPC (#6), jsonb shape validation (#17), scenes lookup table (#8).
