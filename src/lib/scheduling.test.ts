import { describe, expect, it } from "vitest";
import { scheduleOpening } from "./scheduling";

describe("scheduleOpening", () => {
  it("turns a Central date and time into an ISO instant and display label", () => {
    expect(scheduleOpening("2026-07-14", "19:30")).toEqual({
      gigAt: "2026-07-15T00:30:00.000Z",
      label: "Tue, Jul 14 · 7:30 PM",
    });
  });
});
