create table public.sos_broadcasts (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  scene text not null check (scene in ('austin', 'nashville')),
  instrument public.instrument_id not null,
  when_label text not null,
  opening_id text references public.openings(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'matched', 'expired', 'cancelled')),
  accepted_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  created_at timestamptz not null default now(),
  constraint sos_when_label_length check (char_length(btrim(when_label)) between 1 and 80),
  constraint sos_expiry_window check (expires_at > created_at and expires_at <= created_at + interval '1 hour')
);

create table public.sos_recipients (
  broadcast_id uuid not null references public.sos_broadcasts(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  distance_miles numeric(5,1),
  status text not null default 'notified' check (status in ('notified', 'accepted', 'missed', 'declined')),
  notified_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (broadcast_id, player_id),
  constraint sos_distance_safe check (distance_miles is null or distance_miles between 0 and 100)
);

create index sos_broadcasts_requester_created_idx
  on public.sos_broadcasts (requester_id, created_at desc);
create unique index sos_broadcasts_one_open_per_requester_idx
  on public.sos_broadcasts (requester_id)
  where status = 'open';
create index sos_recipients_player_notified_idx
  on public.sos_recipients (player_id, notified_at desc);

alter table public.sos_broadcasts enable row level security;
alter table public.sos_recipients enable row level security;

create policy "sos requesters read broadcasts" on public.sos_broadcasts
  for select to authenticated
  using (requester_id = (select auth.uid()));

create policy "sos participants read recipients" on public.sos_recipients
  for select to authenticated
  using (
    player_id = (select auth.uid())
    or exists (
      select 1 from public.sos_broadcasts b
      where b.id = broadcast_id and b.requester_id = (select auth.uid())
    )
  );

revoke all on public.sos_broadcasts from public, anon;
revoke all on public.sos_recipients from public, anon;
grant select on public.sos_broadcasts, public.sos_recipients to authenticated;

create or replace function public.create_sos_broadcast(
  p_instrument public.instrument_id,
  p_when_label text,
  p_opening_id text default null,
  p_max_distance_miles numeric default 25
)
returns table (broadcast_id uuid, recipient_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requester uuid := (select auth.uid());
  v_scene text;
  v_location extensions.geography(Point, 4326);
  v_broadcast_id uuid;
  v_count integer;
begin
  if v_requester is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_when_label, ''))) not between 1 and 80 then
    raise exception 'A valid gig time is required' using errcode = '22023';
  end if;
  if p_max_distance_miles is null or p_max_distance_miles < 1 or p_max_distance_miles > 100 then
    raise exception 'Distance must be between 1 and 100 miles' using errcode = '22023';
  end if;

  select p.scene, a.location into v_scene, v_location
  from public.profiles p
  left join public.player_availability a on a.user_id = p.id
  where p.id = v_requester and p.handle is not null;

  if v_scene is null then
    raise exception 'Complete your player profile before broadcasting' using errcode = '22023';
  end if;

  update public.sos_broadcasts
  set status = 'expired'
  where requester_id = v_requester and status = 'open' and expires_at <= now();

  if exists (
    select 1 from public.sos_broadcasts
    where requester_id = v_requester and status = 'open' and expires_at > now()
  ) then
    raise exception 'You already have a live SOS' using errcode = '22023';
  end if;

  if p_opening_id is not null and not exists (
    select 1 from public.openings o
    where o.id = p_opening_id
      and o.user_id = v_requester
      and o.status = 'open'
      and o.instrument = p_instrument::text
      and o.scene = v_scene
  ) then
    raise exception 'Opening is not eligible for this SOS' using errcode = '22023';
  end if;

  insert into public.sos_broadcasts (
    requester_id, scene, instrument, when_label, opening_id
  ) values (
    v_requester, v_scene, p_instrument, btrim(p_when_label), p_opening_id
  ) returning id into v_broadcast_id;

  insert into public.sos_recipients (broadcast_id, player_id, distance_miles)
  select
    v_broadcast_id,
    a.user_id,
    case when v_location is null or a.location is null then null else
      greatest(1, round((extensions.st_distance(v_location, a.location) / 1609.344)::numeric, 0))
    end
  from public.player_availability a
  join public.profiles p on p.id = a.user_id and p.handle is not null
  where a.user_id <> v_requester
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

  get diagnostics v_count = row_count;

  insert into public.notifications (
    recipient_id, actor_id, kind, urgency, dedupe_key, title, body, href, payload
  )
  select
    r.player_id,
    v_requester,
    'sos_request',
    'high',
    'sos:' || v_broadcast_id::text || ':' || r.player_id::text,
    'Backline SOS: ' || p_instrument::text || ' needed',
    left(btrim(p_when_label), 280),
    '/sos/' || v_broadcast_id::text,
    jsonb_build_object('broadcastId', v_broadcast_id)
  from public.sos_recipients r
  where r.broadcast_id = v_broadcast_id;

  return query select v_broadcast_id, v_count;
