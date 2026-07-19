-- Record the production hotfix that allowed the Nashville seed to load.
alter type public.author_type add value if not exists 'player';

-- The auth trigger must only be invoked by Postgres. Supabase's managed roles
-- can receive direct function privileges independently of PUBLIC, so revoke
-- every browser-facing role explicitly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Phase 1: the authenticated account row is also the user's public Player
-- profile. No email address or auth metadata lives in this table.
alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists genres text[] not null default '{}',
  add column if not exists gear text[] not null default '{}',
  add column if not exists availability text[] not null default '{}',
  add column if not exists rate_min integer,
  add column if not exists rate_max integer,
  add column if not exists avatar_path text,
  add column if not exists reels jsonb not null default '[]'::jsonb;

alter table public.profiles
  add constraint profiles_name_length check (
    handle is null or char_length(btrim(name)) between 2 and 60
  ),
  add constraint profiles_handle_format check (
    handle is null or handle ~ '^[a-z0-9_]{3,30}$'
  ),
  add constraint profiles_neighborhood_length check (
    neighborhood is null or char_length(neighborhood) <= 80
  ),
  add constraint profiles_bio_length check (char_length(bio) <= 500),
  add constraint profiles_genres_limit check (cardinality(genres) <= 8),
  add constraint profiles_gear_limit check (cardinality(gear) <= 12),
  add constraint profiles_availability_limit check (cardinality(availability) <= 7),
  add constraint profiles_instruments_limit check (
    handle is null or cardinality(instruments) between 1 and 12
  ),
  add constraint profiles_rate_min_nonnegative check (rate_min is null or rate_min >= 0),
  add constraint profiles_rate_max_nonnegative check (rate_max is null or rate_max >= 0),
  add constraint profiles_rate_maximum check (
    (rate_min is null or rate_min <= 100000)
    and (rate_max is null or rate_max <= 100000)
  ),
  add constraint profiles_rate_order check (
    rate_min is null or rate_max is null or rate_max >= rate_min
  ),
  add constraint profiles_reels_array check (jsonb_typeof(reels) = 'array'),
  add constraint profiles_reels_limit check (jsonb_array_length(reels) <= 6),
  add constraint profiles_avatar_owner_path check (
    avatar_path is null or avatar_path like id::text || '/%'
  );

-- Completed profiles are discoverable. The owner-only select policy remains so
-- a newly-created account can read its row before onboarding chooses a handle.
create policy "completed profiles are public read" on public.profiles
  for select to anon, authenticated
  using (handle is not null);

grant select on public.profiles to anon;

-- Public avatar delivery with owner-only writes. Objects live at
-- avatars/<auth.uid()>/<unique filename>; a public bucket permits image GETs,
-- while these policies still gate every mutation.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "avatar owners can insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "avatar owners can select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "avatar owners can update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "avatar owners can delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Advisor fixes: cache auth.uid() once per statement in the three older
-- policies that predated the optimized convention.
drop policy "own openings: all" on public.openings;
create policy "own openings: all" on public.openings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "own projects: all" on public.user_projects;
create policy "own projects: all" on public.user_projects
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "own group chats: all" on public.group_conversations;
create policy "own group chats: all" on public.group_conversations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Advisor fixes: Postgres does not automatically index the referencing side
-- of foreign keys. These cover joins and ON DELETE checks without changing
-- query results.
create index if not exists band_members_musician_id_idx
  on public.band_members (musician_id);
create index if not exists band_open_slots_band_id_idx
  on public.band_open_slots (band_id);
create index if not exists bands_owner_id_idx
  on public.bands (owner_id);
create index if not exists bookings_musician_id_idx
  on public.bookings (musician_id);
create index if not exists conversations_musician_id_idx
  on public.conversations (musician_id);
create index if not exists feed_posts_gig_id_idx
  on public.feed_posts (gig_id);
create index if not exists gigs_band_id_idx
  on public.gigs (band_id);
create index if not exists gigs_venue_id_idx
  on public.gigs (venue_id);
create index if not exists messages_booking_id_idx
  on public.messages (booking_id);
create index if not exists reviews_musician_id_idx
  on public.reviews (musician_id);
create index if not exists videos_musician_id_idx
  on public.videos (musician_id);
