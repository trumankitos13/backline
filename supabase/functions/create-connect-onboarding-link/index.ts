import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.0";

type StripeAccount = {
  id: string;
  details_submitted?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
};

type StripeAccountLink = {
  url: string;
  expires_at: number;
};

function keyFromDictionary(name: "SUPABASE_PUBLISHABLE_KEYS" | "SUPABASE_SECRET_KEYS"): string {
  const value = Deno.env.get(name);
  if (!value) return "";
  try {
    const keys = JSON.parse(value) as Record<string, string>;
    return keys.default ?? Object.values(keys)[0] ?? "";
  } catch {
    return "";
  }
}

function response(body: unknown, status = 200, origin?: string): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(origin ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        Vary: "Origin",
      } : {}),
    },
  });
}

async function stripePost<T>(
  path: string,
  values: Record<string, string>,
  idempotencyKey?: string,
): Promise<T> {
  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) throw new Error("Stripe is not configured");

  const stripeResponse = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: new URLSearchParams(values),
  });
  const payload = await stripeResponse.json() as T & { error?: { message?: string } };
  if (!stripeResponse.ok) {
    throw new Error(payload.error?.message ?? `Stripe request failed (${stripeResponse.status})`);
  }
  return payload;
}

Deno.serve(async (request) => {
  const appUrlValue = Deno.env.get("APP_URL") ?? "";
  let appOrigin: string;
  try {
    const appUrl = new URL(appUrlValue);
    if (appUrl.protocol !== "https:" && appUrl.hostname !== "localhost") throw new Error();
    appOrigin = appUrl.origin;
  } catch {
    return response({ error: "Server configuration missing" }, 500);
  }

  if (request.method === "OPTIONS") return response({ ok: true }, 200, appOrigin);
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405, appOrigin);
  if (request.headers.get("origin") !== appOrigin) {
    return response({ error: "Origin not allowed" }, 403, appOrigin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = keyFromDictionary("SUPABASE_PUBLISHABLE_KEYS")
    || Deno.env.get("SUPABASE_ANON_KEY")
    || "";
  const secretKey = keyFromDictionary("SUPABASE_SECRET_KEYS")
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    || "";
  const authorization = request.headers.get("authorization") ?? "";
  if (!supabaseUrl || !publishableKey || !secretKey || !authorization.startsWith("Bearer ")) {
    return response({ error: "Unauthorized" }, 401, appOrigin);
  }

  const scoped = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: authError } = await scoped.auth.getUser();
  if (authError || !user) return response({ error: "Unauthorized" }, 401, appOrigin);

  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });

  try {
    const { data: existing, error: existingError } = await admin
      .from("connected_accounts")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingError) throw existingError;

    let accountId = existing?.stripe_account_id as string | undefined;
    if (!accountId) {
      const accountValues: Record<string, string> = {
        type: "express",
        country: "US",
        "capabilities[transfers][requested]": "true",
        "business_profile[product_description]": "Live-music booking and payouts through Backline",
        "metadata[backline_user_id]": user.id,
      };
      if (user.email) accountValues.email = user.email;

      const account = await stripePost<StripeAccount>(
        "accounts",
        accountValues,
        `connect-account-${user.id}`,
      );
      accountId = account.id;

      const { error: saveError } = await admin.from("connected_accounts").upsert({
        user_id: user.id,
        stripe_account_id: account.id,
        details_submitted: Boolean(account.details_submitted),
        charges_enabled: Boolean(account.charges_enabled),
        payouts_enabled: Boolean(account.payouts_enabled),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (saveError) throw saveError;
    }

    const link = await stripePost<StripeAccountLink>("account_links", {
      account: accountId,
      refresh_url: `${appOrigin}/profile?connect=refresh`,
      return_url: `${appOrigin}/profile?connect=return`,
      type: "account_onboarding",
      "collection_options[fields]": "eventually_due",
    });

    return response({ url: link.url, expiresAt: link.expires_at }, 200, appOrigin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start payout onboarding";
    console.error("[backline] payout onboarding failed", message);
    return response({ error: "Could not start payout onboarding" }, 502, appOrigin);
  }
});
