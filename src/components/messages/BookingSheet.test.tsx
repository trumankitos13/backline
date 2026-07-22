import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLAYERS } from "../../lib/data";
import { scheduleOpening, tomorrowIso } from "../../lib/scheduling";
import { BookingSheet } from "./BookingSheet";

const sendBookingOffer = vi.fn();

vi.mock("../../lib/store", () => ({
  useApp: () => ({
    state: { openings: [], projects: [] },
    api: { sendBookingOffer },
  }),
}));

describe("BookingSheet", () => {
  afterEach(() => {
    cleanup();
    sendBookingOffer.mockClear();
  });

  it("uses Tomorrow without submitting and persists the canonical gig instant", async () => {
    const user = userEvent.setup();
    const musician = PLAYERS[0]!;
    const onClose = vi.fn();
    render(
      <BookingSheet open onClose={onClose} musician={musician} />,
    );

    await user.click(screen.getByRole("button", { name: "Tomorrow" }));
    expect(sendBookingOffer).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Gig date")).toHaveValue(tomorrowIso());

    await user.click(screen.getByRole("button", { name: "Send offer" }));

    const scheduled = scheduleOpening(tomorrowIso(), "21:00");
    const [date, time] = scheduled.label.split(" · ");
    expect(sendBookingOffer).toHaveBeenCalledWith(expect.objectContaining({
      playerId: musician.id,
      date,
      time,
      gigAt: scheduled.gigAt,
    }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
