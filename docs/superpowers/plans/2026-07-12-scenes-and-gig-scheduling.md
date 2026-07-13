# Scenes and Gig Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let people choose and switch between Austin and Nashville scenes, ship a dedicated Nashville catalog, and require a scheduled date and time for every newly posted opening.

**Architecture:** Store the selected scene on `profiles` and scope every catalog root record by scene. Resolve dependent catalog rows through scene-scoped roots in the backend. Store opening schedules as `timestamptz` while retaining `when_label` so existing opening rows stay readable.

**Tech Stack:** React 19, TypeScript, Vite, Supabase/Postgres, Vitest, localStorage demo backend.

## Global Constraints

- Supported scene IDs are exactly `austin` and `nashville`.
- Existing profile and catalog rows migrate to `austin`; no destructive schema/data operation is permitted.
- Austin and Nashville opening dates are interpreted in `America/Chicago`.
- Openings must have a date no earlier than today and a required local time.
- `when_label` remains readable for legacy opening rows; new writes must include `gig_at`.
- No neighborhood-level scene selector or catalog filter is introduced.

---

### Task 1: Restore the verified local toolchain and add a test runner

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/scheduling.test.ts`

**Interfaces:**
- Produces: `npm run test` invoking Vitest once, suitable for focused red/green runs.

- [ ] **Step 1: Restore dependencies from the committed lockfile**

Run:

```bash
npm ci
npm run typecheck
```

Expected: typecheck exits 0; `@sentry/react` and `posthog-js` resolve from the existing lockfile.

- [ ] **Step 2: Add Vitest and its script**

Run:

```bash
npm install --save-dev vitest
```

Add the script:

```json
"test": "vitest run"
```

- [ ] **Step 3: Create the first failing schedule test**

```ts
import { describe, expect, it } from "vitest";
import { scheduleOpening } from "./scheduling";

describe("scheduleOpening", () => {
  it("turns a Central date and time into an ISO instant and display label", () => {
    expect(scheduleOpening("2026-07-14", "19:30")).toEqual({
      gigAt: "2026-07-15T00:30:00.000Z",
      label: "Tue, Jul 14 · 7:30 PM",
    });
  });
});
```

- [ ] **Step 4: Run the focused test and confirm the expected red failure**

Run: `npm test -- src/lib/scheduling.test.ts`

Expected: FAIL because `./scheduling` does not exist.

- [ ] **Step 5: Commit the test-tooling setup**

```bash
git add package.json package-lock.json src/lib/scheduling.test.ts
git commit -m "test: add scheduling test harness"
```

### Task 2: Define shared scene and schedule types/utilities

**Files:**
- Create: `src/lib/scenes.ts`
- Create: `src/lib/scheduling.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/scheduling.test.ts`

**Interfaces:**
- Produces: `SceneId`, `SCENES`, `scheduleOpening(date, time)`, and `isSelectableGigDate(date, today)`.
- Consumes: ISO date (`YYYY-MM-DD`) and 24-hour time (`HH:mm`) strings from opening forms.

- [ ] **Step 1: Add failing edge-case tests**

```ts
it("rejects a past calendar day", () => {
  expect(isSelectableGigDate("2026-07-11", "2026-07-12")).toBe(false);
});

it("keeps today selectable", () => {
  expect(isSelectableGigDate("2026-07-12", "2026-07-12")).toBe(true);
});
```

- [ ] **Step 2: Verify red**

Run: `npm test -- src/lib/scheduling.test.ts`

Expected: FAIL because `isSelectableGigDate` is not exported.

- [ ] **Step 3: Implement the minimum shared contracts**

```ts
export type SceneId = "austin" | "nashville";

export const SCENES = [
  { id: "austin", label: "Austin, TX", timezone: "America/Chicago" },
  { id: "nashville", label: "Nashville, TN", timezone: "America/Chicago" },
] as const;

export function isSelectableGigDate(date: string, today: string) {
  return date >= today;
}
```

Implement `scheduleOpening` with `Intl.DateTimeFormat(...).formatToParts()`/an offset-safe conversion rather than parsing a browser-local date string; return `{ gigAt, label }`.

Extend `CurrentUser` with `scene: SceneId` and `Opening` with `gigAt?: string` while retaining `when` for legacy display.

- [ ] **Step 4: Verify green**

Run: `npm test -- src/lib/scheduling.test.ts && npm run typecheck`

Expected: PASS and exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scenes.ts src/lib/scheduling.ts src/lib/scheduling.test.ts src/lib/types.ts
git commit -m "feat: add scene and opening schedule contracts"
```

### Task 3: Additive Supabase schema and two-scene catalog seed

**Files:**
- Create: `supabase/migrations/20260712120000_scenes_and_opening_schedule.sql` (create it with `npx supabase migration new scenes_and_opening_schedule`; use the CLI-generated timestamp if it differs)
- Modify: `src/lib/data.ts`
- Modify: `scripts/gen-seed.ts`
- Modify: `supabase/seed.sql`
- Modify: `supabase/tests/rls.test.mjs`

