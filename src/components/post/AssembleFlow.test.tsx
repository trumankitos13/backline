import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleOpening, tomorrowIso } from "../../lib/scheduling";
import { AssembleFlow } from "./AssembleFlow";

const { createProject } = vi.hoisted(() => ({
  createProject: vi.fn(() => "project-1"),
}));

const state = {
  user: {
    name: "Test Player",
    handle: "testplayer",
    instruments: ["guitar"],
    neighborhood: "East Austin",
    availableTonight: false,
    scene: "austin" as const,
  },
};

vi.mock("../../lib/store", () => ({
  useApp: () => ({
    state,
    api: { createProject },
  }),
}));

describe("AssembleFlow", () => {
  afterEach(() => {
    cleanup();
    createProject.mockClear();
  });

  it("propagates its schedule label and instant to the project creation", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AssembleFlow open onClose={() => {}} />
      </MemoryRouter>,
    );

    await user.click(screen.getAllByRole("button", { name: /^Drums$/i }).at(-1)!);
    await user.click(screen.getByRole("button", { name: "Tomorrow" }));
    await user.type(screen.getByLabelText("Gig time"), "19:30");
    await user.type(screen.getByLabelText("Fee per seat"), "175");
    await user.click(screen.getByRole("button", { name: "Assemble — post 1 seat" }));

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        seats: ["drums"],
        feePerSeat: 175,
        when: scheduleOpening(tomorrowIso(), "19:30").label,
        gigAt: scheduleOpening(tomorrowIso(), "19:30").gigAt,
      }),
    );
  });
});
