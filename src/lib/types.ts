// Domain model for the Backline prototype. All data is mock/local — see data.ts.

import type { SceneId } from "./scenes";

export type InstrumentId =
  | "guitar"
  | "bass"
  | "drums"
  | "keys"
  | "vocals"
  | "sax"
  | "trumpet"
  | "violin"
  | "pedal-steel"
  | "dj"
  | "sound-tech"
  | "lighting-tech";

export type SkillLevel = "pro" | "semi-pro" | "hobbyist";

// ---------------------------------------------------------- external links
// Every object can link out to where it already lives on the internet.

export type LinkKind =
  | "website"
  | "spotify"
  | "apple-music"
  | "soundcloud"
  | "bandcamp"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "bandsintown"
  | "x";

export interface ExternalLink {
  kind: LinkKind;
  url: string;
  /** optional display override, e.g. a handle */
  label?: string;
}

// ------------------------------------------------------------------ reels
// A reel is an EMBED of an existing short-form post, not a hosted file — see
// docs/V1_SPEC.md. The generative VideoClip below is the fallback shown when a
// player has no reels yet.

export type ReelPlatform = "tiktok" | "youtube" | "instagram";

export interface Reel {
  id: string;
  platform: ReelPlatform;
  /** canonical post URL; the embed is derived from it at render time */
  url: string;
  caption?: string;
}

export interface VideoClip {
  id: string;
  title: string;
  durationSec: number;
  plays: number;
  likes: number;
  /** two hex colors used to paint the placeholder "video" gradient */
  palette: [string, string];
  tags: string[];
}

export interface Review {
  id: string;
  author: string;
  role: string;
  rating: number; // 1..5
  text: string;
  date: string;
}

export interface Player {
  id: string;
  name: string;
  handle: string;
  instruments: { id: InstrumentId; level: SkillLevel; years: number }[];
  genres: string[];
  bio: string;
  gear: string[];
  neighborhood: string;
  distanceMiles: number;
  rate: { min: number; max: number };
  availableTonight: boolean;
  /** days of week usually free, e.g. ["Fri", "Sat"] */
  availability: string[];
  responseMins: number;
  gigsPlayed: number;
  verified: boolean;
  /** embedded short-form reels (TikTok/YouTube/Instagram) — v1 */
  reels?: Reel[];
  /** generative placeholder clips, shown when reels is empty */
  videos: VideoClip[];
  reviews: Review[];
  bandIds: string[];
  links?: ExternalLink[];
  /** avatar gradient seed */
  seed: number;
}

export interface Band {
  id: string;
  name: string;
  genres: string[];
  bio: string;
  neighborhood: string;
  /**
   * `admin` members can post/hire *as the band* (capabilities model — see
   * docs/V1_SPEC.md). `performing` distinguishes players in a seat from
   * organizers/writers/producers who don't take a slot. `stay` records the
   * post-gig "Stay as a group?" ready-check vote (projects only).
   */
  members: {
    playerId: string;
    role: string;
    admin?: boolean;
    performing?: boolean;
    stay?: "in" | "out";
  }[];
  openSlots: { instrument: InstrumentId; note: string }[];
  followers: number;
  eventIds: string[];
  links?: ExternalLink[];
  /** "standing" = a real band; "project" = a pickup/one-off that can be promoted. */
  kind?: "standing" | "project";
  /** creator/owner (a playerId) — always an admin, may or may not perform. */
  ownerId?: string;
  /** a past project that didn't promote — still viewable, no longer active. */
  archived?: boolean;
  seed: number;
}

export interface Venue {
  id: string;
  name: string;
  neighborhood: string;
  capacity: number;
  followers: number;
  vibe: string;
  /** gear the house provides — "the backline" (the app's namesake) */
  backline?: string[];
  /** a house-player role the venue is hiring for → routes into SOS */
  hiring?: { role: InstrumentId; note: string };
  /** players (playerIds) who can post/hire *as the venue* (capabilities model). */
  managers?: string[];
  links?: ExternalLink[];
  seed: number;
}

export type EventSource = "backline" | "bandsintown" | "ticketmaster" | "seatgeek";

