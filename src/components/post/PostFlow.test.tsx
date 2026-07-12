import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tomorrowIso } from "../../lib/scheduling";
import { PostFlow } from "./PostFlow";

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
    api: { postOpening: vi.fn() },
  }),
}));

describe("PostFlow", () => {
  afterEach(cleanup);

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

  it("does not enable posting until date, time, role, and fee are present", () => {
    render(
      <MemoryRouter>
        <PostFlow open onClose={() => {}} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /Pick an instrument/i })).toBeDisabled();
  });
});
