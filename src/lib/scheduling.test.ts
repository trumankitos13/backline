import { describe, expect, it } from "vitest";
import { isSelectableGigDate, scheduleOpening } from "./scheduling";

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
