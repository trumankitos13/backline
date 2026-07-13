-- Scene ownership for user-created openings. Existing records predate scenes
-- and therefore remain visible in Austin, preserving their prior behavior.
alter table public.openings
  add column if not exists scene text not null default 'austin'
  check (scene in ('austin', 'nashville'));

create index if not exists openings_user_scene_idx
  on public.openings (user_id, scene, created_at desc);
