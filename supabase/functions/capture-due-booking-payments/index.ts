import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import Stripe from "npm:stripe@22.3.2";

type ClaimedPayment = {
  payment_id: string;
  booking_id: string;
  stripe_payment_intent_id: string;
};

function secretKeys(): string[] {
  const keys: string[] = [];
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      keys.push(...Object.values(JSON.parse(modern) as Record<string, string>));
    } catch {
      // A malformed injected secret collection is a server configuration error.
    }
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) keys.push(legacy);
  return keys.filter(Boolean);
}

function text(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return text("Method not allowed", 405);

  const allowedKeys = secretKeys();
  const apiKey = request.headers.get("apikey") ?? "";
  if (!apiKey || !allowedKeys.includes(apiKey)) return text("Unauthorized", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const adminKey = allowedKeys[0] ?? "";
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const expectedLiveMode = Deno.env.get("STRIPE_LIVE_MODE");
  const stripeModeMatches = expectedLiveMode === "true"
    ? stripeSecret.startsWith("sk_live_")
    : expectedLiveMode === "false" && stripeSecret.startsWith("sk_test_");
  if (!supabaseUrl || !adminKey || !stripeModeMatches) {
    return text("Server configuration missing", 500);
  }

  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc("claim_due_booking_payments", { batch_size: 50 });
  if (error) {
    console.error("[backline] Could not claim due payments", error.message);
    return text("Could not claim due payments", 500);
  }

  const stripe = new Stripe(stripeSecret, { httpClient: Stripe.createFetchHttpClient() });
  const claimed = (data ?? []) as ClaimedPayment[];
  let captured = 0;
  let pendingWebhook = 0;
  let failed = 0;

  for (const payment of claimed) {
    try {
      const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
      if (intent.livemode !== (expectedLiveMode === "true")) {
        throw new Error("PaymentIntent mode mismatch");
      }
      if (intent.metadata.booking_id !== payment.booking_id) {
        throw new Error("PaymentIntent booking metadata mismatch");
      }

      if (intent.status === "requires_capture") {
        await stripe.paymentIntents.capture(
          intent.id,
          {},
          { idempotencyKey: `booking-auto-capture-${payment.payment_id}` },
        );
        captured += 1;
      } else if (intent.status === "succeeded") {
        // The payment webhook owns the database transition and will reconcile
        // this reservation when Stripe delivers/retries the success event.
        pendingWebhook += 1;
      } else {
        throw new Error(`PaymentIntent cannot be captured from ${intent.status}`);
      }
    } catch (error) {
      failed += 1;
      const message = (error instanceof Error ? error.message : "Capture failed").slice(0, 500);
      await admin
        .from("booking_payments")
        .update({ failure_code: "capture_worker", failure_message: message })
        .eq("id", payment.payment_id)
        .eq("status", "capture_pending");
      console.error("[backline] Scheduled capture failed", payment.payment_id, message);
    }
  }

  return Response.json(
    { claimed: claimed.length, captured, pendingWebhook, failed },
    { status: failed > 0 ? 500 : 200, headers: { "Cache-Control": "no-store" } },
  );
});
