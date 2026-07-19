import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.0";

type BookingRow = {
  id: string;
  user_id: string;
  musician_user_id: string | null;
  gig_title: string;
  gig_at: string | null;
  amount: number;
  status: string;
};

type PaymentRow = {
  stripe_payment_intent_id: string | null;
  status: string;
  attempt_number: number;
};

type PaymentIntent = {
  id: string;
  client_secret: string | null;
  status: string;
  livemode: boolean;
};

function dictionaryKey(name: "SUPABASE_PUBLISHABLE_KEYS" | "SUPABASE_SECRET_KEYS"): string {
  const value = Deno.env.get(name);
  if (!value) return "";
  try {
    const keys = JSON.parse(value) as Record<string, string>;
    return keys.default ?? Object.values(keys)[0] ?? "";
  } catch {
    return "";
  }
}

function response(body: unknown, status: number, origin: string): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    },
  });
}

async function stripeRequest<T>(
  path: string,
  method: "GET" | "POST",
  values?: Record<string, string>,
  idempotencyKey?: string,
): Promise<T> {
  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) throw new Error("Stripe is not configured");
  const stripeResponse = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: method === "POST" && values ? new URLSearchParams(values) : undefined,
  });
  const payload = await stripeResponse.json() as T & { error?: { message?: string } };
  if (!stripeResponse.ok) {
    throw new Error(payload.error?.message ?? `Stripe request failed (${stripeResponse.status})`);
  }
  return payload;
}

