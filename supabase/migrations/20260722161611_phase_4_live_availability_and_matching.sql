-- Phase 4: expiring player availability and privacy-preserving nearby matching.
-- Exact coordinates are never exposed through profiles or the matching RPC.

create extension if not exists postgis with schema extensions;

create table public.player_availability (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scene text not null check (scene in ('austin', 'nashville')),
  instrument_ids public.instrument_id[] not null,
  available_from timestamptz not null default now(),
  available_until timestamptz not null,
  location extensions.geography(Point, 4326),
  updated_at timestamptz not null default now(),
  constraint player_availability_instruments_present
    check (cardinality(instrument_ids) between 1 and 12),
  constraint player_availability_window
    check (
      available_until > available_from
      and available_until <= available_from + interval '24 hours'
    )
);

alter table public.player_availability enable row level security;

create policy "players read own availability" on public.player_availability
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "players insert own availability" on public.player_availability
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "players update own availability" on public.player_availability
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "players delete own availability" on public.player_availability
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.player_availability from public, anon;
grant select, insert, update, delete on public.player_availability to authenticated;

create index player_availability_active_scene_idx
  on public.player_availability (scene, available_until)
  where available_until > available_from;

create index player_availability_location_gix
  on public.player_availability using gist (location);

create or replace function public.set_my_availability(
  p_available_until timestamptz,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_scene text;
  v_instruments public.instrument_id[];
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_available_until <= now() or p_available_until > now() + interval '24 hours' then
    raise exception 'Availability must end within the next 24 hours' using errcode = '22023';
  end if;
  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Latitude and longitude must be supplied together' using errcode = '22023';
  end if;
  if p_latitude is not null and (p_latitude not between -90 and 90 or p_longitude not between -180 and 180) then
    raise exception 'Invalid coordinates' using errcode = '22023';
  end if;

  select p.scene, p.instruments
    into v_scene, v_instruments
    from public.profiles p
    where p.id = v_user_id and p.handle is not null;

  if v_scene is null or cardinality(v_instruments) = 0 then
    raise exception 'Complete your player profile before going available' using errcode = '22023';
  end if;

  insert into public.player_availability (
    user_id, scene, instrument_ids, available_from, available_until, location, updated_at
  ) values (
    v_user_id,
    v_scene,
    v_instruments,
    now(),
    p_available_until,
    case when p_latitude is null then null else
      extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography
    end,
    now()
  )
  on conflict (user_id) do update set
    scene = excluded.scene,
    instrument_ids = excluded.instrument_ids,
    available_from = excluded.available_from,
    available_until = excluded.available_until,
    location = excluded.location,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.clear_my_availability()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.player_availability
  where user_id = (select auth.uid());
$$;

create or replace function public.find_available_players(
  p_instrument public.instrument_id,
  p_max_distance_miles numeric default 25
)
returns table (
  profile_id uuid,
  available_until timestamptz,
  distance_miles numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_scene text;
  v_location extensions.geography(Point, 4326);
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_max_distance_miles is null or p_max_distance_miles < 1 or p_max_distance_miles > 100 then
    raise exception 'Distance must be between 1 and 100 miles' using errcode = '22023';
  end if;

  select p.scene, a.location
    into v_scene, v_location
    from public.profiles p
    left join public.player_availability a on a.user_id = p.id
    where p.id = v_user_id;

  if v_scene is null then
    raise exception 'Complete your player profile before searching' using errcode = '22023';
  end if;

  return query
  select
    a.user_id,
    a.available_until,
    case when v_location is null or a.location is null then null else
      greatest(1, round((extensions.st_distance(v_location, a.location) / 1609.344)::numeric, 0))
    end
  from public.player_availability a
  join public.profiles p on p.id = a.user_id and p.handle is not null
  where a.user_id <> v_user_id
    and p.scene = v_scene
    and a.available_from <= now()
    and a.available_until > now()
    and p_instrument = any(p.instruments)
    and (
      v_location is null
      or a.location is null
      or extensions.st_dwithin(v_location, a.location, p_max_distance_miles * 1609.344)
    )
  order by
    case when v_location is null or a.location is null then 1 else 0 end,
    extensions.st_distance(v_location, a.location) nulls last,
    a.updated_at desc
  limit 50;
end;
$$;

create or replace function public.list_available_players()
returns table (
  profile_id uuid,
  available_until timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_scene text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select p.scene into v_scene
  from public.profiles p
  where p.id = v_user_id;

  if v_scene is null then
    raise exception 'Complete your player profile before browsing availability' using errcode = '22023';
  end if;

  return query
  select a.user_id, a.available_until
  from public.player_availability a
  join public.profiles p on p.id = a.user_id and p.handle is not null
  where p.scene = v_scene
    and a.available_from <= now()
    and a.available_until > now()
  order by a.updated_at desc;
end;
$$;

revoke execute on function public.set_my_availability(timestamptz, double precision, double precision) from public, anon;
revoke execute on function public.clear_my_availability() from public, anon;
revoke execute on function public.find_available_players(public.instrument_id, numeric) from public, anon;
revoke execute on function public.list_available_players() from public, anon;
grant execute on function public.set_my_availability(timestamptz, double precision, double precision) to authenticated;
grant execute on function public.clear_my_availability() to authenticated;
grant execute on function public.find_available_players(public.instrument_id, numeric) to authenticated;
grant execute on function public.list_available_players() to authenticated;
