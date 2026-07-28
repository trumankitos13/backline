import { describe, expect, it } from "vitest";
import type { Player } from "./types";
import { ratingSummary } from "./ratings";

const newAccount: Player = {
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
  reviews: [],
  gigsPlayed: 0,
  verified: false,
  reels: [],
  videos: [],
  bandIds: [],
  seed: 99,
};

describe("ratingSummary", () => {
  it("does not invent ratings for a new account", () => {
    expect(ratingSummary(newAccount)).toEqual({
      avg: 0,
      count: 0,
      breakdown: [0, 0, 0, 0, 0],
    });
  });

  it("counts only real review and session values", () => {
    const reviewed = {
      ...newAccount,
      reviews: [
        { id: "r1", author: "A", role: "", rating: 5, text: "", date: "" },
        { id: "r2", author: "B", role: "", rating: 4, text: "", date: "" },
      ],
    } as Player;

    expect(ratingSummary(reviewed)).toEqual({
      avg: 4.5,
      count: 2,
      breakdown: [1, 1, 0, 0, 0],
    });
  });
});
