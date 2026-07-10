# RLS isolation tests

`rls.test.mjs` proves the Row-Level-Security policies actually isolate user data:
it provisions two throwaway users and asserts that user A can never read, mutate,
or forge user B's rows — while catalog stays publicly readable but not writable.

**⚠️ Point this only at a disposable project** (local or a dedicated test
project). It creates and deletes users. Never run it against production.

## Run against a local Supabase (recommended)

Requires Docker + the Supabase CLI (already a dev dependency).

```bash
npx supabase start                 # boots local Postgres + auth + applies migrations
npx supabase db reset              # applies migrations + seed.sql (catalog data)

# grab the local keys printed by `supabase start` (or `supabase status`)
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_ANON_KEY=<anon key from status>
export SUPABASE_SERVICE_ROLE_KEY=<service_role key from status>

node supabase/tests/rls.test.mjs
```

## Run against a cloud test project

```bash
export SUPABASE_URL=https://<test-ref>.supabase.co
export SUPABASE_ANON_KEY=<anon>
export SUPABASE_SERVICE_ROLE_KEY=<service_role>
node supabase/tests/rls.test.mjs
```

The catalog must be seeded first (the tests need a real `musicians.id` for
FK-constrained inserts): `supabase db reset` locally, or run `supabase/seed.sql`
in the SQL editor for a cloud project.

## In CI

`.github/workflows/ci.yml` runs these on pushes **only when** the repo secrets
`SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, and
`SUPABASE_TEST_SERVICE_ROLE_KEY` are set (pointing at a disposable test project).
Without them, the step logs a skip and passes — so forks and unconfigured repos
stay green.

## What it checks

- anon **can** read catalog, **cannot** write it
- for `profiles`, `follows`, `bookings`, `conversations`, `messages`,
  `liked_posts`, `responded_sub_posts`: user B sees **0** of user A's rows
- B cannot UPDATE or DELETE A's booking (RLS filters it out)
- B cannot INSERT a row owned by A (WITH CHECK)
- positive control: B **can** read its own profile
