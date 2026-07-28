import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
const setUser = vi.fn();

vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("../../lib/store", () => ({ useApp: () => ({ api: { setUser } }) }));

import { SignupSteps } from "./SignupSteps";

/** Walk the three onboarding steps and press the final button. */
async function completeOnboarding(handle: string) {
  const interaction = userEvent.setup();
  render(<SignupSteps />);

  await interaction.type(screen.getByPlaceholderText("Ray Delgado"), "Ray Delgado");
  const handleField = screen.getByPlaceholderText("raydelgado");
  await interaction.clear(handleField);
  await interaction.type(handleField, handle);
  await interaction.click(screen.getByRole("button", { name: /Next/ }));

  await interaction.click(screen.getByRole("button", { name: /Drums/ }));
  await interaction.click(screen.getByRole("button", { name: /Next/ }));

  await interaction.click(screen.getByRole("button", { name: /Austin/ }));
  await interaction.click(screen.getByRole("button", { name: /Take me to the scene/ }));
  return interaction;
}

describe("SignupSteps", () => {
  beforeEach(() => {
    navigate.mockReset();
    setUser.mockReset();
  });

  it("enters the app once the profile is persisted", async () => {
    setUser.mockResolvedValue(undefined);

    await completeOnboarding("raydelgado");

    expect(setUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ray Delgado", handle: "raydelgado", scene: "austin" }),
    );
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("keeps a taken handle on the signup screen instead of walking into the app", async () => {
    setUser.mockRejectedValue(
      new Error('save profile: duplicate key value violates unique constraint "profiles_handle_key"'),
    );

    await completeOnboarding("raydelgado");

    expect(await screen.findByText(/@raydelgado is already taken/)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("reports a failed write rather than silently dropping the profile", async () => {
    setUser.mockRejectedValue(new Error("Failed to fetch"));

    await completeOnboarding("raydelgado");

    expect(await screen.findByText(/Failed to fetch/)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("rejects a handle Postgres would refuse before the write leaves the browser", async () => {
    const interaction = userEvent.setup();
    render(<SignupSteps />);

    await interaction.type(screen.getByPlaceholderText("Ray Delgado"), "Al");
    const handleField = screen.getByPlaceholderText("raydelgado");
    await interaction.clear(handleField);
    await interaction.type(handleField, "al");

    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
    expect(screen.getByText(/Handles need 3–30 lowercase/)).toBeInTheDocument();
  });
});
