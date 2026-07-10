// localStorage-backed backend — the demo/prototype experience with no real
// auth or server. Selected automatically when Supabase env vars are absent, so
// the app (and the deployed site) always runs, even before the backend is set
// up. Behavior matches the original SitIn prototype.

import type { Booking, BookingStatus, CurrentUser, Message } from "../types";
import { SEED_CONVERSATIONS } from "../data";
import { upsertMessage } from "../conversations";
import type { AuthResult, AuthUser, Backend, PersistedData } from "./types";

const STORAGE_KEY = "backline-state-v1";

// Local mode has no accounts; every write is attributed to this synthetic user.
const LOCAL_USER: AuthUser = { id: "local", email: null };

function demoDefault(): PersistedData {
  return {
    user: null,
    following: ["v-armadillo", "v-rattlesnake", "b-moontower", "b-brasshouse"],
    conversations: SEED_CONVERSATIONS,
    bookings: [],
    likedPosts: [],
    respondedSubPosts: [],
  };
}

function read(): PersistedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return demoDefault();
    const parsed = JSON.parse(raw) as Partial<PersistedData>;
    return { ...demoDefault(), ...parsed };
  } catch {
    return demoDefault();
  }
}

function write(data: PersistedData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable — the app keeps working from memory
  }
}

function mutate(fn: (d: PersistedData) => PersistedData): void {
  write(fn(read()));
}

export const localBackend: Backend = {
  mode: "local",

  async getSession() {
    // Local mode is always "signed in"; onboarding (state.user) is the real gate.
    return LOCAL_USER;
  },
  onAuthChange() {
    return () => {};
  },
  async signUp(): Promise<AuthResult> {
    return { error: "Accounts require Supabase — this build is in demo mode." };
  },
  async signIn(): Promise<AuthResult> {
    return { error: "Accounts require Supabase — this build is in demo mode." };
  },
  async signOut() {
    // no session to end in demo mode
  },
  async resetPassword(): Promise<AuthResult> {
    return { error: "Accounts require Supabase — this build is in demo mode." };
  },

  async load() {
    return read();
  },

  async saveUser(_user: AuthUser, profile: CurrentUser) {
    mutate((d) => ({ ...d, user: profile }));
  },
  async updateUser(_user: AuthUser, patch: Partial<CurrentUser>) {
    mutate((d) => (d.user ? { ...d, user: { ...d.user, ...patch } } : d));
  },
  async setFollow(_user: AuthUser, targetId: string, following: boolean) {
    mutate((d) => ({
      ...d,
      following: following
        ? d.following.includes(targetId)
          ? d.following
          : [...d.following, targetId]
        : d.following.filter((f) => f !== targetId),
    }));
  },
  async addMessage(_user: AuthUser, playerId: string, message: Message) {
    mutate((d) => ({
      ...d,
      conversations: upsertMessage(
        d.conversations,
        playerId,
        message,
        message.from === "them",
      ),
    }));
  },
  async markRead(_user: AuthUser, playerId: string) {
    mutate((d) => ({
      ...d,
      conversations: d.conversations.map((c) =>
        c.playerId === playerId ? { ...c, unread: 0 } : c,
      ),
    }));
  },
  async addBooking(_user: AuthUser, booking: Booking) {
    mutate((d) => ({ ...d, bookings: [...d.bookings, booking] }));
  },
  async setBookingStatus(_user: AuthUser, bookingId: string, status: BookingStatus) {
    mutate((d) => ({
      ...d,
      bookings: d.bookings.map((b) => (b.id === bookingId ? { ...b, status } : b)),
    }));
  },
  async setLike(_user: AuthUser, postId: string, liked: boolean) {
    mutate((d) => ({
      ...d,
      likedPosts: liked
        ? d.likedPosts.includes(postId)
          ? d.likedPosts
          : [...d.likedPosts, postId]
        : d.likedPosts.filter((p) => p !== postId),
    }));
  },
  async addRespondedSub(_user: AuthUser, postId: string) {
    mutate((d) => ({
      ...d,
      respondedSubPosts: d.respondedSubPosts.includes(postId)
        ? d.respondedSubPosts
        : [...d.respondedSubPosts, postId],
    }));
  },
  async reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
