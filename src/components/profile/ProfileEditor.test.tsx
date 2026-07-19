import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../../lib/types";
import { ProfileEditor } from "./ProfileEditor";

const user: CurrentUser = {
  id: "user-1",
  name: "June Carter",
  handle: "junecarter",
  instruments: ["vocals"],
  neighborhood: "East Nashville",
  availableTonight: false,
  scene: "nashville",
};

describe("ProfileEditor", () => {
  it("saves public profile details and a validated reel", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const interaction = userEvent.setup();
    render(
      <ProfileEditor
        user={user}
        onCancel={() => {}}
        onSave={onSave}
        onUploadAvatar={vi.fn()}
      />,
    );

    await interaction.type(
      screen.getByPlaceholderText("What do you play, and what kind of calls are you looking for?"),
      "Harmony vocals and rhythm guitar.",
    );
    await interaction.type(
      screen.getByPlaceholderText("https://youtube.com/shorts/…"),
      "https://youtube.com/shorts/abcDEF_1234",
    );
    await interaction.type(screen.getByPlaceholderText("Caption (optional)"), "Live at The 5 Spot");
    await interaction.click(screen.getByRole("button", { name: "Add reel" }));
    await interaction.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      bio: "Harmony vocals and rhythm guitar.",
      reels: [expect.objectContaining({
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=abcDEF_1234",
      })],
    }));
  });
});
