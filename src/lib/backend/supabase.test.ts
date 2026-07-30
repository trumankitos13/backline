import { describe, expect, it, vi } from "vitest";

type QueryResult = { data: unknown; error: null };

const rows: Record<string, unknown> = {
  profiles: { id: "user-1", handle: "player", scene: "nashville" },
  follows: [],
  bookings: [],
  conversations: [],
  messages: [],
  direct_conversations: [],
  direct_messages: [],
  direct_conversation_reads: [],
  notifications: [],
  notification_preferences: null,
  liked_posts: [],
  responded_sub_posts: [],
  openings: [
    {
      id: "nashville-opening",
      scene: "nashville",
      instrument: "drums",
      posted_by_kind: "player",
      posted_by_id: "user-1",
      when_label: "Tonight",
      created_at: new Date().toISOString(),
    },
    {
      id: "legacy-opening",
      instrument: "bass",
      posted_by_kind: "player",
      posted_by_id: "user-1",
      when_label: "Tomorrow",
      created_at: new Date().toISOString(),
    },
  ],
  user_projects: [],
  group_conversations: [],
};
const deletedTables: string[] = [];

function query(data: unknown, table?: string) {
  const result: QueryResult = { data, error: null };
  const chain = {
    select: () => chain,
    delete: () => {
      if (table) deletedTables.push(table);
      return chain;
    },
    eq: () => chain,
    gt: () => chain,
    not: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve(result),
    then: <TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return chain;
}

vi.mock("../supabase", () => ({
  supabase: {
    from: (table: string) => query(rows[table], table),
    rpc: () => Promise.resolve({ data: [], error: null }),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://example.test/${path}` },
        }),
      }),
    },
  },
}));

import { supabaseBackend } from "./supabase";

describe("supabaseBackend.load", () => {
  it("preserves an opening's stored scene and defaults only legacy rows to Austin", async () => {
    const data = await supabaseBackend.load({ id: "user-1", email: null });

    expect(data.openings.map((opening) => [opening.id, opening.scene])).toEqual([
      ["nashville-opening", "nashville"],
      ["legacy-opening", "austin"],
    ]);
  });
});

describe("supabaseBackend.loadCatalog", () => {
  it("returns completed account profiles without requiring media or legacy seed rows", async () => {
    const previousProfiles = rows.profiles;
    rows.profiles = [
      {
        id: "9db031de-bb23-4da7-826c-f47aa12cc5e5",
        scene: "austin",
        name: "Fresh Account",
        handle: "fresh_account",
        instruments: ["drums"],
        genres: [],
        bio: "",
        gear: [],
        neighborhood: "East Austin",
        rate_min: null,
        rate_max: null,
        availability: [],
        reels: [],
        avatar_path: null,
      },
    ];

    try {
      const catalog = await supabaseBackend.loadCatalog("austin");

      expect(catalog).not.toBeNull();
      expect(catalog?.players).toHaveLength(1);
      expect(catalog?.players[0]).toMatchObject({
        id: "9db031de-bb23-4da7-826c-f47aa12cc5e5",
        handle: "fresh_account",
        videos: [],
        reels: [],
      });
      expect(catalog?.bands).toEqual([]);
      expect(catalog?.venues).toEqual([]);
      expect(catalog?.events).toEqual([]);
      expect(catalog?.feedPosts).toEqual([]);
    } finally {
      rows.profiles = previousProfiles;
    }
  });
});

describe("supabaseBackend.reset", () => {
  it("clears every user-owned prototype activity table while keeping the profile", async () => {
    deletedTables.length = 0;

    await supabaseBackend.reset({ id: "user-1", email: null });

    expect(deletedTables).toEqual([
      "follows",
      "bookings",
      "conversations",
      "liked_posts",
      "responded_sub_posts",
      "openings",
      "user_projects",
      "group_conversations",
    ]);
    expect(deletedTables).not.toContain("profiles");
  });
});
