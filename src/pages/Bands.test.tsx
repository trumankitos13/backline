import { describe, expect, it } from "vitest";
import { getOpenSlots } from "./Bands";
import { installCatalog, demoCatalogForScene } from "../lib/data";

describe("getOpenSlots", () => {
  it("reads the current mutable band catalog instead of the module's initial catalog", () => {
    const austin = demoCatalogForScene("austin");
    const nashville = demoCatalogForScene("nashville");

    try {
      installCatalog(austin);
      expect(getOpenSlots().every(({ band }) => band.scene === "austin")).toBe(true);

      installCatalog(nashville);
      expect(getOpenSlots().every(({ band }) => band.scene === "nashville")).toBe(true);
    } finally {
      installCatalog(austin);
    }
  });
});
