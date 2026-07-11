-- Phase 0 close-out (docs/ROADMAP.md):
--
-- 1) Catalog parity — the initial schema predates the 4-object refactor.
--    Add the columns the app's types carry today (external links, embed-ready
--    reels, venue backline/hiring, event lineup/description/ticketing/source),
--    so cloud mode can serve the catalog instead of static data.ts.
--
-- 2) Cloud persistence for pickup projects & group chats — stored as whole
--    documents (jsonb) matching the app's upsert-whole-object seam. These are
--    single-owner records (your projects, your group chats), so owner-only
--    RLS mirrors the openings table.

-- ------------------------------------------------------- catalog parity
alter table public.musicians add column if not exists links jsonb;
alter table public.musicians add column if not exists reels jsonb;

alter table public.bands add column if not exists links jsonb;

alter table public.venues add column if not exists backline text[];
alter table public.venues add column if not exists hiring jsonb;
alter table public.venues add column if not exists links jsonb;

alter table public.gigs add column if not exists band_ids text[];
alter table public.gigs add column if not exists player_ids text[];
alter table public.gigs add column if not exists description text;
alter table public.gigs add column if not exists ticket_url text;
alter table public.gigs add column if not exists sub_needed jsonb;
alter table public.gigs add column if not exists links jsonb;
alter table public.gigs add column if not exists source text;
alter table public.gigs add column if not exists external_url text;

-- bookings can fill a posted opening (holding locks the seat)
alter table public.bookings add column if not exists opening_id text;

-- --------------------------------------- projects & group chats (cloud)
create table public.user_projects (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
create index user_projects_user_id_idx on public.user_projects (user_id, updated_at desc);

create table public.group_conversations (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
create index group_conversations_user_id_idx on public.group_conversations (user_id, updated_at desc);

alter table public.user_projects enable row level security;
alter table public.group_conversations enable row level security;

create policy "own projects: all" on public.user_projects
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own group chats: all" on public.group_conversations
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on
  public.user_projects, public.group_conversations
  to authenticated;
