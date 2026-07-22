import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import Stripe from "npm:stripe@22.3.2";

type CancellationClaim = {
  cancellationId: string;
  bookingId: string;
  paymentIntentId: string;
  action: "void" | "late_fee";
  musicianPayoutCents: number;
  serviceFeeCents: number;
  status: "processing" | "completed";
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

Deno.serve(async (request) => {
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const expectedLiveMode = Deno.env.get("STRIPE_LIVE_MODE");
  const stripeModeMatches = expectedLiveMode === "true"
    ? stripeSecret.startsWith("sk_live_")
    : expectedLiveMode === "false" && stripeSecret.startsWith("sk_test_");
  const configuredUrl = Deno.env.get("APP_URL") ?? "";
  let appOrigin: string;
  try {
    const appUrl = new URL(configuredUrl);
    if (appUrl.protocol !== "https:" && appUrl.hostname !== "localhost") throw new Error();
    appOrigin = appUrl.origin;
  } catch {
    return Response.json({ error: "Server configuration missing" }, { status: 500 });
  }
  if (!stripeModeMatches) return response({ error: "Server configuration missing" }, 500, appOrigin);
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
  const stripe = new Stripe(stripeSecret, { httpClient: Stripe.createFetchHttpClient() });
  try {
    const { data: claimData, error: claimError } = await admin.rpc(
      "claim_held_booking_cancellation",
      { booking_id: bookingId, cancelled_by: user.id },
    );
    if (claimError) {
      const message = claimError.message.includes("after showtime")
        ? "After showtime, report a problem instead of cancelling."
        : claimError.message.includes("disputed")
          ? "This booking is already under review."
          : "This booking cannot be cancelled now.";
      return response({ error: message }, 409, appOrigin);
    }
    const claim = claimData as CancellationClaim;
    if (claim.status === "completed") {
      return response({ bookingId, action: claim.action, alreadyCompleted: true }, 200, appOrigin);
    }

    let intent = await stripe.paymentIntents.retrieve(claim.paymentIntentId);
    if (intent.livemode !== (expectedLiveMode === "true")) {
      throw new Error("PaymentIntent mode mismatch");
    }
    if (intent.metadata.booking_id !== bookingId) {
      throw new Error("PaymentIntent booking metadata mismatch");
    }

    if (claim.action === "late_fee") {
      const amountToCapture = claim.musicianPayoutCents + claim.serviceFeeCents;
      if (intent.status === "requires_capture") {
        intent = await stripe.paymentIntents.update(intent.id, {
          metadata: {
            booking_resolution: "late_booker_cancel",
            cancellation_id: claim.cancellationId,
          },
        });
        intent = await stripe.paymentIntents.capture(
          intent.id,
          {
            amount_to_capture: amountToCapture,
            application_fee_amount: claim.serviceFeeCents,
          },
          { idempotencyKey: `late-cancel-capture-${claim.cancellationId}` },
        );
      }
      if (intent.status !== "succeeded" || intent.amount_received !== amountToCapture) {
        return response({ error: `Late cancellation payment is ${intent.status}` }, 202, appOrigin);
      }
    } else if (intent.status === "requires_capture") {
      intent = await stripe.paymentIntents.cancel(
        intent.id,
        { cancellation_reason: "requested_by_customer" },
        { idempotencyKey: `booking-void-${claim.cancellationId}` },
      );
    } else if (intent.status === "succeeded") {
      const { data: payment, error: paymentError } = await admin
        .from("booking_payments")
        .select("id,stripe_refund_id")
        .eq("booking_id", bookingId)
        .single();
      if (paymentError) throw paymentError;
      let refund = payment.stripe_refund_id
        ? await stripe.refunds.retrieve(payment.stripe_refund_id)
        : await stripe.refunds.create(
          {
            payment_intent: intent.id,
            reverse_transfer: true,
            refund_application_fee: true,
            reason: "requested_by_customer",
            metadata: { booking_id: bookingId, cancellation_id: claim.cancellationId },
          },
          { idempotencyKey: `booking-void-refund-${claim.cancellationId}` },
        );
      if (!payment.stripe_refund_id) {
        const { error: saveError } = await admin.from("booking_payments")
          .update({ stripe_refund_id: refund.id, updated_at: new Date().toISOString() })
          .eq("id", payment.id);
        if (saveError) throw saveError;
      }
      const refundPaymentIntent = typeof refund.payment_intent === "string"
        ? refund.payment_intent
        : refund.payment_intent?.id;
      if (refundPaymentIntent !== intent.id) {
        throw new Error("Refund does not belong to the cancelled PaymentIntent");
      }
      if (refund.status !== "succeeded") {
        return response({ error: `Cancellation refund is ${refund.status}` }, 202, appOrigin);
      }
    } else if (intent.status !== "canceled") {
      return response({ error: `Payment cannot be voided from ${intent.status}` }, 409, appOrigin);
    }

    const { data: finalized, error: finalizeError } = await admin.rpc(
      "finalize_held_booking_cancellation",
      { cancellation_id: claim.cancellationId },
    );
    if (finalizeError) throw finalizeError;
    return response(finalized, 200, appOrigin);
  } catch (error) {
    const message = (error instanceof Error ? error.message : "Cancellation failed").slice(0, 500);
    console.error("[backline] Held booking cancellation failed", bookingId, message);
    return response({ error: "Cancellation is still processing. Please retry." }, 500, appOrigin);
  }
});
