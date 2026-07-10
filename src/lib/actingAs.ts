// "Acting as" — the capabilities model in code. Identity is always a Player;
// posting/hiring is a capability exercised in a *context*: yourself, a band you
// admin, or a venue you manage. This module resolves the set of contexts the
// signed-in user can act as, and resolves an opening's postedBy back to a
// context for attribution. See docs/V1_SPEC.md → "Roles & capabilities".

import type { Band, CurrentUser, Opening } from "./types";
import { BANDS, VENUES, getBand, getVenue } from "./data";

export interface ActingContext {
  kind: "player" | "band" | "venue";
  /** "me" for the signed-in player; otherwise the band/venue id. */
  id: string;
  name: string;
  seed: number;
  /** bands & venues render as rounded squares; the player as a rounded avatar. */
  square: boolean;
  /** short role descriptor shown under the name in the picker. */
  detail: string;
}

const ME_SEED = 99;

/**
 * In the prototype the signed-in user has no catalog player id, so we can't
 * derive their bands/venues from `Band.members[].admin` / `Venue.managers`.
 * These curated ids stand in — the user "runs" one band and "manages" one
 * venue — so the picker is populated and the whole acting-as flow is
 * demonstrable. In production, swap this for a lookup by the user's player id.
 */
export const DEMO_MY_BAND_IDS = ["b-cedarrye"];
export const DEMO_MY_VENUE_IDS = ["v-armadillo"];

export function meContext(user: CurrentUser | null): ActingContext {
  return {
    kind: "player",
    id: "me",
    name: user?.name ?? "You",
    seed: ME_SEED,
    square: false,
    detail: "You",
  };
}

/** the bands the user admins — real (by player id) or curated for the demo. */
function myBandIds(user: CurrentUser | null): string[] {
  if (user?.id) {
    const ids = BANDS.filter((b) =>
      b.members.some((m) => m.playerId === user.id && m.admin),
    ).map((b) => b.id);
    if (ids.length > 0) return ids;
  }
  return DEMO_MY_BAND_IDS;
}

/** the venues the user manages — real (by player id) or curated for the demo. */
function myVenueIds(user: CurrentUser | null): string[] {
  if (user?.id) {
    const ids = VENUES.filter((v) => v.managers?.includes(user.id!)).map((v) => v.id);
    if (ids.length > 0) return ids;
  }
  return DEMO_MY_VENUE_IDS;
}

/**
 * every context the user can post/hire as: Me + bands you admin + venues you
 * manage + projects/bands you own (`projects` = the user-created ones in the
 * store — owning one puts it in the picker, per the spec).
 */
export function myActingContexts(
  user: CurrentUser | null,
  projects: Band[] = [],
): ActingContext[] {
  const contexts: ActingContext[] = [meContext(user)];
  for (const p of projects) {
    if (p.archived) continue;
    contexts.push({
      kind: "band",
      id: p.id,
      name: p.name,
      seed: p.seed,
      square: true,
      detail: p.kind === "standing" ? "Your band" : "Your project",
    });
  }
  for (const id of myBandIds(user)) {
    const b = getBand(id);
    if (b) {
      contexts.push({ kind: "band", id: b.id, name: b.name, seed: b.seed, square: true, detail: "Band you run" });
    }
  }
  for (const id of myVenueIds(user)) {
    const v = getVenue(id);
    if (v) {
      contexts.push({ kind: "venue", id: v.id, name: v.name, seed: v.seed, square: true, detail: "Venue you manage" });
    }
  }
  return contexts;
}

/** look up a context the user can act as by its id ("me" | band id | venue id). */
export function contextById(
  id: string | null,
  user: CurrentUser | null,
  projects: Band[] = [],
): ActingContext {
  if (!id) return meContext(user);
  return myActingContexts(user, projects).find((c) => c.id === id) ?? meContext(user);
}

/** resolve an opening's postedBy to a context for attribution (not just the user's own). */
export function resolveActingContext(
  postedBy: Opening["postedBy"],
  user: CurrentUser | null,
  projects: Band[] = [],
): ActingContext {
  if (postedBy.kind === "band") {
    const p = projects.find((x) => x.id === postedBy.id);
    if (p) return { kind: "band", id: p.id, name: p.name, seed: p.seed, square: true, detail: p.kind === "standing" ? "Your band" : "Your project" };
    const b = getBand(postedBy.id);
    if (b) return { kind: "band", id: b.id, name: b.name, seed: b.seed, square: true, detail: "Band" };
  }
  if (postedBy.kind === "venue") {
    const v = getVenue(postedBy.id);
    if (v) return { kind: "venue", id: v.id, name: v.name, seed: v.seed, square: true, detail: "Venue" };
  }
  return meContext(user);
}
