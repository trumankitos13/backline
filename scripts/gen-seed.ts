// Generates supabase/seed.sql from the mock catalog in src/lib/data.ts, so the
// seed never drifts from the TypeScript source of truth.
// Run: node scripts/gen-seed.ts > supabase/seed.sql

import {
  PLAYERS,
  BANDS,
  VENUES,
  EVENTS,
  FEED_POSTS,
} from "../src/lib/data.ts";

function q(v: string | null | undefined): string {
  if (v === null || v === undefined) return "null";
  return `'${v.replace(/'/g, "''")}'`;
}
function num(v: number | null | undefined): string {
  return v === null || v === undefined ? "null" : String(v);
}
function bool(v: boolean): string {
  return v ? "true" : "false";
}
function arr(items: string[]): string {
  if (!items.length) return "'{}'";
  return `ARRAY[${items.map((s) => q(s)).join(", ")}]`;
}
function jsonb(v: unknown): string {
  if (v === null || v === undefined) return "null";
  return `${q(JSON.stringify(v))}::jsonb`;
}
function row(values: string[]): string {
  return `  (${values.join(", ")})`;
}

const out: string[] = [];
out.push("-- Backline — catalog seed data (generated from src/lib/data.ts).");
out.push("-- Regenerate with: node scripts/gen-seed.ts > supabase/seed.sql");
out.push("-- Catalog tables have public-read/no-write RLS, so this runs as the table");
out.push("-- owner (SQL editor / service role / `supabase db reset`), which bypasses RLS.");
out.push("");
out.push("begin;");
out.push("");

// musicians
out.push(
  "insert into public.musicians (id, name, handle, bio, genres, gear, neighborhood, distance_miles, rate_min, rate_max, available_tonight, availability, response_mins, gigs_played, verified, links, reels, seed) values",
);
out.push(
  PLAYERS.map((m) =>
    row([
      q(m.id), q(m.name), q(m.handle), q(m.bio), arr(m.genres), arr(m.gear),
      q(m.neighborhood), num(m.distanceMiles), num(m.rate.min), num(m.rate.max),
      bool(m.availableTonight), arr(m.availability), num(m.responseMins),
      num(m.gigsPlayed), bool(m.verified), jsonb(m.links), jsonb(m.reels), num(m.seed),
    ]),
  ).join(",\n") + "\non conflict (id) do nothing;",
);
out.push("");

// musician_instruments
const instRows = PLAYERS.flatMap((m) =>
  m.instruments.map((i) => row([q(m.id), q(i.id), q(i.level), num(i.years)])),
);
out.push("insert into public.musician_instruments (musician_id, instrument, level, years) values");
out.push(instRows.join(",\n") + "\non conflict (musician_id, instrument) do nothing;");
out.push("");

// videos
const videoRows = PLAYERS.flatMap((m) =>
  m.videos.map((v) =>
    row([
      q(v.id), q(m.id), q(v.title), num(v.durationSec), num(v.plays), num(v.likes),
      q(v.palette[0]), q(v.palette[1]), arr(v.tags),
    ]),
  ),
);
out.push(
  "insert into public.videos (id, musician_id, title, duration_sec, plays, likes, palette_from, palette_to, tags) values",
);
out.push(videoRows.join(",\n") + "\non conflict (id) do nothing;");
out.push("");

// reviews
const reviewRows = PLAYERS.flatMap((m) =>
  m.reviews.map((r) =>
    row([q(r.id), q(m.id), q(r.author), q(r.role), num(r.rating), q(r.text), q(r.date)]),
  ),
);
if (reviewRows.length) {
  out.push(
    "insert into public.reviews (id, musician_id, author, role, rating, body, review_date) values",
  );
  out.push(reviewRows.join(",\n") + "\non conflict (id) do nothing;");
  out.push("");
}

// venues
out.push(
  "insert into public.venues (id, name, neighborhood, capacity, followers, vibe, managers, backline, hiring, links, seed) values",
);
out.push(
  VENUES.map((v) =>
    row([q(v.id), q(v.name), q(v.neighborhood), num(v.capacity), num(v.followers), q(v.vibe), arr(v.managers ?? []), v.backline ? arr(v.backline) : "null", jsonb(v.hiring), jsonb(v.links), num(v.seed)]),
  ).join(",\n") + "\non conflict (id) do nothing;",
);
out.push("");

// bands
out.push(
  "insert into public.bands (id, name, genres, bio, neighborhood, followers, kind, owner_id, links, seed) values",
);
out.push(
  BANDS.map((b) =>
    row([q(b.id), q(b.name), arr(b.genres), q(b.bio), q(b.neighborhood), num(b.followers), b.kind ? q(b.kind) : "null", b.ownerId ? q(b.ownerId) : "null", jsonb(b.links), num(b.seed)]),
  ).join(",\n") + "\non conflict (id) do nothing;",
);
out.push("");

// band_members
const memberRows = BANDS.flatMap((b) =>
  b.members.map((mem) =>
    row([
      q(b.id), q(mem.playerId), q(mem.role), bool(!!mem.admin),
      mem.performing === undefined ? "null" : bool(mem.performing),
    ]),
  ),
);
out.push("insert into public.band_members (band_id, musician_id, role, admin, performing) values");
out.push(memberRows.join(",\n") + "\non conflict (band_id, musician_id) do nothing;");
out.push("");

// band_open_slots (identity id auto)
const slotRows = BANDS.flatMap((b) =>
  b.openSlots.map((s) => row([q(b.id), q(s.instrument), q(s.note)])),
);
out.push("insert into public.band_open_slots (band_id, instrument, note) values");
out.push(slotRows.join(",\n") + ";");
out.push("");

// gigs
out.push(
  "insert into public.gigs (id, title, venue_id, band_id, band_ids, player_ids, description, date, time, payout, ticket, ticket_url, sub_needed, links, source, external_url) values",
);
out.push(
  EVENTS.map((g) =>
    row([
      q(g.id), q(g.title), q(g.venueId), g.bandId ? q(g.bandId) : "null",
      g.bandIds ? arr(g.bandIds) : "null", g.playerIds ? arr(g.playerIds) : "null",
      g.description ? q(g.description) : "null", q(g.date), q(g.time), num(g.payout),
      g.ticket ? q(g.ticket) : "null", g.ticketUrl ? q(g.ticketUrl) : "null",
      jsonb(g.subNeeded), jsonb(g.links), g.source ? q(g.source) : "null",
      g.externalUrl ? q(g.externalUrl) : "null",
    ]),
  ).join(",\n") + "\non conflict (id) do nothing;",
);
out.push("");

// feed_posts
out.push(
  "insert into public.feed_posts (id, kind, author_type, author_id, text, ago, likes, comments, gig_id, video, video_owner_id, sub_for) values",
);
out.push(
  FEED_POSTS.map((p) =>
    row([
      q(p.id), q(p.kind), q(p.author.type), q(p.author.id), q(p.text), q(p.ago),
      num(p.likes), num(p.comments), p.eventId ? q(p.eventId) : "null",
      jsonb(p.video), p.videoOwnerId ? q(p.videoOwnerId) : "null", jsonb(p.subFor),
    ]),
  ).join(",\n") + "\non conflict (id) do nothing;",
);
out.push("");
out.push("commit;");
out.push("");

console.log(out.join("\n"));