/** A show — a first-class object with its own page (/e/:id). */
export interface Event {
  id: string;
  title: string;
  venueId: string;
  /** headliner / primary act */
  bandId?: string;
  /** full lineup beyond the headliner */
  bandIds?: string[];
  playerIds?: string[];
  description?: string;
  /** display date, e.g. "Tonight" or "Fri Jul 10" */
  date: string;
  time: string;
  payout?: number;
  ticket?: string;
  ticketUrl?: string;
  /** an open sub slot on this event's lineup → routes into SOS */
  subNeeded?: { instrument: InstrumentId; payout: number; note?: string };
  links?: ExternalLink[];
  /** where this event came from; imported events deep-link out */
  source?: EventSource;
  externalUrl?: string;
}

export type PostKind = "gig" | "need-sub" | "video" | "open-mic" | "news";

export interface FeedPost {
  id: string;
  kind: PostKind;
  author: { type: "band" | "venue" | "player"; id: string };
  text: string;
  ago: string;
  likes: number;
  comments: number;
  eventId?: string;
  /** for kind === "video": the clip, plus whose reel it belongs to */
  video?: VideoClip;
  videoOwnerId?: string;
  /**
   * for kind === "need-sub". `payout` is optional: user-posted openings keep
   * the fee private (it lives in the DM offer — see V1_SPEC "fees private");
   * legacy seed posts still advertise it. `urgent` defaults to true for seeds.
   */
  subFor?: { instrument: InstrumentId; date: string; payout?: number; urgent?: boolean };
  /** the viewer authored this post (their openings render with owner controls) */
  own?: boolean;
}

// --------------------------------------------------------------- openings
// The unified "someone needs a player" concept — one shape behind a band's open
// seat, a venue's house-player hire, and an event's sub-needed slot. Posted in a
// context ("acting as" — see docs/V1_SPEC.md); the fee is private, the lock is
// public.

export type OpeningStatus = "open" | "filled" | "closed";

export interface Opening {
  id: string;
  instrument: InstrumentId;
  /** the "acting as" context: yourself, a band you admin, or a venue you manage. */
  postedBy: { kind: "player" | "band" | "venue"; id: string };
  /** optional: tie the opening to a specific show. */
  eventId?: string;
  /** display date, e.g. "Tonight" or "Fri Jul 10". */
  when: string;
  /** canonical ISO instant for newly scheduled openings; `when` remains for legacy display. */
  gigAt?: string;
  /** held on accept — private to the offer thread. */
  fee: number;
  note?: string;
  /** SOS-grade — surfaces with urgency. */
  urgent?: boolean;
  status: OpeningStatus;
  /** display timestamp, e.g. "just now" / "2h". */
  ago?: string;
}

/**
 * The escrow lifecycle (docs/V1_SPEC.md → Payments & escrow):
 * offer → accepted (they said yes, awaiting the hold) → held (money committed)
 * → released (money delivered, post-gig) — plus terminal declined.
 * The old single "paid" split into held vs released; legacy persisted "paid"
 * is mapped to "held" at load time by each backend.
 */
export type BookingStatus = "offer" | "accepted" | "held" | "released" | "declined";

export interface Booking {
  id: string;
  playerId: string;
  gigTitle: string;
  venueName: string;
  date: string;
  time: string;
  amount: number;
  status: BookingStatus;
  /** when the booking fills a posted Opening, holding it locks that seat */
  openingId?: string;
}

export interface Message {
  id: string;
  from: "me" | "them";
  text?: string;
  /** when set, render the booking card for this booking id instead of a bubble */
  bookingId?: string;
  /** group chats: who spoke ("me" or a playerId) */
  senderId?: string;
  /** a system line ("🥁 Nia locked in on drums") — centered, no bubble */
  system?: boolean;
  at: string;
}

/**
 * DMs are 1:1 with a Player (`playerId`, ids `c-<playerId>`). Group chats
 * belong to a project/band (`bandId`, ids `g-<bandId>`): the roster talks in
 * one thread with sender attribution + system lock lines — and never a fee
 * (fees stay in the 1:1 offer threads). See docs/V1_SPEC.md.
 */
export interface Conversation {
  id: string;
  kind?: "dm" | "group";
  /** dm: the other player */
  playerId?: string;
  /** group: the roster ("me" + playerIds) */
  participantIds?: string[];
  /** group: the project/band this chat belongs to */
  bandId?: string;
  /** group: display title (usually the band's name) */
  title?: string;
  messages: Message[];
  unread: number;
}

export interface CurrentUser {
  /** the user's own player id, when they exist in the catalog (prototype: optional). */
  id?: string;
  name: string;
  handle: string;
  instruments: InstrumentId[];
  neighborhood: string;
  availableTonight: boolean;
  /** scene selected during onboarding; scopes local discovery and posting. */
  scene: SceneId;
}
