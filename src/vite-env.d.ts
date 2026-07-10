/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://xxxx.supabase.co */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase publishable ("anon") key — safe to ship to the browser */
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Sentry DSN — enables error tracking when set */
  readonly VITE_SENTRY_DSN?: string;
  /** PostHog project key — enables product analytics when set */
  readonly VITE_POSTHOG_KEY?: string;
  /** PostHog host (defaults to US cloud) */
  readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
