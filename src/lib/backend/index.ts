// Picks the backend at load time: real Supabase when configured, else the
// localStorage demo backend. The rest of the app imports `backend` from here
// and never touches either implementation directly.

import { isSupabaseConfigured } from "../supabase";
import { localBackend } from "./local";
import { supabaseBackend } from "./supabase";
import type { Backend } from "./types";

export const backend: Backend = isSupabaseConfigured ? supabaseBackend : localBackend;

/** true when running against real Supabase auth + Postgres */
export const isCloudBackend = backend.mode === "supabase";

export type {
  AuthUser,
  AvailabilityLocation,
  AvailabilityMatch,
  PersistedData,
  SosBroadcastDetails,
  SosBroadcastResult,
} from "./types";
