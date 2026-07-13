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
