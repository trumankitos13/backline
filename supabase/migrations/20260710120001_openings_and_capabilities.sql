-- Openings + the capabilities model (docs/V1_SPEC.md → "Roles & capabilities").
--
-- 1) `openings` — the unified "someone needs a player" record the app now
--    writes (one shape behind a band's open seat, a venue's hire, an event's
--    sub slot). Posted "acting as" a context (player/band/venue).
--
--    RLS is OWNER-ONLY for now, deliberately: the fee column is on this table
--    and fees are private (spec: amounts never appear on a public surface).
--    When openings become browsable by other users, expose a PUBLIC VIEW that
--    excludes `fee` — do not loosen this table's policies.
--
-- 2) Capabilities columns on the catalog — who may post/hire *as* a band or
--    venue. Inert until catalog reads move to Postgres (Phase 0 remainder),
--    but keeps the schema in lockstep with src/lib/types.ts.

-- --------------------------------------------------------------- openings
create table public.openings (
  id             text primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  instrument     text not null,
  posted_by_kind text not null check (posted_by_kind in ('player', 'band', 'venue')),
  posted_by_id   text not null,
  event_id       text,
  when_label     text not null,
  fee            integer not null check (fee >= 0),
  note           text,
  urgent         boolean not null default false,
  status         text not null default 'open' check (status in ('open', 'filled', 'closed')),
  created_at     timestamptz not null default now()
);

create index openings_user_id_idx on public.openings (user_id, created_at desc);

alter table public.openings enable row level security;

create policy "own openings: all" on public.openings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.openings to authenticated;

-- --------------------------------------------- capabilities on the catalog
-- Band admins can post/hire as the band; `performing` separates players in a
-- seat from organizers/writers. `kind`/`owner_id` support pickup projects.
alter table public.band_members add column if not exists admin boolean not null default false;
alter table public.band_members add column if not exists performing boolean;

alter table public.bands add column if not exists kind text check (kind in ('standing', 'project'));
alter table public.bands add column if not exists owner_id text references public.musicians(id);

-- Venue managers can post/hire as the venue.
alter table public.venues add column if not exists managers text[] not null default '{}';
