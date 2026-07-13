import { describe, expect, it, vi } from "vitest";

type QueryResult = { data: unknown; error: null };

const rows: Record<string, unknown> = {
  profiles: { id: "user-1", handle: "player", scene: "nashville" },
  follows: [],
  bookings: [],
  conversations: [],
  messages: [],
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

function query(data: unknown) {
  const result: QueryResult = { data, error: null };
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
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
    from: (table: string) => query(rows[table]),
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
