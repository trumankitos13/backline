# Phase 4 deployment — live availability and matching

The Phase 4 foundation is additive. It does not reset profiles, bookings, or
catalog data.

## Deploy

```bash
npx supabase db push
```

Migration `20260722161611_phase_4_live_availability_and_matching.sql` enables
PostGIS, creates the private `player_availability` table, and installs the
authenticated availability/matching RPCs.

The two following migrations add notification kinds and the durable SOS
broadcast/recipient tables. They must remain separate and in timestamp order
because PostgreSQL enum values must commit before another migration uses them.

If the migration role cannot enable PostGIS, enable **Database → Extensions →
postgis** in the Supabase dashboard, then rerun `npx supabase db push`.

## Privacy and behavior

- Exact latitude/longitude is optional and stored only in the RLS-protected
  availability row. It is never returned by a public view or matching RPC.
- Matchers receive a profile id, expiry, and a distance rounded to the nearest mile
  place. When either player has not shared location, distance is omitted and
  the result is ranked as a scene-wide match.
- Austin and Nashville never cross-match. The authenticated requester's current
  profile scene controls every match.
- Availability expires in Postgres even if the client never returns to turn it
  off. The legacy `profiles.available_tonight` column is no longer used for
  account discovery.

## Verification (disposable project only)

The RLS suite creates and deletes test users, so never run it against production.

```bash
SUPABASE_URL=... \
SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... \
node supabase/tests/rls.test.mjs
```

The Phase 4 assertions prove that another signed-in user and anon cannot read
raw availability coordinates, while an authenticated same-scene player can use
the safe matcher. They also exercise SOS recipient isolation and atomic
first-accept-wins behavior.