end;
$$;

create or replace function public.accept_sos_broadcast(p_broadcast_id uuid)
returns table (requester_id uuid, opening_id text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player uuid := (select auth.uid());
  v_requester uuid;
  v_opening text;
begin
  if v_player is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.sos_broadcasts b
  set status = 'matched', accepted_by = v_player
  where b.id = p_broadcast_id
    and b.status = 'open'
    and b.accepted_by is null
    and b.expires_at > now()
    and exists (
      select 1 from public.sos_recipients r
      where r.broadcast_id = b.id and r.player_id = v_player and r.status = 'notified'
    )
  returning b.requester_id, b.opening_id into v_requester, v_opening;

  if v_requester is null then
    raise exception 'This SOS was already filled or expired' using errcode = 'P0001';
  end if;

  update public.sos_recipients
  set
    status = case when player_id = v_player then 'accepted' else 'missed' end,
    responded_at = case when player_id = v_player then now() else responded_at end
  where broadcast_id = p_broadcast_id;

  insert into public.notifications (
    recipient_id, actor_id, kind, urgency, dedupe_key, title, body, href, payload
  ) values (
    v_requester,
    v_player,
    'sos_accepted',
    'high',
    'sos-accepted:' || p_broadcast_id::text,
    'Your SOS has a match',
    'Open the chat to send the booking offer.',
    '/messages/c-' || v_player::text,
    jsonb_build_object('broadcastId', p_broadcast_id, 'openingId', v_opening)
  );

  insert into public.notifications (
    recipient_id, actor_id, kind, urgency, dedupe_key, title, body, href, payload
  )
  select
    r.player_id,
    v_requester,
    'sos_missed',
    'low',
    'sos-missed:' || p_broadcast_id::text || ':' || r.player_id::text,
    'That SOS was filled',
    'Another player accepted first.',
    '/notifications',
    jsonb_build_object('broadcastId', p_broadcast_id)
  from public.sos_recipients r
  where r.broadcast_id = p_broadcast_id and r.player_id <> v_player;

  return query select v_requester, v_opening;
end;
$$;

create or replace function public.get_sos_broadcast(p_broadcast_id uuid)
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
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.sos_broadcasts b
    where b.id = p_broadcast_id
      and (
        b.requester_id = v_user_id
        or exists (
          select 1 from public.sos_recipients r
          where r.broadcast_id = b.id and r.player_id = v_user_id
        )
      )
  ) then
    raise exception 'SOS not found' using errcode = 'P0002';
  end if;

  return query
  select
    b.id,
    b.requester_id,
    coalesce(nullif(p.name, ''), nullif(p.handle, ''), 'A local player'),
    b.instrument,
    b.when_label,
    b.status,
    b.expires_at,
    b.accepted_by,
    b.status = 'open'
      and b.expires_at > now()
      and exists (
        select 1 from public.sos_recipients r
        where r.broadcast_id = b.id and r.player_id = v_user_id and r.status = 'notified'
      )
  from public.sos_broadcasts b
  join public.profiles p on p.id = b.requester_id
  where b.id = p_broadcast_id;
end;
$$;

revoke execute on function public.create_sos_broadcast(public.instrument_id, text, text, numeric) from public, anon;
revoke execute on function public.accept_sos_broadcast(uuid) from public, anon;
revoke execute on function public.get_sos_broadcast(uuid) from public, anon;
grant execute on function public.create_sos_broadcast(public.instrument_id, text, text, numeric) to authenticated;
grant execute on function public.accept_sos_broadcast(uuid) to authenticated;
grant execute on function public.get_sos_broadcast(uuid) to authenticated;

alter publication supabase_realtime add table public.sos_broadcasts;
alter publication supabase_realtime add table public.sos_recipients;
