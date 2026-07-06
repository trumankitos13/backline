// The seam between the app and its data source. Two implementations exist:
//   * local.ts    — localStorage, no real auth (demo mode). Used when Supabase
//                   env vars are absent.
//   * supabase.ts — real Supabase Auth + Postgres. Used when configured.
// The store (store.tsx) talks only to this interface, so the rest of the app is
// unaware of which backend is live.

import type {
  Booking,
  BookingStatus,
  Conversation,
  CurrentUser,
  Message,
} from "../types";

/** The per-user slice of state that gets persisted (catalog lives in data.ts). */
export interface PersistedData {
  user: CurrentUser | null;
  following: string[];
  conversations: Conversation[];
  bookings: Booking[];
  likedPosts: string[];
  respondedSubPosts: string[];
}

/** A minimal, backend-agnostic view of the signed-in account. */
export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthResult {
  error: string | null;
  /** true when sign-up succeeded but the account still needs email confirmation */
  needsConfirmation?: boolean;
}

export interface Backend {
  readonly mode: "local" | "supabase";

  // --- auth ---
  /** current session, or null when signed out */
  getSession(): Promise<AuthUser | null>;
  /** react to sign-in / sign-out; returns an unsubscribe fn */
  onAuthChange(cb: (user: AuthUser | null) => void): () => void;
  signUp(email: string, password: string, name: string): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;

  // --- data ---
  /** load everything persisted for `user` (or the demo default when local) */
  load(user: AuthUser | null): Promise<PersistedData>;

  saveUser(user: AuthUser, profile: CurrentUser): Promise<void>;
  updateUser(user: AuthUser, patch: Partial<CurrentUser>): Promise<void>;
  setFollow(user: AuthUser, targetId: string, following: boolean): Promise<void>;
  addMessage(user: AuthUser, musicianId: string, message: Message): Promise<void>;
  markRead(user: AuthUser, musicianId: string): Promise<void>;
  addBooking(user: AuthUser, booking: Booking): Promise<void>;
  setBookingStatus(user: AuthUser, bookingId: string, status: BookingStatus): Promise<void>;
  setLike(user: AuthUser, postId: string, liked: boolean): Promise<void>;
  addRespondedSub(user: AuthUser, postId: string): Promise<void>;
  reset(user: AuthUser): Promise<void>;
}
