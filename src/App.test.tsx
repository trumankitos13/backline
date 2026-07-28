import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const appState = {
  auth: {
    status: "signedIn" as const,
    user: { id: "account-a", email: "player@example.com" },
  },
  state: {
    user: {
      id: "account-a",
      name: "Test Player",
      handle: "testplayer",
      instruments: ["guitar"],
      neighborhood: "Nashville",
      availableTonight: false,
      scene: "nashville" as const,
    },
  },
};

vi.mock("./lib/store", () => ({
  useApp: () => appState,
}));

vi.mock("./lib/backend", () => ({
  isCloudBackend: true,
}));

vi.mock("./components/shell", () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./pages/Discover", () => ({
  default: () => <div>Discover screen</div>,
}));

describe("App authentication routing", () => {
  afterEach(cleanup);

  it("leaves onboarding when sign-in restores a completed profile", async () => {
    render(
      <MemoryRouter initialEntries={["/welcome"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Discover screen")).toBeInTheDocument();
    expect(screen.queryByText("Who are you?")).not.toBeInTheDocument();
  });
});
