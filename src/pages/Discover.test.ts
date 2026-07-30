import { describe, expect, it } from "vitest";
import type { Player } from "../lib/types";
import { hasPlayerMedia, matchesDiscoverPlayer } from "./Discover";

const freshAccount: Player = {
  id: "9db031de-bb23-4da7-826c-f47aa12cc5e5",
  scene: "austin",
  name: "Fresh Account",
  handle: "fresh_account",
  instruments: [{ id: "drums", level: "semi-pro", years: 0 }],
  genres: [],
  bio: "",
  gear: [],
  neighborhood: "East Austin",
  distanceMiles: 0,
  rate: { min: 0, max: 0 },
  availableTonight: false,
  availability: [],
  responseMins: 0,
  gigsPlayed: 0,
  verified: false,
  reels: [],
  videos: [],
  reviews: [],
  bandIds: [],
  seed: 1,
};

describe("Discover account matching", () => {
  it("keeps a completed account searchable even before it uploads media", () => {
    expect(hasPlayerMedia(freshAccount)).toBe(false);
    expect(matchesDiscoverPlayer(freshAccount, {
      query: "fresh_account",
      selected: [],
      tonightOnly: false,
      verifiedOnly: false,
      near3: false,
      currentUserId: "another-user",
    })).toBe(true);
  });

  it("does not offer the signed-in account as its own message target", () => {
    expect(matchesDiscoverPlayer(freshAccount, {
      query: "",
      selected: [],
      tonightOnly: false,
      verifiedOnly: false,
      near3: false,
      currentUserId: freshAccount.id,
    })).toBe(false);
  });
});
