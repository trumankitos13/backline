# Scenes and gig scheduling design

## Goal

Launch Backline with two city-level scenes: Austin and Nashville. A person selects a scene during onboarding and can change it in Settings. Openings must capture a real gig date and time rather than an editable display label.

## Scene model

- Add a `scene` value of `austin` or `nashville` to profiles and catalog records.
- Existing profiles and catalog data migrate to `austin`, preserving all current records.
- The cloud backend loads only the signed-in person's selected scene. The demo backend follows the same behavior.
- Onboarding requires the scene choice. Settings persists a later choice through the same profile field.
- The interface has no neighborhood-level scene selector or filter. Neighborhood text may remain as descriptive venue or artist metadata.

## Catalog

- Keep one catalog schema, scoped by `scene`; do not create city-specific tables.
- Seed a dedicated fictional Nashville catalog of musicians, bands, venues, gigs, and feed posts. It is separate from Austin rather than a duplicated catalog.
- Seed data and generated static demo data remain aligned so cloud and demo modes expose the same two scenes.

## Opening schedule

- Replace the free-text “When’s the gig?” field with required date and time inputs.
- Offer Today and Tomorrow quick actions; the calendar input disallows past dates.
- Store the scheduled instant as a timezone-aware value, interpreted in each supported scene’s `America/Chicago` timezone. Austin and Nashville currently share that timezone.
- Keep the legacy `when_label` for existing opening rows. New openings persist the timestamp and derive their display label from it, avoiding loss of existing user data.

## Safety and verification

- Add an additive database migration: no table resets, drops, or destructive backfills.
- Add behavior tests before implementation for scene persistence/filtering and date/time submission.
- Restore the worktree dependency installation from the committed lockfile; `@sentry/react` and `posthog-js` are already declared for `src/lib/observability.ts`.
- Verify typecheck, production build, and relevant RLS/test coverage after the changes.
