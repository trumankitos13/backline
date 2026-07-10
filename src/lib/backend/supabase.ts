// Supabase-backed backend: real auth (email + password) and Postgres
// persistence via RLS-protected tables (see supabase/migrations). Selected when
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.
//
// Conversations are resolved by (user_id, musician_id) rather than by their DB
// uuid, so the client never needs to round-trip to learn an id before sending
// the first message. Bookings and messages carry client-generated text ids.

import { supabase } from "../supabase";
import type {
  Booking,
  BookingStatus,
  Conversation,
  CurrentUser,
  InstrumentId,
  Message,
} from "../types";
import type { AuthResult, AuthUser, Backend, PersistedData } from "./types";

interface SessionUser {
  id: string;
  email?: string | null;
}

function toAuthUser(u: SessionUser | null | undefined): AuthUser | null {
  return u ? { id: u.id, email: u.email ?? null } : null;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export const supabaseBackend: Backend = {
  mode: "supabase",

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return toAuthUser(data.session?.user);
  },

  onAuthChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(toAuthUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  },

  async signUp(email, password, name): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };
    // No session back → the project requires email confirmation before sign-in.
    return { error: null, needsConfirmation: !data.session };
  },

  async signIn(email, password): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async resetPassword(email): Promise<AuthResult> {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/welcome` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error ? error.message : null };
  },

  async load(user): Promise<PersistedData> {
    const empty: PersistedData = {
      user: null,
      following: [],
      conversations: [],
      bookings: [],
      likedPosts: [],
      respondedSubPosts: [],
      openings: [],
    };
    if (!user) return empty;

    const [profileRes, followsRes, bookingsRes, convosRes, messagesRes, likesRes, subsRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("follows").select("target_id").eq("user_id", user.id),
        supabase.from("bookings").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("conversations").select("*").eq("user_id", user.id),
        supabase
          .from("messages")
          .select("*, conversations!inner(user_id, musician_id)")
          .eq("conversations.user_id", user.id)
          .order("created_at"),
        supabase.from("liked_posts").select("post_id").eq("user_id", user.id),
        supabase.from("responded_sub_posts").select("post_id").eq("user_id", user.id),
      ]);

    fail("load profile", profileRes.error);
    fail("load follows", followsRes.error);
    fail("load bookings", bookingsRes.error);
    fail("load conversations", convosRes.error);
    fail("load messages", messagesRes.error);
    fail("load likes", likesRes.error);
    fail("load sub-responses", subsRes.error);

    const p = profileRes.data as Record<string, unknown> | null;
    // A profile row is created by a DB trigger at sign-up with no handle yet;
    // treat the user as "onboarded" (and skip the welcome flow) only once they
    // have picked a handle.
    const profile: CurrentUser | null = p && p.handle
      ? {
          name: (p.name as string) ?? "",
          handle: (p.handle as string) ?? "",
          instruments: ((p.instruments as InstrumentId[]) ?? []),
          neighborhood: (p.neighborhood as string) ?? "",
          availableTonight: Boolean(p.available_tonight),
        }
      : null;

    // group messages under their conversation
    const byConversation = new Map<string, Message[]>();
    for (const row of (messagesRes.data ?? []) as Record<string, unknown>[]) {
      const convId = row.conversation_id as string;
      const list = byConversation.get(convId) ?? [];
      list.push({
        id: row.id as string,
        from: row.sender === "musician" ? "them" : "me",
        text: (row.body as string | null) ?? undefined,
        bookingId: (row.booking_id as string | null) ?? undefined,
        at: timeLabel(row.created_at as string),
      });
      byConversation.set(convId, list);
    }

    const conversations: Conversation[] = ((convosRes.data ?? []) as Record<string, unknown>[]).map(
      (c) => ({
        id: c.id as string,
        playerId: c.musician_id as string,
        unread: (c.unread as number) ?? 0,
        messages: byConversation.get(c.id as string) ?? [],
      }),
    );

    const bookings: Booking[] = ((bookingsRes.data ?? []) as Record<string, unknown>[]).map((b) => ({
      id: b.id as string,
      playerId: b.musician_id as string,
      gigTitle: b.gig_title as string,
      venueName: b.venue_name as string,
      date: b.date as string,
      time: b.time as string,
      amount: (b.amount as number) ?? 0,
      // legacy escrow rename: rows written before held/released say "paid"
      status: (b.status === "paid" ? "held" : b.status) as BookingStatus,
    }));

    return {
      user: profile,
      following: ((followsRes.data ?? []) as { target_id: string }[]).map((f) => f.target_id),
      conversations,
      bookings,
      likedPosts: ((likesRes.data ?? []) as { post_id: string }[]).map((l) => l.post_id),
      respondedSubPosts: ((subsRes.data ?? []) as { post_id: string }[]).map((s) => s.post_id),
      // no openings table yet — cloud mode keeps openings session-only for now
      openings: [],
    };
  },

  async saveUser(user, profile) {
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      name: profile.name,
      handle: profile.handle,
      neighborhood: profile.neighborhood,
      available_tonight: profile.availableTonight,
      instruments: profile.instruments,
      updated_at: new Date().toISOString(),
    });
    fail("save profile", error);
  },

  async updateUser(user, patch) {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.handle !== undefined) row.handle = patch.handle;
    if (patch.neighborhood !== undefined) row.neighborhood = patch.neighborhood;
    if (patch.availableTonight !== undefined) row.available_tonight = patch.availableTonight;
    if (patch.instruments !== undefined) row.instruments = patch.instruments;
    const { error } = await supabase.from("profiles").update(row).eq("id", user.id);
    fail("update profile", error);
  },

  async setFollow(user, targetId, following) {
    if (following) {
      const { error } = await supabase
        .from("follows")
        .upsert({ user_id: user.id, target_id: targetId });
      fail("add follow", error);
    } else {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("user_id", user.id)
        .eq("target_id", targetId);
      fail("remove follow", error);
    }
  },

  async addMessage(user, playerId, message) {
    // upsert the conversation (unread untouched on conflict) and get its id
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .upsert(
        { user_id: user.id, musician_id: playerId },
        { onConflict: "user_id,musician_id" },
      )
      .select("id,unread")
      .single();
    fail("upsert conversation", convErr);
    const conversationId = (conv as { id: string }).id;

    const { error: msgErr } = await supabase.from("messages").insert({
      id: message.id,
      conversation_id: conversationId,
      sender: message.from === "them" ? "musician" : "user",
      body: message.text ?? null,
      booking_id: message.bookingId ?? null,
    });
    fail("insert message", msgErr);

    if (message.from === "them") {
      const nextUnread = ((conv as { unread: number }).unread ?? 0) + 1;
      const { error: unreadErr } = await supabase
        .from("conversations")
        .update({ unread: nextUnread })
        .eq("id", conversationId);
      fail("bump unread", unreadErr);
    }
  },

  async markRead(user, playerId) {
    const { error } = await supabase
      .from("conversations")
      .update({ unread: 0 })
      .eq("user_id", user.id)
      .eq("musician_id", playerId);
    fail("mark read", error);
  },

  async addBooking(user, booking) {
    const { error } = await supabase.from("bookings").insert({
      id: booking.id,
      user_id: user.id,
      musician_id: booking.playerId,
      gig_title: booking.gigTitle,
      venue_name: booking.venueName,
      date: booking.date,
      time: booking.time,
      amount: booking.amount,
      status: booking.status,
    });
    fail("add booking", error);
  },

  async setBookingStatus(user, bookingId, status) {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId)
      .eq("user_id", user.id);
    fail("set booking status", error);
  },

  async addOpening() {
    // TODO: persist once an `openings` table exists (Phase 0 catalog work).
    // The optimistic store keeps the opening live for the session meanwhile.
  },

  async setLike(user, postId, liked) {
    if (liked) {
      const { error } = await supabase
        .from("liked_posts")
        .upsert({ user_id: user.id, post_id: postId });
      fail("add like", error);
    } else {
      const { error } = await supabase
        .from("liked_posts")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId);
      fail("remove like", error);
    }
  },

  async addRespondedSub(user, postId) {
    const { error } = await supabase
      .from("responded_sub_posts")
      .upsert({ user_id: user.id, post_id: postId });
    fail("respond to sub", error);
  },

  async reset(user) {
    // clear this user's activity; the profile + account stay.
    await Promise.all([
      supabase.from("follows").delete().eq("user_id", user.id),
      supabase.from("bookings").delete().eq("user_id", user.id),
      supabase.from("conversations").delete().eq("user_id", user.id),
      supabase.from("liked_posts").delete().eq("user_id", user.id),
      supabase.from("responded_sub_posts").delete().eq("user_id", user.id),
    ]);
  },
};