**Interfaces:**
- Produces: `profiles.scene`, `openings.gig_at`, and `scene` columns on `musicians`, `bands`, `venues`, `gigs`, and `feed_posts`.
- Consumes: `SceneId` values and app catalog IDs; all Nashville dependent rows reference Nashville roots.

- [ ] **Step 1: Write a failing migration assertion in the RLS test suite**

Add a service-role query expectation after catalog seed lookup:

```js
const { data: scenes, error: scenesErr } = await admin
  .from("musicians")
  .select("scene")
  .in("scene", ["austin", "nashville"]);
check("catalog contains Austin and Nashville", !scenesErr && new Set(scenes.map((row) => row.scene)).size === 2);
```

- [ ] **Step 2: Verify red against the current schema**

Run: `node supabase/tests/rls.test.mjs` with the disposable project's already-configured `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` shell variables.

Expected: FAIL because `scene` does not exist until the new migration/seed run.

- [ ] **Step 3: Create the migration with additive defaults/backfills**

```sql
alter table public.profiles add column if not exists scene text not null default 'austin'
  check (scene in ('austin', 'nashville'));
alter table public.openings add column if not exists gig_at timestamptz;

alter table public.musicians add column if not exists scene text not null default 'austin'
  check (scene in ('austin', 'nashville'));
alter table public.bands add column if not exists scene text not null default 'austin'
  check (scene in ('austin', 'nashville'));
alter table public.venues add column if not exists scene text not null default 'austin'
  check (scene in ('austin', 'nashville'));
alter table public.gigs add column if not exists scene text not null default 'austin'
  check (scene in ('austin', 'nashville'));
alter table public.feed_posts add column if not exists scene text not null default 'austin'
  check (scene in ('austin', 'nashville'));

create index if not exists musicians_scene_idx on public.musicians(scene);
create index if not exists bands_scene_idx on public.bands(scene);
create index if not exists venues_scene_idx on public.venues(scene);
create index if not exists gigs_scene_idx on public.gigs(scene);
create index if not exists feed_posts_scene_idx on public.feed_posts(scene);
```

Generate the timestamp with `npx supabase migration new scenes_and_opening_schedule`, then replace the generated body with this SQL. Do not backfill `gig_at`: legacy `when_label` values are not reliably parseable.

- [ ] **Step 4: Extend static catalog data and generator**

Give every catalog root a `scene` property. Add Nashville-only IDs such as `m-nash-*`, `b-nash-*`, `v-nash-*`, `g-nash-*`, and `p-nash-*`; include Nashville musicians, bands, venues, gigs, and feed entries with internally consistent foreign keys. Extend every `insert` statement in `scripts/gen-seed.ts` to include `scene`, then regenerate:

```bash
node scripts/gen-seed.ts > supabase/seed.sql
```

- [ ] **Step 5: Verify green on a disposable project**

Run migration and seed, then run: `node supabase/tests/rls.test.mjs`

Expected: all existing RLS checks pass and the new two-scene assertion passes.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations supabase/seed.sql supabase/tests/rls.test.mjs src/lib/data.ts scripts/gen-seed.ts
git commit -m "feat: add Austin and Nashville catalog scenes"
```

### Task 4: Persist profile scene, scope catalog loading, and write opening timestamps

**Files:**
- Modify: `src/lib/backend/types.ts`
- Modify: `src/lib/backend/local.ts`
- Modify: `src/lib/backend/supabase.ts`
- Modify: `src/lib/store.tsx`
- Test: `src/lib/scheduling.test.ts`

**Interfaces:**
- Consumes: `CurrentUser.scene` and `Opening.gigAt`.
- Produces: catalog rows filtered by the selected profile scene, and new opening rows containing both `gig_at` and `when_label`.

- [ ] **Step 1: Add a failing backend-mapping test**

Add a test for the public catalog mapper extracted from `supabase.ts`:

```ts
it("keeps only records belonging to the selected scene", () => {
  expect(filterCatalogRoots([{ id: "a", scene: "austin" }, { id: "n", scene: "nashville" }], "nashville"))
    .toEqual([{ id: "n", scene: "nashville" }]);
});
```

- [ ] **Step 2: Verify red**

Run: `npm test -- src/lib/scheduling.test.ts`

Expected: FAIL because `filterCatalogRoots` is not exported.

- [ ] **Step 3: Implement the persistence path**

Update `saveUser` and `updateUser` to map `profile.scene` to `profiles.scene`. Map the column back into `CurrentUser` on load, defaulting absent legacy values to `"austin"`.

Make `loadCatalog(scene: SceneId)` query root catalog tables with `.eq("scene", scene)`. Build dependent maps only from those roots and select dependent rows using their scoped IDs, so Nashville cannot show Austin reviews, videos, members, slots, or feed authors.

Change the opening insert mapping to:

```ts
gig_at: opening.gigAt ?? null,
when_label: opening.when,
```

and map `gig_at` back to `Opening.gigAt` during load. Keep legacy rows renderable through `when_label`.

- [ ] **Step 4: Verify green**

Run: `npm test -- src/lib/scheduling.test.ts && npm run typecheck`

Expected: PASS and exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/backend/types.ts src/lib/backend/local.ts src/lib/backend/supabase.ts src/lib/store.tsx src/lib/scheduling.test.ts
git commit -m "feat: persist scenes and opening schedules"
```

