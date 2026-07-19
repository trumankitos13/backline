// Supabase-backed backend: real auth (email + password) and Postgres
// persistence via RLS-protected tables (see supabase/migrations). Selected when
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.
//
// Conversations are resolved by (user_id, musician_id) rather than by their DB
// uuid, so the client never needs to round-trip to learn an id before sending
// the first message. Bookings and messages carry client-generated text ids.

import { supabase } from "../supabase";
import type { SceneId } from "../scenes";
import { normalizeOpeningScene, normalizeProjectScene } from "../sceneScope";
import type { Catalog } from "../data";
import type {
  Booking,
  Band,
  BookingStatus,
  Conversation,
  CurrentUser,
  Event,
  FeedPost,
  InstrumentId,
  Message,
  NotificationItem,
  Opening,
  Player,
  Venue,
} from "../types";
import type { AuthResult, AuthUser, Backend, PersistedData } from "./types";

interface SessionUser {
  id: string;
  email?: string | null;
}

function toAuthUser(u: SessionUser | null | undefined): AuthUser | null {
  return u ? { id: u.id, email: u.email ?? null } : null;
}

/** rough relative-time label for openings ("just now", "3h", "2d"). */
function agoLabel(createdAt: string | null | undefined): string {
  if (!createdAt) return "just now";
  const mins = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 60_000);
  if (mins < 60) return mins < 2 ? "just now" : `${Math.round(mins)}m`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / (60 * 24))}d`;
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

function avatarUrl(path: unknown): string | undefined {
  if (typeof path !== "string" || !path) return undefined;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

function profileSeed(id: string): number {
  let value = 0;
  for (const char of id) value = (value * 31 + char.charCodeAt(0)) % 10_000;
  return value || 1;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAccountPlayerId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

async function getOrCreateDirectConversation(userId: string, playerId: string): Promise<string> {
  const [participantA, participantB] = [userId, playerId].sort();
  const find = () => supabase
    .from("direct_conversations")
    .select("id")
    .eq("participant_a", participantA)
    .eq("participant_b", participantB)
    .maybeSingle();

  const existing = await find();
  fail("find direct conversation", existing.error);
  if (existing.data) return (existing.data as { id: string }).id;

  const created = await supabase
    .from("direct_conversations")
    .insert({ participant_a: participantA, participant_b: participantB })
    .select("id")
    .single();
  if (!created.error) return (created.data as { id: string }).id;

  // Two first messages can race to create the same canonical pair. The unique
  // constraint picks one winner; the loser reads that row and continues.
  if ((created.error as { code?: string }).code === "23505") {
    const raced = await find();
    fail("load raced direct conversation", raced.error);
    if (raced.data) return (raced.data as { id: string }).id;
  }
  fail("create direct conversation", created.error);
  throw new Error("create direct conversation failed");
}

/** Keep catalog roots within the active scene before their dependents are loaded. */
export function filterCatalogRoots<T extends Record<string, unknown>>(rows: T[], scene: SceneId): T[] {
  return rows.filter((row) => row.scene === scene);
}

export const supabaseBackend: Backend = {
  mode: "supabase",

  subscribeToChanges(user, onChange) {
    const channel = supabase
      .channel(`backline:user:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        onChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        onChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        onChange,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  },

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

  async loadCatalog(scene: SceneId): Promise<Catalog | null> {
    // Phase 0: the catalog is served from Postgres in cloud mode. Ten
    // public-read tables, assembled into the app's four objects + feed.
    // An unseeded project (no musicians) returns null → demo catalog stays.
    type Row = Record<string, unknown>;
    const [mus, profiles, bands, venues, gigs, posts] =
      await Promise.all([
        supabase.from("musicians").select("*").eq("scene", scene).order("created_at"),
        supabase.from("profiles").select("*").eq("scene", scene).not("handle", "is", null).order("created_at"),
        supabase.from("bands").select("*").eq("scene", scene).order("created_at"),
        supabase.from("venues").select("*").eq("scene", scene).order("created_at"),
        supabase.from("gigs").select("*").eq("scene", scene).order("created_at"),
        supabase.from("feed_posts").select("*").eq("scene", scene).order("created_at"),
      ]);
    for (const [what, res] of Object.entries({ mus, profiles, bands, venues, gigs, posts })) {
      fail(`load catalog ${what}`, res.error);
    }
    const musRows = filterCatalogRoots((mus.data ?? []) as Row[], scene);
    const profileRows = filterCatalogRoots((profiles.data ?? []) as Row[], scene);
    const bandRows = filterCatalogRoots((bands.data ?? []) as Row[], scene);
    const venueRows = filterCatalogRoots((venues.data ?? []) as Row[], scene);
    const gigRows = filterCatalogRoots((gigs.data ?? []) as Row[], scene);
    const postRows = filterCatalogRoots((posts.data ?? []) as Row[], scene);
    if (musRows.length + profileRows.length + bandRows.length + venueRows.length + gigRows.length + postRows.length === 0) {
      return null; // not seeded — keep the demo catalog
    }

    const musicianIds = musRows.map((m) => m.id as string);
    const bandIds = bandRows.map((b) => b.id as string);
    const [insts, vids, revs, members, slots] = await Promise.all([
      supabase.from("musician_instruments").select("*").in("musician_id", musicianIds),
      supabase.from("videos").select("*").in("musician_id", musicianIds),
      supabase.from("reviews").select("*").in("musician_id", musicianIds),
      supabase.from("band_members").select("*").in("band_id", bandIds),
      supabase.from("band_open_slots").select("*").in("band_id", bandIds),
    ]);
    for (const [what, res] of Object.entries({ insts, vids, revs, members, slots })) {
      fail(`load catalog ${what}`, res.error);
    }

    const by = <T extends Row>(rows: T[] | null | undefined, key: string) => {
      const m = new Map<string, T[]>();
      for (const r of rows ?? []) {
        const k = r[key] as string;
        const list = m.get(k) ?? [];
        list.push(r);
        m.set(k, list);
      }
      return m;
    };
    const instsBy = by((insts.data ?? []) as Row[], "musician_id");
    const vidsBy = by((vids.data ?? []) as Row[], "musician_id");
    const revsBy = by((revs.data ?? []) as Row[], "musician_id");
    const membersBy = by((members.data ?? []) as Row[], "band_id");
    const slotsBy = by((slots.data ?? []) as Row[], "band_id");
    const memberBands = by((members.data ?? []) as Row[], "musician_id");
    const musicianIdSet = new Set(musicianIds);
    const bandIdSet = new Set(bandIds);
    const venueIdSet = new Set(venueRows.map((v) => v.id as string));
    const gigIdSet = new Set(gigRows.map((g) => g.id as string));

    const players: Player[] = musRows.map((m) => ({
      id: m.id as string,
      scene: m.scene as SceneId,
      name: m.name as string,
      handle: m.handle as string,
      instruments: (instsBy.get(m.id as string) ?? []).map((i) => ({
        id: i.instrument as InstrumentId,
        level: i.level as Player["instruments"][number]["level"],
        years: (i.years as number) ?? 0,
      })),
      genres: (m.genres as string[]) ?? [],
      bio: (m.bio as string) ?? "",
      gear: (m.gear as string[]) ?? [],
      neighborhood: (m.neighborhood as string) ?? "",
      distanceMiles: Number(m.distance_miles ?? 0),
      rate: { min: (m.rate_min as number) ?? 0, max: (m.rate_max as number) ?? 0 },
      availableTonight: Boolean(m.available_tonight),
      availability: (m.availability as string[]) ?? [],
      responseMins: (m.response_mins as number) ?? 0,
      gigsPlayed: (m.gigs_played as number) ?? 0,
      verified: Boolean(m.verified),
      reels: (m.reels as Player["reels"]) ?? undefined,
      videos: (vidsBy.get(m.id as string) ?? []).map((v) => ({
        id: v.id as string,
        title: v.title as string,
        durationSec: (v.duration_sec as number) ?? 0,
        plays: (v.plays as number) ?? 0,
        likes: (v.likes as number) ?? 0,
        palette: [v.palette_from as string, v.palette_to as string] as [string, string],
        tags: (v.tags as string[]) ?? [],
      })),
      reviews: (revsBy.get(m.id as string) ?? []).map((r) => ({
        id: r.id as string,
        author: r.author as string,
        role: (r.role as string) ?? "",
        rating: (r.rating as number) ?? 5,
        text: (r.body as string) ?? "",
        date: (r.review_date as string) ?? "",
      })),
      bandIds: (memberBands.get(m.id as string) ?? [])
        .map((b) => b.band_id as string)
        .filter((id) => bandIdSet.has(id)),
      links: (m.links as Player["links"]) ?? undefined,
      seed: (m.seed as number) ?? 1,
    }));

    const profilePlayers: Player[] = profileRows.map((p) => ({
      id: p.id as string,
      scene: p.scene as SceneId,
      name: (p.name as string) ?? "Player",
      handle: p.handle as string,
      instruments: ((p.instruments as InstrumentId[]) ?? []).map((id) => ({
        id,
        level: "semi-pro" as const,
        years: 0,
      })),
      genres: (p.genres as string[]) ?? [],
      bio: (p.bio as string) ?? "",
      gear: (p.gear as string[]) ?? [],
      neighborhood: (p.neighborhood as string) ?? "",
      distanceMiles: 0,
      rate: {
        min: (p.rate_min as number) ?? 0,
        max: (p.rate_max as number) ?? 0,
      },
      availableTonight: Boolean(p.available_tonight),
      availability: (p.availability as string[]) ?? [],
      responseMins: 0,
      gigsPlayed: 0,
      verified: false,
      reels: Array.isArray(p.reels) ? p.reels as Player["reels"] : [],
      videos: [],
      reviews: [],
      bandIds: [],
      seed: profileSeed(p.id as string),
      avatarUrl: avatarUrl(p.avatar_path),
    }));

    const catalogBands: Band[] = bandRows.map((b) => ({
      id: b.id as string,
      scene: b.scene as SceneId,
      name: b.name as string,
      genres: (b.genres as string[]) ?? [],
      bio: (b.bio as string) ?? "",
      neighborhood: (b.neighborhood as string) ?? "",
      members: (membersBy.get(b.id as string) ?? [])
        .filter((mm) => musicianIdSet.has(mm.musician_id as string))
        .map((mm) => ({
          playerId: mm.musician_id as string,
          role: (mm.role as string) ?? "",
          admin: Boolean(mm.admin) || undefined,
          performing: (mm.performing as boolean | null) ?? undefined,
        })),
      openSlots: (slotsBy.get(b.id as string) ?? []).map((s) => ({
        instrument: s.instrument as InstrumentId,
        note: (s.note as string) ?? "",
      })),
      followers: (b.followers as number) ?? 0,
      eventIds: gigRows.filter((g) => g.band_id === b.id).map((g) => g.id as string),
      links: (b.links as Band["links"]) ?? undefined,
      kind: (b.kind as Band["kind"]) ?? undefined,
      ownerId: (b.owner_id as string) ?? undefined,
      seed: (b.seed as number) ?? 1,
    }));

    const catalogVenues: Venue[] = venueRows.map((v) => ({
      id: v.id as string,
      scene: v.scene as SceneId,
      name: v.name as string,
      neighborhood: (v.neighborhood as string) ?? "",
      capacity: (v.capacity as number) ?? 0,
      followers: (v.followers as number) ?? 0,
      vibe: (v.vibe as string) ?? "",
      backline: (v.backline as string[]) ?? undefined,
      hiring: (v.hiring as Venue["hiring"]) ?? undefined,
      managers: (v.managers as string[] | null)?.filter((id) => musicianIdSet.has(id)) ?? undefined,
      links: (v.links as Venue["links"]) ?? undefined,
      seed: (v.seed as number) ?? 1,
    }));

    const events: Event[] = gigRows.map((g) => ({
      id: g.id as string,
      scene: g.scene as SceneId,
      title: g.title as string,
      venueId: venueIdSet.has(g.venue_id as string) ? (g.venue_id as string) : "",
      bandId: bandIdSet.has(g.band_id as string) ? (g.band_id as string) : undefined,
      bandIds: (g.band_ids as string[] | null)?.filter((id) => bandIdSet.has(id)) ?? undefined,
      playerIds: (g.player_ids as string[] | null)?.filter((id) => musicianIdSet.has(id)) ?? undefined,
      description: (g.description as string) ?? undefined,
      date: (g.date as string) ?? "",
      time: (g.time as string) ?? "",
      payout: (g.payout as number) ?? undefined,
      ticket: (g.ticket as string) ?? undefined,
      ticketUrl: (g.ticket_url as string) ?? undefined,
      subNeeded: (g.sub_needed as Event["subNeeded"]) ?? undefined,
      links: (g.links as Event["links"]) ?? undefined,
      source: (g.source as Event["source"]) ?? undefined,
      externalUrl: (g.external_url as string) ?? undefined,
    }));

    const feedPosts: FeedPost[] = postRows.filter((p) => {
      const authorId = p.author_id as string;
      if (p.author_type === "player") return musicianIdSet.has(authorId);
      if (p.author_type === "band") return bandIdSet.has(authorId);
      return venueIdSet.has(authorId);
    }).map((p) => ({
      id: p.id as string,
      scene: p.scene as SceneId,
      kind: p.kind as FeedPost["kind"],
      author: { type: p.author_type as FeedPost["author"]["type"], id: p.author_id as string },
      text: (p.text as string) ?? "",
      ago: (p.ago as string) ?? "",
      likes: (p.likes as number) ?? 0,
      comments: (p.comments as number) ?? 0,
      eventId: gigIdSet.has(p.gig_id as string) ? (p.gig_id as string) : undefined,
      video: (p.video as FeedPost["video"]) ?? undefined,
      videoOwnerId: musicianIdSet.has(p.video_owner_id as string)
        ? (p.video_owner_id as string)
        : undefined,
      subFor: (p.sub_for as FeedPost["subFor"]) ?? undefined,
    }));

    return {
      players: [...players, ...profilePlayers],
      bands: catalogBands,
      venues: catalogVenues,
      events,
      feedPosts,
    };
  },

  async load(user): Promise<PersistedData> {
    const empty: PersistedData = {
      user: null,
      following: [],
      conversations: [],
      bookings: [],
      notifications: [],
      likedPosts: [],
      respondedSubPosts: [],
      openings: [],
      projects: [],
    };
    if (!user) return empty;

    const [
      profileRes,
      followsRes,
      bookingsRes,
      convosRes,
      messagesRes,
      directConvosRes,
      directMessagesRes,
      directReadsRes,
      notificationsRes,
      likesRes,
      subsRes,
      openingsRes,
      projectsRes,
      groupsRes,
    ] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("follows").select("target_id").eq("user_id", user.id),
        supabase.from("bookings").select("*").order("created_at"),
        supabase.from("conversations").select("*").eq("user_id", user.id),
        supabase
          .from("messages")
          .select("*, conversations!inner(user_id, musician_id)")
          .eq("conversations.user_id", user.id)
          .order("created_at"),
        supabase
          .from("direct_conversations")
          .select("*")
          .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`),
        supabase.from("direct_messages").select("*").order("created_at"),
        supabase
          .from("direct_conversation_reads")
          .select("conversation_id,read_at")
          .eq("user_id", user.id),
        supabase
          .from("notifications")
          .select("id,kind,urgency,title,body,href,read_at,created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("liked_posts").select("post_id").eq("user_id", user.id),
        supabase.from("responded_sub_posts").select("post_id").eq("user_id", user.id),
        supabase.from("openings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("user_projects").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
        supabase.from("group_conversations").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      ]);

    fail("load profile", profileRes.error);
    fail("load follows", followsRes.error);
    fail("load bookings", bookingsRes.error);
    fail("load conversations", convosRes.error);
    fail("load messages", messagesRes.error);
    fail("load direct conversations", directConvosRes.error);
    fail("load direct messages", directMessagesRes.error);
    fail("load direct read markers", directReadsRes.error);
    fail("load notifications", notificationsRes.error);
    fail("load likes", likesRes.error);
    fail("load sub-responses", subsRes.error);
    fail("load openings", openingsRes.error);
    fail("load projects", projectsRes.error);
    fail("load group chats", groupsRes.error);

    const p = profileRes.data as Record<string, unknown> | null;
    // A profile row is created by a DB trigger at sign-up with no handle yet;
    // treat the user as "onboarded" (and skip the welcome flow) only once they
    // have picked a handle.
    const profile: CurrentUser | null = p && p.handle
      ? {
          id: user.id,
          name: (p.name as string) ?? "",
          handle: (p.handle as string) ?? "",
          instruments: ((p.instruments as InstrumentId[]) ?? []),
          neighborhood: (p.neighborhood as string) ?? "",
          availableTonight: Boolean(p.available_tonight),
          scene: (p.scene as SceneId) ?? "austin",
          bio: (p.bio as string) ?? "",
          genres: (p.genres as string[]) ?? [],
          gear: (p.gear as string[]) ?? [],
          availability: (p.availability as string[]) ?? [],
          rate: {
            min: (p.rate_min as number) ?? 0,
            max: (p.rate_max as number) ?? 0,
          },
          reels: Array.isArray(p.reels) ? p.reels as CurrentUser["reels"] : [],
          avatarUrl: avatarUrl(p.avatar_path),
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

    const directMessagesByConversation = new Map<string, Record<string, unknown>[]>();
    for (const row of (directMessagesRes.data ?? []) as Record<string, unknown>[]) {
      const conversationId = row.conversation_id as string;
      const rows = directMessagesByConversation.get(conversationId) ?? [];
      rows.push(row);
      directMessagesByConversation.set(conversationId, rows);
    }
    const readAtByConversation = new Map(
      ((directReadsRes.data ?? []) as { conversation_id: string; read_at: string }[])
        .map((row) => [row.conversation_id, new Date(row.read_at).getTime()]),
    );
    const directConversations: Conversation[] = (
      (directConvosRes.data ?? []) as Record<string, unknown>[]
    ).map((conversation) => {
      const conversationId = conversation.id as string;
      const playerId = conversation.participant_a === user.id
        ? conversation.participant_b as string
        : conversation.participant_a as string;
      const rows = directMessagesByConversation.get(conversationId) ?? [];
      const readAt = readAtByConversation.get(conversationId) ?? 0;
      return {
        id: conversationId,
        kind: "dm" as const,
        playerId,
        messages: rows.map((row) => ({
          id: row.id as string,
          from: row.sender_id === user.id ? "me" as const : "them" as const,
          text: (row.body as string | null) ?? undefined,
          bookingId: (row.booking_id as string | null) ?? undefined,
          at: timeLabel(row.created_at as string),
        })),
        unread: rows.filter((row) => (
          row.sender_id !== user.id && new Date(row.created_at as string).getTime() > readAt
        )).length,
      };
    });

    const bookings: Booking[] = ((bookingsRes.data ?? []) as Record<string, unknown>[]).map((b) => ({
      id: b.id as string,
      playerId: b.user_id === user.id ? b.musician_id as string : b.user_id as string,
      gigTitle: b.gig_title as string,
      venueName: b.venue_name as string,
      date: b.date as string,
      time: b.time as string,
      amount: (b.amount as number) ?? 0,
      // legacy escrow rename: rows written before held/released say "paid"
      status: (b.status === "paid" ? "held" : b.status) as BookingStatus,
      openingId: (b.opening_id as string) ?? undefined,
      direction: b.user_id === user.id ? "outgoing" : "incoming",
    }));

    const notifications: NotificationItem[] = (
      (notificationsRes.data ?? []) as Record<string, unknown>[]
    ).map((notification) => ({
      id: notification.id as string,
      kind: notification.kind as NotificationItem["kind"],
      urgency: notification.urgency as NotificationItem["urgency"],
      title: notification.title as string,
      body: (notification.body as string) ?? "",
      href: notification.href as string,
      createdAt: notification.created_at as string,
      read: notification.read_at != null,
    }));

    // group chats are stored as whole documents; they join the DM list
    const groupConversations = ((groupsRes.data ?? []) as Record<string, unknown>[]).map(
      (g) => g.data as Conversation,
    );

    return {
      user: profile,
      following: ((followsRes.data ?? []) as { target_id: string }[]).map((f) => f.target_id),
      conversations: [...groupConversations, ...directConversations, ...conversations],
      bookings,
      notifications,
      likedPosts: ((likesRes.data ?? []) as { post_id: string }[]).map((l) => l.post_id),
      respondedSubPosts: ((subsRes.data ?? []) as { post_id: string }[]).map((s) => s.post_id),
      openings: ((openingsRes.data ?? []) as Record<string, unknown>[]).map((o) => normalizeOpeningScene({
        id: o.id as string,
        scene: o.scene as SceneId,
        instrument: o.instrument as Opening["instrument"],
        postedBy: {
          kind: o.posted_by_kind as Opening["postedBy"]["kind"],
          id: o.posted_by_id as string,
        },
        eventId: (o.event_id as string) ?? undefined,
        gigAt: (o.gig_at as string) ?? undefined,
        when: o.when_label as string,
        fee: (o.fee as number) ?? 0,
        note: (o.note as string) ?? undefined,
        urgent: Boolean(o.urgent),
        status: (o.status as Opening["status"]) ?? "open",
        ago: agoLabel(o.created_at as string),
      } as Omit<Opening, "scene">)),
      projects: ((projectsRes.data ?? []) as Record<string, unknown>[]).map(
        (p) => normalizeProjectScene(p.data as Omit<Band, "scene">),
      ),
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
      scene: profile.scene,
      bio: profile.bio ?? "",
      genres: profile.genres ?? [],
      gear: profile.gear ?? [],
      availability: profile.availability ?? [],
      rate_min: profile.rate?.min ?? null,
      rate_max: profile.rate?.max ?? null,
      reels: profile.reels ?? [],
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
    if (patch.scene !== undefined) row.scene = patch.scene;
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.genres !== undefined) row.genres = patch.genres;
    if (patch.gear !== undefined) row.gear = patch.gear;
    if (patch.availability !== undefined) row.availability = patch.availability;
    if (patch.rate !== undefined) {
      row.rate_min = patch.rate.min;
      row.rate_max = patch.rate.max;
    }
    if (patch.reels !== undefined) row.reels = patch.reels;
    const { error } = await supabase.from("profiles").update(row).eq("id", user.id);
    fail("update profile", error);
  },

  async uploadAvatar(user, file) {
    const extension = file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const existing = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", user.id)
      .maybeSingle();
    fail("load current avatar", existing.error);

    const uploaded = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });
    fail("upload avatar", uploaded.error);

    const saved = await supabase
      .from("profiles")
      .update({ avatar_path: path, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (saved.error) {
      await supabase.storage.from("avatars").remove([path]);
      fail("save avatar", saved.error);
    }

    const oldPath = (existing.data as { avatar_path?: string | null } | null)?.avatar_path;
    if (oldPath && oldPath !== path) {
      await supabase.storage.from("avatars").remove([oldPath]);
    }
    return avatarUrl(path)!;
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
    if (isAccountPlayerId(playerId)) {
      const conversationId = await getOrCreateDirectConversation(user.id, playerId);
      const { error } = await supabase.from("direct_messages").insert({
        id: message.id,
        conversation_id: conversationId,
        sender_id: user.id,
        body: message.text ?? null,
        booking_id: message.bookingId ?? null,
      });
      fail("insert direct message", error);
      return;
    }

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
    if (isAccountPlayerId(playerId)) {
      const [participantA, participantB] = [user.id, playerId].sort();
      const conversation = await supabase
        .from("direct_conversations")
        .select("id")
        .eq("participant_a", participantA)
        .eq("participant_b", participantB)
        .maybeSingle();
      fail("find direct conversation to mark read", conversation.error);
      if (!conversation.data) return;
      const { error } = await supabase.from("direct_conversation_reads").upsert({
        conversation_id: (conversation.data as { id: string }).id,
        user_id: user.id,
        read_at: new Date().toISOString(),
      });
      fail("mark direct conversation read", error);
      return;
    }

    const { error } = await supabase
      .from("conversations")
      .update({ unread: 0 })
      .eq("user_id", user.id)
      .eq("musician_id", playerId);
    fail("mark read", error);
  },

  async addBooking(user, booking) {
    const realRecipient = isAccountPlayerId(booking.playerId);
    const { error } = await supabase.from("bookings").insert({
      id: booking.id,
      user_id: user.id,
      musician_id: booking.playerId,
      musician_user_id: realRecipient ? booking.playerId : null,
      gig_title: booking.gigTitle,
      venue_name: booking.venueName,
      date: booking.date,
      time: booking.time,
      amount: booking.amount,
      status: booking.status,
      opening_id: booking.openingId ?? null,
    });
    fail("add booking", error);
  },

  async setBookingStatus(_user, bookingId, status) {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);
    fail("set booking status", error);
  },

  async markNotificationRead(_user, notificationId) {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);
    fail("mark notification read", error);
  },

  async markAllNotificationsRead(_user) {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    fail("mark all notifications read", error);
  },

  async savePushSubscription(user, subscription, userAgent) {
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys?.p256dh;
    const auth = subscription.keys?.auth;
    if (!endpoint || !p256dh || !auth) throw new Error("Push subscription is incomplete.");

    const { error: subscriptionError } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent.slice(0, 500),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    fail("save push subscription", subscriptionError);

    const { error: preferenceError } = await supabase.from("notification_preferences").upsert({
      user_id: user.id,
      push_enabled: true,
      updated_at: new Date().toISOString(),
    });
    fail("enable push preference", preferenceError);
  },

  async removePushSubscription(user, endpoint) {
    const { error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);
    fail("remove push subscription", subscriptionError);

    const { error: preferenceError } = await supabase
      .from("notification_preferences")
      .update({ push_enabled: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    fail("disable push preference", preferenceError);
  },

  async addOpening(user, opening) {
    const { error } = await supabase.from("openings").insert({
      id: opening.id,
      user_id: user.id,
      scene: opening.scene,
      instrument: opening.instrument,
      posted_by_kind: opening.postedBy.kind,
      posted_by_id: opening.postedBy.id,
      event_id: opening.eventId ?? null,
      gig_at: opening.gigAt ?? null,
      when_label: opening.when,
      fee: opening.fee,
      note: opening.note ?? null,
      urgent: opening.urgent ?? false,
      status: opening.status,
    });
    fail("add opening", error);
  },

  async setOpeningStatus(user, openingId, status) {
    const { error } = await supabase
      .from("openings")
      .update({ status })
      .eq("id", openingId)
      .eq("user_id", user.id);
    fail("set opening status", error);
  },

  async upsertProject(user, project) {
    const { error } = await supabase.from("user_projects").upsert({
      id: project.id,
      user_id: user.id,
      data: project,
      updated_at: new Date().toISOString(),
    });
    fail("upsert project", error);
  },

  async upsertConversation(user, conversation) {
    // whole-document write, matching the store's upsert seam. DMs never take
    // this path (they persist row-by-row via addMessage/markRead).
    const { error } = await supabase.from("group_conversations").upsert({
      id: conversation.id,
      user_id: user.id,
      data: conversation,
      updated_at: new Date().toISOString(),
    });
    fail("upsert group chat", error);
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
