import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// `globals: false` means Testing Library can't install its own auto-cleanup,
// so every render would otherwise stay mounted and later queries in the same
// file would match elements left over from earlier tests.
afterEach(cleanup);
