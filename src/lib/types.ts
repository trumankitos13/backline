// Domain model for the Backline prototype. All data is mock/local — see data.ts.

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
  members: { playerId: string; role: string }[];
  openSlots: { instrument: InstrumentId; note: string }[];
  followers: number;
  eventIds: string[];
  links?: ExternalLink[];
  seed: number;
}

export interface Venue {
  id: string;
  name: string;
  neighborhood: string;
  capacity: number;
  followers: number;
  vibe: string;
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
  /** for kind === "need-sub" */
  subFor?: { instrument: InstrumentId; date: string; payout: number };
}

export type BookingStatus = "offer" | "accepted" | "paid" | "declined";

export interface Booking {
  id: string;
  playerId: string;
  gigTitle: string;
  venueName: string;
  date: string;
  time: string;
  amount: number;
  status: BookingStatus;
}

export interface Message {
  id: string;
  from: "me" | "them";
  text?: string;
  /** when set, render the booking card for this booking id instead of a bubble */
  bookingId?: string;
  at: string;
}

export interface Conversation {
  id: string;
  playerId: string;
  messages: Message[];
  unread: number;
}

export interface CurrentUser {
  name: string;
  handle: string;
  instruments: InstrumentId[];
  neighborhood: string;
  availableTonight: boolean;
}
