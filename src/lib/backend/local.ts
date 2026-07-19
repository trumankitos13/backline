// localStorage-backed backend — the demo/prototype experience with no real
// auth or server. Selected automatically when Supabase env vars are absent, so
// the app (and the deployed site) always runs, even before the backend is set
// up. Behavior matches the original SitIn prototype.

import type { Band, Booking, BookingStatus, Conversation, CurrentUser, Message, Opening } from "../types";
import { demoCatalogForScene, SEED_CONVERSATIONS } from "../data";
import { upsertMessage } from "../conversations";
import { normalizePersistedData } from "../sceneScope";
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
    notifications: [],
    likedPosts: [],
    respondedSubPosts: [],
    openings: [],
    projects: [],
  };
}

/** legacy escrow rename: persisted "paid" (pre-held/released) means "held". */
function migrateBooking(b: Booking): Booking {
  return (b.status as string) === "paid" ? { ...b, status: "held" } : b;
}

function read(): PersistedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return demoDefault();
    const parsed = JSON.parse(raw) as Partial<PersistedData>;
    const merged = { ...demoDefault(), ...parsed };
    return normalizePersistedData({ ...merged, bookings: merged.bookings.map(migrateBooking) });
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

  subscribeToChanges() {
    return () => undefined;
  },

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

  async loadCatalog(scene) {
    return demoCatalogForScene(scene);
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
  async uploadAvatar(_user: AuthUser, file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read that image."));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
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
  async markRead(_user: AuthUser, key: string) {
    // `key` is a playerId for DMs, or a conversation id for group chats
    mutate((d) => ({
      ...d,
      conversations: d.conversations.map((c) =>
        c.playerId === key || c.id === key ? { ...c, unread: 0 } : c,
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
  async markNotificationRead(_user: AuthUser, notificationId: string) {
    mutate((d) => ({
      ...d,
      notifications: d.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    }));
  },
  async markAllNotificationsRead() {
    mutate((d) => ({
      ...d,
      notifications: d.notifications.map((notification) => ({ ...notification, read: true })),
    }));
  },
  async savePushSubscription() {
    // Push delivery is cloud-only.
  },
  async removePushSubscription() {
    // Push delivery is cloud-only.
  },
  async addOpening(_user: AuthUser, opening: Opening) {
    mutate((d) => ({ ...d, openings: [opening, ...d.openings] }));
  },
  async setOpeningStatus(_user: AuthUser, openingId: string, status: Opening["status"]) {
    mutate((d) => ({
      ...d,
      openings: d.openings.map((o) => (o.id === openingId ? { ...o, status } : o)),
    }));
  },
  async upsertProject(_user: AuthUser, project: Band) {
    mutate((d) => ({
      ...d,
      projects: d.projects.some((p) => p.id === project.id)
        ? d.projects.map((p) => (p.id === project.id ? project : p))
        : [project, ...d.projects],
    }));
  },
  async upsertConversation(_user: AuthUser, conversation: Conversation) {
    mutate((d) => ({
      ...d,
      conversations: d.conversations.some((c) => c.id === conversation.id)
        ? d.conversations.map((c) => (c.id === conversation.id ? conversation : c))
        : [conversation, ...d.conversations],
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