### Task 5: Onboarding, settings, and scheduled-opening UI

**Files:**
- Modify: `src/components/welcome/SignupSteps.tsx`
- Modify: `src/pages/MyProfile.tsx`
- Modify: `src/components/post/PostFlow.tsx`
- Modify: `src/components/post/AssembleFlow.tsx`
- Modify: `src/pages/Feed.tsx`
- Modify: `src/pages/Discover.tsx`
- Modify: `src/components/shell.tsx`

**Interfaces:**
- Consumes: `SCENES`, `scheduleOpening`, `CurrentUser.scene`, and `Opening.gigAt`.
- Produces: scene selection at onboarding/settings and date/time data passed to `api.postOpening`/`api.createProject`.

- [ ] **Step 1: Add failing component behavior tests**

```tsx
it("sets tomorrow when the quick action is pressed", async () => {
  render(<PostFlow open onClose={() => {}} />);
  await userEvent.click(screen.getByRole("button", { name: "Tomorrow" }));
  expect(screen.getByLabelText("Gig date")).toHaveValue(tomorrowIso());
});

it("does not enable posting until date, time, role, and fee are present", () => {
  render(<PostFlow open onClose={() => {}} />);
  expect(screen.getByRole("button", { name: /Pick an instrument/i })).toBeDisabled();
});
```

Install `@testing-library/react`, `@testing-library/user-event`, and `jsdom` as dev dependencies, configure `vitest.config.ts` with `environment: "jsdom"`, and provide the existing app context through a small test wrapper.

- [ ] **Step 2: Verify red**

Run: `npm test -- src/components/post/PostFlow.test.tsx`

Expected: FAIL because the current form exposes only a text input and no `Gig date` control.

- [ ] **Step 3: Implement the UI and copy**

Replace onboarding’s Austin-only `NEIGHBORHOODS` chooser with an Austin/Nashville scene card/select and include `scene` in `api.setUser`.

Add a compact Settings card in `MyProfile` with the current scene and an accessible select that calls:

```ts
api.updateUser({ scene: nextScene as SceneId });
```

In both `PostFlow` and `AssembleFlow`, replace the free-text `when` input with:

```tsx
<input aria-label="Gig date" type="date" min={todayIso()} value={date} onChange={(event) => setDate(event.currentTarget.value)} />
<input aria-label="Gig time" type="time" value={time} onChange={(event) => setTime(event.currentTarget.value)} />
```

Set date with Today/Tomorrow chips, require role, fee, date, and time before posting, and call `scheduleOpening(date, time)` to populate `{ when: label, gigAt }`. Pass the same schedule data through `createProject` so its generated openings are consistent.

Replace hard-coded `Austin, TX`/Austin scene copy in Feed, Discover, and shell with `SCENES.find(...state.user.scene).label`.

- [ ] **Step 4: Verify green and perform the browser smoke test**

Run:

```bash
npm test -- src/components/post/PostFlow.test.tsx
npm run typecheck
npm run build
```

Expected: all commands exit 0.

In the browser, complete onboarding for Nashville; switch to Austin in Settings; verify each catalog view changes city; post an opening with Tomorrow and 7:30 PM; reload; verify the saved opening has the same scheduled label.

- [ ] **Step 5: Commit**

```bash
git add src/components/welcome/SignupSteps.tsx src/pages/MyProfile.tsx src/components/post/PostFlow.tsx src/components/post/AssembleFlow.tsx src/pages/Feed.tsx src/pages/Discover.tsx src/components/shell.tsx package.json package-lock.json vitest.config.ts src/components/post/PostFlow.test.tsx
git commit -m "feat: choose scenes and schedule openings"
```

### Task 6: Final verification and deployment notes

**Files:**
- Modify: `DEPLOYMENT.md`
- Modify: `README.md`

**Interfaces:**
- Produces: accurate cloud migration, seed, and production verification instructions.

- [ ] **Step 1: Add the release checklist**

Document these exact production actions:

```bash
npx supabase db push
# Run the regenerated supabase/seed.sql in the Supabase SQL Editor.
npm test
npm run build
```

State that `db push` is additive and does not reset user data, while the catalog seed creates Nashville catalog records.

- [ ] **Step 2: Run the complete verification suite**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all exit 0. Run `node supabase/tests/rls.test.mjs` only against the disposable test project, never production.

- [ ] **Step 3: Commit**

```bash
git add DEPLOYMENT.md README.md
git commit -m "docs: document two-scene rollout"
```
