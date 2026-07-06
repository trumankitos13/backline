-- Backline — initial schema.
-- Mirrors src/lib/types.ts. Two halves:
--   1. Catalog  (musicians, bands, venues, gigs, feed) — read-mostly content.
--   2. User data (profiles, follows, conversations, messages, bookings, likes)
--      — per-user, gated by RLS in the companion policies migration.
-- Text primary keys are used for catalog rows so the existing mock ids
-- (e.g. "m-nadia", "b-moontower", "v-armadillo") survive the migration.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.instrument_id as enum (
  'guitar', 'bass', 'drums', 'keys', 'vocals', 'sax', 'trumpet',
  'violin', 'pedal-steel', 'dj', 'sound-tech', 'lighting-tech'
);
create type public.skill_level    as enum ('pro', 'semi-pro', 'hobbyist');
create type public.post_kind      as enum ('gig', 'need-sub', 'video', 'open-mic', 'news');
create type public.booking_status as enum ('offer', 'accepted', 'paid', 'declined');
create type public.author_type    as enum ('band', 'venue', 'musician');

-- ===========================================================================
-- CATALOG (public read, no public writes — seeded via service role / SQL editor)
-- ===========================================================================

create table public.musicians (
  id              text primary key,
  name            text not null,
  handle          text not null unique,
  bio             text default '',
  genres          text[] not null default '{}',
  gear            text[] not null default '{}',
  neighborhood    text,
  distance_miles  numeric,
  rate_min        integer,
  rate_max        integer,
  available_tonight boolean not null default false,
  availability    text[] not null default '{}',
  response_mins   integer,
  gigs_played     integer not null default 0,
  verified        boolean not null default false,
  seed            integer,
  created_at      timestamptz not null default now()
);

create table public.musician_instruments (
  musician_id text not null references public.musicians(id) on delete cascade,
  instrument  public.instrument_id not null,
  level       public.skill_level not null,
  years       integer not null default 0,
  primary key (musician_id, instrument)
);

create table public.videos (
  id           text primary key,
  musician_id  text not null references public.musicians(id) on delete cascade,
  title        text not null,
  duration_sec integer not null default 0,
  plays        integer not null default 0,
  likes        integer not null default 0,
  palette_from text not null,
  palette_to   text not null,
  tags         text[] not null default '{}'
);

create table public.reviews (
  id           text primary key,
  musician_id  text not null references public.musicians(id) on delete cascade,
  author       text not null,
  role         text,
  rating       integer not null check (rating between 1 and 5),
  body         text,
  review_date  text
);

create table public.bands (
  id           text primary key,
  name         text not null,
  genres       text[] not null default '{}',
  bio          text default '',
  neighborhood text,
  followers    integer not null default 0,
  seed         integer
);

create table public.band_members (
  band_id     text not null references public.bands(id) on delete cascade,
  musician_id text not null references public.musicians(id) on delete cascade,
  role        text,
  primary key (band_id, musician_id)
);

create table public.band_open_slots (
  id         bigint generated always as identity primary key,
  band_id    text not null references public.bands(id) on delete cascade,
  instrument public.instrument_id not null,
  note       text
);

create table public.venues (
  id           text primary key,
  name         text not null,
  neighborhood text,
  capacity     integer,
  followers    integer not null default 0,
  vibe         text,
  seed         integer
);

create table public.gigs (
  id        text primary key,
  title     text not null,
  venue_id  text references public.venues(id) on delete set null,
  band_id   text references public.bands(id) on delete set null,
  date      text,
  time      text,
  payout    integer,
  ticket    text
);

create table public.feed_posts (
  id             text primary key,
  kind           public.post_kind not null,
  author_type    public.author_type not null,
  author_id      text not null,
  text           text,
  ago            text,
  likes          integer not null default 0,
  comments       integer not null default 0,
  gig_id         text references public.gigs(id) on delete set null,
  -- kind = 'video': embedded VideoClip + whose reel it is
  video          jsonb,
  video_owner_id text,
  -- kind = 'need-sub': { instrument, date, payout }
  sub_for        jsonb,
  created_at     timestamptz not null default now()
);

-- ===========================================================================
-- USER DATA (per-user, owner-gated by RLS)
-- ===========================================================================

-- One row per authenticated user, mirroring types.ts CurrentUser.
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  name             text,
  handle           text unique,
  neighborhood     text,
  available_tonight boolean not null default false,
  instruments      public.instrument_id[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Followed band/venue ids (catalog uses text ids).
create table public.follows (
  user_id    uuid not null references auth.users(id) on delete cascade,
  target_id  text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id)
);

create table public.bookings (
  -- client-generated id (e.g. "bk-...") so the offer can be referenced from a
  -- chat message without a server round-trip.
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  musician_id text not null references public.musicians(id),
  gig_title  text not null,
  venue_name text,
  date       text,
  time       text,
  amount     integer not null default 0,
  status     public.booking_status not null default 'offer',
  created_at timestamptz not null default now()
);

create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  musician_id text not null references public.musicians(id),
  unread      integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, musician_id)
);

create table public.messages (
  id              text primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  -- 'user' = the account holder ("me"), 'musician' = the other side ("them")
  sender          text not null check (sender in ('user', 'musician')),
  body            text,
  booking_id      text references public.bookings(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table public.liked_posts (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id text not null,
  primary key (user_id, post_id)
);

create table public.responded_sub_posts (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id text not null,
  primary key (user_id, post_id)
);

-- Helpful indexes for the common per-user lookups.
create index on public.bookings (user_id);
create index on public.conversations (user_id);
create index on public.messages (conversation_id);
create index on public.follows (user_id);

-- ---------------------------------------------------------------------------
-- Auth → profile: create a profile row automatically on sign-up.
-- SECURITY DEFINER with an empty search_path (schema-qualified refs only) is
-- the standard, safe Supabase pattern; execute is revoked from callers so the
-- function is reachable only via the auth.users trigger.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Data API grants. Catalog is world-readable; user tables are reachable only
-- by signed-in users. RLS (companion migration) gates rows on top of these.
-- ---------------------------------------------------------------------------
grant select on
  public.musicians, public.musician_instruments, public.videos, public.reviews,
  public.bands, public.band_members, public.band_open_slots, public.venues,
  public.gigs, public.feed_posts
  to anon, authenticated;

grant select, insert, update, delete on
  public.profiles, public.follows, public.bookings, public.conversations,
  public.messages, public.liked_posts, public.responded_sub_posts
  to authenticated;
grant usage, select on all sequences in schema public to authenticated;
