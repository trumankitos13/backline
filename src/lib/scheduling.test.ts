import { describe, expect, it } from "vitest";
import { isSelectableGigDate, scheduleOpening } from "./scheduling";
import { filterCatalogRoots } from "./backend/supabase";
import { localBackend } from "./backend/local";
import { installCatalog, loadAndInstallCatalog, PLAYERS } from "./data";

describe("filterCatalogRoots", () => {
  it("keeps only records belonging to the selected scene", () => {
    expect(
      filterCatalogRoots(
        [
          { id: "a", scene: "austin" },
          { id: "n", scene: "nashville" },
        ],
        "nashville",
      ),
    ).toEqual([{ id: "n", scene: "nashville" }]);
  });
});

describe("local catalog loading", () => {
  it("returns a catalog scoped to the requested scene", async () => {
    const austinCatalog = await localBackend.loadCatalog("austin");
    installCatalog(austinCatalog!);
    const catalog = await localBackend.loadCatalog("nashville");

    expect(catalog?.players).not.toHaveLength(0);
    expect(catalog?.players.every((player) => player.scene === "nashville")).toBe(true);
    expect(catalog?.bands.every((band) => band.scene === "nashville")).toBe(true);
    expect(catalog?.venues.every((venue) => venue.scene === "nashville")).toBe(true);
    expect(catalog?.events.every((event) => event.scene === "nashville")).toBe(true);
    expect(catalog?.feedPosts.every((post) => post.scene === "nashville")).toBe(true);
  });

  it("starts loading the selected catalog immediately and installs it when ready", async () => {
    const austinCatalog = await localBackend.loadCatalog("austin");
    let requestedScene: string | undefined;
    let resolveCatalog: ((catalog: Awaited<ReturnType<typeof localBackend.loadCatalog>>) => void) | undefined;
    const catalogPromise = new Promise<Awaited<ReturnType<typeof localBackend.loadCatalog>>>(
      (resolve) => {
        resolveCatalog = resolve;
      },
    );

    try {
      const installing = loadAndInstallCatalog("nashville", (scene) => {
        requestedScene = scene;
        return catalogPromise;
      });

      expect(requestedScene).toBe("nashville");
      resolveCatalog!(await localBackend.loadCatalog("nashville"));
      await installing;

      expect(PLAYERS.every((player) => player.scene === "nashville")).toBe(true);
    } finally {
      installCatalog(austinCatalog!);
    }
  });
});

describe("scheduleOpening", () => {
  it("turns a Central date and time into an ISO instant and display label", () => {
    expect(scheduleOpening("2026-07-14", "19:30")).toEqual({
      gigAt: "2026-07-15T00:30:00.000Z",
      label: "Tue, Jul 14 · 7:30 PM",
    });
  });
});

describe("isSelectableGigDate", () => {
  it("rejects a past calendar day", () => {
    expect(isSelectableGigDate("2026-07-11", "2026-07-12")).toBe(false);
  });

  it("keeps today selectable", () => {
    expect(isSelectableGigDate("2026-07-12", "2026-07-12")).toBe(true);
  });
});
