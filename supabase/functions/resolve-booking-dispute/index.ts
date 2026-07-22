import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import Stripe from "npm:stripe@22.3.2";

type Resolution = "release" | "refund";

type DisputeRow = {
  id: string;
  booking_id: string | null;
  status: string;
};

type PaymentRow = {
  id: string;
  stripe_payment_intent_id: string | null;
  stripe_refund_id: string | null;
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

function response(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const allowedKeys = secretKeys();
  const apiKey = request.headers.get("apikey") ?? "";
  if (!apiKey || !allowedKeys.includes(apiKey)) return response({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const adminKey = allowedKeys[0] ?? "";
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const expectedLiveMode = Deno.env.get("STRIPE_LIVE_MODE");
  const stripeModeMatches = expectedLiveMode === "true"
    ? stripeSecret.startsWith("sk_live_")
    : expectedLiveMode === "false" && stripeSecret.startsWith("sk_test_");
  if (!supabaseUrl || !adminKey || !stripeModeMatches) {
    return response({ error: "Server configuration missing" }, 500);
  }

  let disputeId: string;
  let resolution: Resolution;
  let note: string;
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.disputeId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.disputeId)) {
      return response({ error: "Dispute id invalid" }, 400);
    }
    if (body.resolution !== "release" && body.resolution !== "refund") {
      return response({ error: "Resolution invalid" }, 400);
    }
    if (typeof body.note !== "string" || body.note.trim().length < 1 || body.note.trim().length > 2000) {
      return response({ error: "Resolution note must contain 1 to 2000 characters" }, 400);
    }
    disputeId = body.disputeId;
    resolution = body.resolution;
    note = body.note.trim();
  } catch {
    return response({ error: "Request body invalid" }, 400);
  }

  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });
  const stripe = new Stripe(stripeSecret, { httpClient: Stripe.createFetchHttpClient() });

  try {
    const { data: disputeData, error: disputeError } = await admin
      .from("booking_disputes")
      .select("id,booking_id,status")
      .eq("id", disputeId)
      .maybeSingle();
    if (disputeError) throw disputeError;
    if (!disputeData) return response({ error: "Dispute not found" }, 404);
    const dispute = disputeData as DisputeRow;
    const expectedStatus = resolution === "release" ? "resolved_release" : "resolved_refund";
    if (dispute.status !== "open") {
      if (dispute.status !== expectedStatus) {
        return response({ error: "Dispute was already resolved differently" }, 409);
      }
      return response({ disputeId, resolution, alreadyResolved: true }, 200);
    }
    if (!dispute.booking_id) return response({ error: "Disputed booking was deleted" }, 409);

    const { data: paymentData, error: paymentError } = await admin
      .from("booking_payments")
      .select("id,stripe_payment_intent_id,stripe_refund_id")
      .eq("booking_id", dispute.booking_id)
      .maybeSingle();
    if (paymentError) throw paymentError;
    if (!paymentData?.stripe_payment_intent_id) {
      return response({ error: "Disputed Stripe payment not found" }, 409);
    }
    const payment = paymentData as PaymentRow;
    const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
    if (intent.livemode !== (expectedLiveMode === "true")) {
      throw new Error("PaymentIntent mode mismatch");
    }
    if (intent.metadata.booking_id !== dispute.booking_id) {
      throw new Error("PaymentIntent booking metadata mismatch");
    }

    let refundId: string | null = payment.stripe_refund_id;
    if (resolution === "release") {
      if (intent.status === "requires_capture") {
        const captured = await stripe.paymentIntents.capture(
          intent.id,
          {},
          { idempotencyKey: `dispute-release-${dispute.id}` },
        );
        if (captured.status !== "succeeded") {
          return response({ error: `Capture is ${captured.status}; retry after Stripe settles` }, 202);
        }
      } else if (intent.status !== "succeeded") {
        return response({ error: `Payment cannot be released from ${intent.status}` }, 409);
      }
    } else if (intent.status === "requires_capture") {
      await stripe.paymentIntents.cancel(
        intent.id,
        { cancellation_reason: "requested_by_customer" },
        { idempotencyKey: `dispute-cancel-${dispute.id}` },
      );
    } else if (intent.status === "succeeded") {
      let refund: Stripe.Refund;
      if (refundId) {
        refund = await stripe.refunds.retrieve(refundId);
      } else {
        refund = await stripe.refunds.create(
          {
            payment_intent: intent.id,
            reverse_transfer: true,
            refund_application_fee: true,
            reason: "requested_by_customer",
            metadata: { booking_id: dispute.booking_id, dispute_id: dispute.id },
          },
          { idempotencyKey: `dispute-refund-${dispute.id}` },
        );
        refundId = refund.id;
        const { error: saveRefundError } = await admin
          .from("booking_payments")
          .update({ stripe_refund_id: refund.id, updated_at: new Date().toISOString() })
          .eq("id", payment.id);
        if (saveRefundError) throw saveRefundError;
      }
      const refundPaymentIntent = typeof refund.payment_intent === "string"
        ? refund.payment_intent
        : refund.payment_intent?.id;
      if (refundPaymentIntent !== intent.id) {
        throw new Error("Refund does not belong to the disputed PaymentIntent");
      }
      if (refund.status !== "succeeded") {
        if (["failed", "canceled"].includes(refund.status ?? "")) {
          return response({ error: `Refund ${refund.status}` }, 409);
        }
        return response({ disputeId, resolution, refundId, status: refund.status }, 202);
      }
    } else if (intent.status !== "canceled") {
      return response({ error: `Payment cannot be refunded from ${intent.status}` }, 409);
    }

    const { data: result, error: resolveError } = await admin.rpc("resolve_booking_dispute", {
      dispute_id: dispute.id,
      resolution,
      resolution_note: note,
      stripe_refund_id: refundId,
    });
    if (resolveError) throw resolveError;
    return response(result, 200);
  } catch (error) {
    const message = (error instanceof Error ? error.message : "Resolution failed").slice(0, 500);
    console.error("[backline] Dispute resolution failed", disputeId, message);
    return response({ error: "Dispute resolution failed" }, 500);
  }
});