Deno.serve(async (request) => {
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const expectedLiveMode = Deno.env.get("STRIPE_LIVE_MODE");
  const stripeModeMatches = expectedLiveMode === "true"
    ? stripeSecret.startsWith("sk_live_")
    : expectedLiveMode === "false" && stripeSecret.startsWith("sk_test_");
  if (!stripeModeMatches) {
    return Response.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const configuredUrl = Deno.env.get("APP_URL") ?? "";
  let appOrigin: string;
  try {
    const appUrl = new URL(configuredUrl);
    if (appUrl.protocol !== "https:" && appUrl.hostname !== "localhost") throw new Error();
    appOrigin = appUrl.origin;
  } catch {
    return Response.json({ error: "Server configuration missing" }, { status: 500 });
  }

  if (request.method === "OPTIONS") return response({ ok: true }, 200, appOrigin);
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405, appOrigin);
  if (request.headers.get("origin") !== appOrigin) {
    return response({ error: "Origin not allowed" }, 403, appOrigin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = dictionaryKey("SUPABASE_PUBLISHABLE_KEYS")
    || Deno.env.get("SUPABASE_ANON_KEY")
    || "";
  const adminKey = dictionaryKey("SUPABASE_SECRET_KEYS")
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    || "";
  const authorization = request.headers.get("authorization") ?? "";
  if (!supabaseUrl || !publishableKey || !adminKey || !authorization.startsWith("Bearer ")) {
    return response({ error: "Unauthorized" }, 401, appOrigin);
  }

  const scoped = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: authError } = await scoped.auth.getUser();
  if (authError || !user) return response({ error: "Unauthorized" }, 401, appOrigin);

  let bookingId: string;
  try {
    const body = await request.json() as { bookingId?: unknown };
    if (typeof body.bookingId !== "string" || !/^bk-[A-Za-z0-9-]{1,100}$/.test(body.bookingId)) {
      return response({ error: "Booking id invalid" }, 400, appOrigin);
    }
    bookingId = body.bookingId;
  } catch {
    return response({ error: "Request body invalid" }, 400, appOrigin);
  }

  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });
  try {
    const { data: bookingData, error: bookingError } = await admin
      .from("bookings")
      .select("id,user_id,musician_user_id,gig_title,gig_at,amount,status")
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (bookingError) throw bookingError;
    if (!bookingData) return response({ error: "Booking not found" }, 404, appOrigin);
    const booking = bookingData as BookingRow;
    if (booking.status !== "accepted") {
      return response({ error: "Booking must be accepted before payment" }, 409, appOrigin);
    }
    if (!booking.musician_user_id || !booking.gig_at) {
      return response({ error: "Booking is not eligible for online payment" }, 409, appOrigin);
    }

    const gigAt = new Date(booking.gig_at).getTime();
    const leadMs = gigAt - Date.now();
    if (!Number.isFinite(gigAt) || leadMs < 15 * 60 * 1000 || leadMs > 72 * 60 * 60 * 1000) {
      return response({ error: "Card holds are available from 72 hours before the gig" }, 409, appOrigin);
    }

    const { data: connected, error: connectedError } = await admin
      .from("connected_accounts")
      .select("stripe_account_id,payouts_enabled")
      .eq("user_id", booking.musician_user_id)
      .maybeSingle();
    if (connectedError) throw connectedError;
    if (!connected?.payouts_enabled) {
      return response({ error: "The musician must finish payout setup first" }, 409, appOrigin);
    }

    const { data: existingData, error: existingError } = await admin
      .from("booking_payments")
      .select("stripe_payment_intent_id,status,attempt_number")
      .eq("booking_id", booking.id)
      .maybeSingle();
    if (existingError) throw existingError;
    const existing = existingData as PaymentRow | null;

    if (existing?.stripe_payment_intent_id && !["cancelled", "failed"].includes(existing.status)) {
      const intent = await stripeRequest<PaymentIntent>(
        `payment_intents/${encodeURIComponent(existing.stripe_payment_intent_id)}`,
        "GET",
      );
      if (intent.livemode !== (expectedLiveMode === "true")) {
        throw new Error("Existing PaymentIntent mode mismatch");
      }
      if (!intent.client_secret) throw new Error("Existing PaymentIntent has no client secret");
      return response({ clientSecret: intent.client_secret }, 200, appOrigin);
    }

    const attempt = existing ? existing.attempt_number + 1 : 1;
    const musicianAmount = Math.round(Number(booking.amount) * 100);
    const serviceFee = Math.round(musicianAmount * 0.1);
    const total = musicianAmount + serviceFee;
    if (!Number.isSafeInteger(total) || musicianAmount <= 0 || total > 100_000_00) {
      return response({ error: "Booking amount invalid" }, 409, appOrigin);
    }

    const intent = await stripeRequest<PaymentIntent>(
      "payment_intents",
      "POST",
      {
        amount: String(total),
        currency: "usd",
        capture_method: "manual",
        "payment_method_types[]": "card",
        application_fee_amount: String(serviceFee),
        "transfer_data[destination]": connected.stripe_account_id,
        description: booking.gig_title.slice(0, 500),
        "metadata[booking_id]": booking.id,
        "metadata[payer_id]": booking.user_id,
        "metadata[payee_id]": booking.musician_user_id,
      },
      `booking-payment-${booking.id}-${attempt}`,
    );
    if (intent.livemode !== (expectedLiveMode === "true")) {
      throw new Error("PaymentIntent mode mismatch");
    }
    if (!intent.client_secret) throw new Error("PaymentIntent has no client secret");

    const { error: saveError } = await admin.from("booking_payments").upsert({
      booking_id: booking.id,
      payer_id: booking.user_id,
      payee_id: booking.musician_user_id,
      stripe_payment_intent_id: intent.id,
      stripe_latest_charge_id: null,
      stripe_transfer_id: null,
      currency: "usd",
      musician_amount_cents: musicianAmount,
      service_fee_cents: serviceFee,
      total_amount_cents: total,
      status: intent.status === "requires_action" ? "requires_action" : "requires_payment_method",
      authorization_expires_at: null,
      failure_code: null,
      failure_message: null,
      attempt_number: attempt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "booking_id" });
    if (saveError) throw saveError;

    return response({ clientSecret: intent.client_secret }, 200, appOrigin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment setup failed";
    console.error("[backline] create booking payment failed", bookingId, message);
    return response({ error: "Could not start payment" }, 502, appOrigin);
  }
});
