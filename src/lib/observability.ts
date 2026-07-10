// Observability — error tracking (Sentry) + product analytics (PostHog), both
// OPTIONAL and dormant until their env vars are set. The SDKs are dynamically
// imported so a build with no keys never loads them. Safe to call everywhere;
// every function no-ops when unconfigured (e.g. demo mode).

type SentryModule = typeof import("@sentry/react");
type PosthogModule = typeof import("posthog-js");

let sentry: SentryModule | null = null;
let posthog: PosthogModule["default"] | null = null;

const DSN = import.meta.env.VITE_SENTRY_DSN;
const PH_KEY = import.meta.env.VITE_POSTHOG_KEY;
const PH_HOST = import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com";
const ENV = import.meta.env.MODE;

/** Initialize whatever is configured. Call once at boot. */
export async function initObservability(): Promise<void> {
  if (DSN) {
    try {
      sentry = await import("@sentry/react");
      sentry.init({
        dsn: DSN,
        environment: ENV,
        tracesSampleRate: 0.1,
        // don't spam Sentry in local dev
        enabled: import.meta.env.PROD,
      });
    } catch (e) {
      console.warn("[observability] Sentry init failed", e);
    }
  }

  if (PH_KEY) {
    try {
      const mod = await import("posthog-js");
      posthog = mod.default;
      posthog.init(PH_KEY, {
        api_host: PH_HOST,
        capture_pageview: true,
        person_profiles: "identified_only",
      });
    } catch (e) {
      console.warn("[observability] PostHog init failed", e);
    }
  }
}

/** Report an error (no-op if Sentry isn't configured). */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (sentry) sentry.captureException(error, context ? { extra: context } : undefined);
  else if (import.meta.env.DEV) console.error("[captureError]", error, context);
}

/** Track a product event (no-op if PostHog isn't configured). */
export function track(event: string, props?: Record<string, unknown>): void {
  posthog?.capture(event, props);
}

/** Associate events with a signed-in user; call on sign-in, clear on sign-out. */
export function identify(userId: string | null, traits?: Record<string, unknown>): void {
  if (!posthog) return;
  if (userId) posthog.identify(userId, traits);
  else posthog.reset();
  if (sentry) sentry.setUser(userId ? { id: userId } : null);
}
