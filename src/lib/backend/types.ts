// The seam between the app and its data source. Two implementations exist:
//   * local.ts    — localStorage, no real auth (demo mode). Used when Supabase
//                   env vars are absent.
//   * supabase.ts — real Supabase Auth + Postgres. Used when configured.
// The store (store.tsx) talks only to this interface, so the rest of the app is
// unaware of which backend is live.

import type {
  Band,
  Booking,
  BookingStatus,
  Conversation,
  CurrentUser,
  Message,
  Opening,
} from "../types";
import type { Catalog } from "../data";
import type { SceneId } from "../scenes";

/** The per-user slice of state that gets persisted (catalog lives in data.ts). */
export interface PersistedData {
  user: CurrentUser | null;
  following: string[];
  conversations: Conversation[];
  bookings: Booking[];
  likedPosts: string[];
  respondedSubPosts: string[];
  /** openings the user posted (newest first) — they lead the feed */
  openings: Opening[];
  /** pickup projects / standing bands the user created (assemble flow) */
  projects: Band[];
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
  /** send a password-reset email (no-op in local/demo mode) */
  resetPassword(email: string): Promise<AuthResult>;

  // --- data ---
  /**
   * Load the shared catalog (players/bands/venues/events/feed) for one scene.
   * Returns null only for an unseeded cloud project, so the app can keep its
   * built-in demo catalog rather than booting empty.
   */
  loadCatalog(scene: SceneId): Promise<Catalog | null>;
  /** load everything persisted for `user` (or the demo default when local) */
  load(user: AuthUser | null): Promise<PersistedData>;

  saveUser(user: AuthUser, profile: CurrentUser): Promise<void>;
  updateUser(user: AuthUser, patch: Partial<CurrentUser>): Promise<void>;
  /** upload and persist the current user's avatar, returning its display URL */
  uploadAvatar(user: AuthUser, file: File): Promise<string>;
  setFollow(user: AuthUser, targetId: string, following: boolean): Promise<void>;
  addMessage(user: AuthUser, playerId: string, message: Message): Promise<void>;
  markRead(user: AuthUser, playerId: string): Promise<void>;
  addBooking(user: AuthUser, booking: Booking): Promise<void>;
  setBookingStatus(user: AuthUser, bookingId: string, status: BookingStatus): Promise<void>;
  addOpening(user: AuthUser, opening: Opening): Promise<void>;
  setOpeningStatus(user: AuthUser, openingId: string, status: Opening["status"]): Promise<void>;
  /** create-or-replace a user project (assemble / roster / ready-check updates) */
  upsertProject(user: AuthUser, project: Band): Promise<void>;
  /** create-or-replace a whole conversation (group chats mutate membership + system lines) */
  upsertConversation(user: AuthUser, conversation: Conversation): Promise<void>;
  setLike(user: AuthUser, postId: string, liked: boolean): Promise<void>;
  addRespondedSub(user: AuthUser, postId: string): Promise<void>;
  reset(user: AuthUser): Promise<void>;
}
