// Supabase browser client for Backline.
//
// Uses the PUBLISHABLE (anon) key only — never the service_role/secret key.
// Anything read from import.meta.env is bundled into the client and shipped to
// the browser; row access is enforced server-side by RLS (see
// supabase/migrations), not by hiding this key.
//
// When the env vars are absent the app runs in demo mode (localStorage) and
// this client is never used — see src/lib/backend. `supabase` is only
// dereferenced by supabaseBackend, which is only selected when configured.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url, anonKey)
  : (null as unknown as SupabaseClient);
