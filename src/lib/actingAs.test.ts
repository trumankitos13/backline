import { describe, expect, it } from "vitest";
import { myActingContexts } from "./actingAs";
import type { Band, CurrentUser } from "./types";

const user: CurrentUser = {
  name: "Test Player",
  handle: "testplayer",
  instruments: ["guitar"],
  neighborhood: "East Austin",
  availableTonight: false,
  scene: "nashville",
};

function project(id: string, scene: Band["scene"]): Band {
  return {
    id,
    scene,
    name: id,
    genres: [],
    bio: "",
    neighborhood: "",
    members: [],
    openSlots: [],
    followers: 0,
    eventIds: [],
    seed: 1,
    kind: "project",
  };
}

describe("myActingContexts", () => {
  it("does not offer projects from another scene as posting contexts", () => {
    const contexts = myActingContexts(user, [
      project("austin-project", "austin"),
      project("nashville-project", "nashville"),
    ]);

    expect(contexts.map((context) => context.id)).toContain("nashville-project");
    expect(contexts.map((context) => context.id)).not.toContain("austin-project");
  });
});
