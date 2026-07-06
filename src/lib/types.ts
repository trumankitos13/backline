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

export interface Musician {
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
  videos: VideoClip[];
  reviews: Review[];
  bandIds: string[];
  /** avatar gradient seed */
  seed: number;
}

export interface Band {
  id: string;
  name: string;
  genres: string[];
  bio: string;
  neighborhood: string;
  members: { musicianId: string; role: string }[];
  openSlots: { instrument: InstrumentId; note: string }[];
  followers: number;
  gigIds: string[];
  seed: number;
}

export interface Venue {
  id: string;
  name: string;
  neighborhood: string;
  capacity: number;
  followers: number;
  vibe: string;
  seed: number;
}

export interface Gig {
  id: string;
  title: string;
  venueId: string;
  bandId?: string;
  /** display date, e.g. "Tonight" or "Fri Jul 10" */
  date: string;
  time: string;
  payout?: number;
  ticket?: string;
}

export type PostKind = "gig" | "need-sub" | "video" | "open-mic" | "news";

export interface FeedPost {
  id: string;
  kind: PostKind;
  author: { type: "band" | "venue" | "musician"; id: string };
  text: string;
  ago: string;
  likes: number;
  comments: number;
  gigId?: string;
  /** for kind === "video": the clip, plus whose reel it belongs to */
  video?: VideoClip;
  videoOwnerId?: string;
  /** for kind === "need-sub" */
  subFor?: { instrument: InstrumentId; date: string; payout: number };
}

export type BookingStatus = "offer" | "accepted" | "paid" | "declined";

export interface Booking {
  id: string;
  musicianId: string;
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
  musicianId: string;
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
