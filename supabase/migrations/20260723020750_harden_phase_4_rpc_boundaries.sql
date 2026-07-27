-- Phase 4 advisor hardening.
--
-- The matching and SOS routines intentionally need privileged reads/writes
-- across owner-only tables. Keep that SECURITY DEFINER logic in the existing,
-- unexposed private schema and expose only SECURITY INVOKER wrappers through
-- PostgREST's public schema.

alter function public.find_available_players(public.instrument_id, numeric)
  set schema private;
alter function public.list_available_players()
  set schema private;
alter function public.create_sos_broadcast(public.instrument_id, text, text, numeric)
  set schema private;
alter function public.accept_sos_broadcast(uuid)
  set schema private;
alter function public.get_sos_broadcast(uuid)
  set schema private;

-- Authenticated callers can reach these functions only through a public
-- wrapper in the exposed Data API schema. Exact-function grants keep the
-- private schema from becoming a general-purpose execution surface.
grant usage on schema private to authenticated;

revoke execute on function private.find_available_players(public.instrument_id, numeric)
  from public, anon, authenticated;
revoke execute on function private.list_available_players()
  from public, anon, authenticated;
revoke execute on function private.create_sos_broadcast(public.instrument_id, text, text, numeric)
  from public, anon, authenticated;
revoke execute on function private.accept_sos_broadcast(uuid)
  from public, anon, authenticated;
revoke execute on function private.get_sos_broadcast(uuid)
  from public, anon, authenticated;

grant execute on function private.find_available_players(public.instrument_id, numeric)
  to authenticated;
grant execute on function private.list_available_players()
  to authenticated;
grant execute on function private.create_sos_broadcast(public.instrument_id, text, text, numeric)
  to authenticated;
grant execute on function private.accept_sos_broadcast(uuid)
  to authenticated;
grant execute on function private.get_sos_broadcast(uuid)
  to authenticated;

create function public.find_available_players(
  p_instrument public.instrument_id,
  p_max_distance_miles numeric default 25
)
returns table (
  profile_id uuid,
  available_until timestamptz,
  distance_miles numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.find_available_players(p_instrument, p_max_distance_miles);
$$;

create function public.list_available_players()
returns table (
  profile_id uuid,
  available_until timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.list_available_players();
$$;

create function public.create_sos_broadcast(
  p_instrument public.instrument_id,
  p_when_label text,
  p_opening_id text default null,
  p_max_distance_miles numeric default 25
)
returns table (
  broadcast_id uuid,
  recipient_count integer
)
language sql
volatile
security invoker
set search_path = ''
as $$
  select *
  from private.create_sos_broadcast(
    p_instrument,
    p_when_label,
    p_opening_id,
    p_max_distance_miles
  );
$$;

create function public.accept_sos_broadcast(p_broadcast_id uuid)
returns table (
  requester_id uuid,
  opening_id text
)
language sql
volatile
security invoker
set search_path = ''
as $$
  select * from private.accept_sos_broadcast(p_broadcast_id);
$$;

create function public.get_sos_broadcast(p_broadcast_id uuid)
returns table (
  broadcast_id uuid,
  requester_id uuid,
  requester_name text,
  instrument public.instrument_id,
  when_label text,
  status text,
  expires_at timestamptz,
  accepted_by uuid,
  can_accept boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_sos_broadcast(p_broadcast_id);
$$;

revoke execute on function public.find_available_players(public.instrument_id, numeric)
  from public, anon;
revoke execute on function public.list_available_players()
  from public, anon;
revoke execute on function public.create_sos_broadcast(public.instrument_id, text, text, numeric)
  from public, anon;
revoke execute on function public.accept_sos_broadcast(uuid)
  from public, anon;
revoke execute on function public.get_sos_broadcast(uuid)
  from public, anon;

grant execute on function public.find_available_players(public.instrument_id, numeric)
  to authenticated;
grant execute on function public.list_available_players()
  to authenticated;
grant execute on function public.create_sos_broadcast(public.instrument_id, text, text, numeric)
  to authenticated;
grant execute on function public.accept_sos_broadcast(uuid)
  to authenticated;
grant execute on function public.get_sos_broadcast(uuid)
  to authenticated;

-- Authenticated users previously evaluated two permissive SELECT policies on
-- profiles. Preserve both access paths in one policy and keep anon separate.
drop policy "own profile: select" on public.profiles;
drop policy "completed profiles are public read" on public.profiles;

create policy "profiles readable by owner or when completed" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or handle is not null
  );

create policy "completed profiles are public read" on public.profiles
  for select to anon
  using (handle is not null);
