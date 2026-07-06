-- Backline — Row Level Security.
-- RLS is enabled on EVERY table in the exposed `public` schema (required in
-- Supabase — an exposed table with the grants from the schema migration but no
-- RLS would be wide open). Two shapes:
--   * Catalog: readable by everyone (anon + authenticated), never writable
--     through the Data API. Seed via the SQL editor / service role, which
--     bypass RLS.
--   * User data: every row is owned by an auth user; policies use
--     `(select auth.uid())` (wrapped in a select for planner caching) and
--     scope reads AND writes to the owner. UPDATE policies carry both USING
--     and WITH CHECK so a row's owner can't be reassigned.

-- ---------------------------------------------------------------------------
-- Catalog: enable RLS, allow read to anon + authenticated, no write policies.
-- ---------------------------------------------------------------------------
alter table public.musicians            enable row level security;
alter table public.musician_instruments enable row level security;
alter table public.videos               enable row level security;
alter table public.reviews              enable row level security;
alter table public.bands                enable row level security;
alter table public.band_members         enable row level security;
alter table public.band_open_slots      enable row level security;
alter table public.venues               enable row level security;
alter table public.gigs                 enable row level security;
alter table public.feed_posts           enable row level security;

create policy "catalog is public read" on public.musicians
  for select to anon, authenticated using (true);
create policy "catalog is public read" on public.musician_instruments
  for select to anon, authenticated using (true);
create policy "catalog is public read" on public.videos
  for select to anon, authenticated using (true);
create policy "catalog is public read" on public.reviews
  for select to anon, authenticated using (true);
create policy "catalog is public read" on public.bands
  for select to anon, authenticated using (true);
create policy "catalog is public read" on public.band_members
  for select to anon, authenticated using (true);
create policy "catalog is public read" on public.band_open_slots
  for select to anon, authenticated using (true);
create policy "catalog is public read" on public.venues
  for select to anon, authenticated using (true);
create policy "catalog is public read" on public.gigs
  for select to anon, authenticated using (true);
create policy "catalog is public read" on public.feed_posts
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- profiles — a user reads and edits only their own row.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "own profile: select" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "own profile: insert" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "own profile: update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- follows / liked_posts / responded_sub_posts / bookings / conversations —
-- owner-scoped on user_id for all four operations.
-- ---------------------------------------------------------------------------
alter table public.follows enable row level security;
create policy "own follows: all" on public.follows
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.liked_posts enable row level security;
create policy "own likes: all" on public.liked_posts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.responded_sub_posts enable row level security;
create policy "own sub-responses: all" on public.responded_sub_posts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.bookings enable row level security;
create policy "own bookings: all" on public.bookings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.conversations enable row level security;
create policy "own conversations: all" on public.conversations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- messages — no user_id column; ownership is inherited from the parent
-- conversation. Every operation checks that the conversation belongs to the
-- caller.
-- ---------------------------------------------------------------------------
alter table public.messages enable row level security;
create policy "messages in own conversations: all" on public.messages
  for all to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
