import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleOpening, todayIso, tomorrowIso } from "../../lib/scheduling";
import { PostFlow } from "./PostFlow";

const postOpening = vi.fn();

const state = {
  user: {
    name: "Test Player",
    handle: "testplayer",
    instruments: ["guitar"],
    neighborhood: "East Austin",
    availableTonight: false,
    scene: "austin" as const,
  },
  projects: [],
};

vi.mock("../../lib/store", () => ({
  useApp: () => ({
    state,
    api: { postOpening },
  }),
}));

describe("PostFlow", () => {
  afterEach(() => {
    cleanup();
    postOpening.mockClear();
  });

  function yesterdayIso() {
    const yesterday = new Date(`${todayIso()}T12:00:00.000Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return yesterday.toISOString().slice(0, 10);
  }

  it("sets tomorrow when the quick action is pressed", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PostFlow open onClose={() => {}} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Tomorrow" }));

    expect(screen.getByLabelText("Gig date")).toHaveValue(tomorrowIso());
  });

  it("sets today when the quick action is pressed", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PostFlow open onClose={() => {}} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Today" }));

    expect(screen.getByLabelText("Gig date")).toHaveValue(todayIso());
  });

  it("does not enable posting until date, time, role, and fee are present", () => {
    render(
      <MemoryRouter>
        <PostFlow open onClose={() => {}} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /Pick an instrument/i })).toBeDisabled();
  });

  it("rejects a past date even when every other required field is present", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PostFlow open onClose={() => {}} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Gtr" }));
    await user.type(screen.getByLabelText("Gig date"), yesterdayIso());
    await user.type(screen.getByLabelText("Gig time"), "19:30");
    await user.type(screen.getByLabelText("Fee"), "150");

    const submit = screen.getByRole("button", { name: "Add a fee to post" });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(postOpening).not.toHaveBeenCalled();
  });

  it("posts the scheduled display label and instant once date, time, role, and fee are present", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PostFlow open onClose={() => {}} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Gtr" }));
    await user.click(screen.getByRole("button", { name: "Today" }));
    await user.type(screen.getByLabelText("Gig time"), "19:30");
    await user.type(screen.getByLabelText("Fee"), "150");
    await user.click(screen.getByRole("button", { name: "Post Guitar opening" }));

    expect(postOpening).toHaveBeenCalledWith(
      expect.objectContaining({
        instrument: "guitar",
        fee: 150,
        when: scheduleOpening(todayIso(), "19:30").label,
        gigAt: scheduleOpening(todayIso(), "19:30").gigAt,
      }),
    );
  });
});
