import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.110.0";
import Stripe from "npm:stripe@22.3.2";

const HANDLED_EVENTS = new Set([
  "payment_intent.amount_capturable_updated",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "payment_intent.succeeded",
]);

function secretKey(): string {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const keys = JSON.parse(modern) as Record<string, string>;
      return keys.default ?? Object.values(keys)[0] ?? "";
    } catch {
      return "";
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function text(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function advanceBooking(
  admin: SupabaseClient,
  bookingId: string,
  target: "held" | "released" | "cancelled",
): Promise<void> {
  const load = async () => {
    const { data, error } = await admin.from("bookings").select("status").eq("id", bookingId).single();
    if (error) throw error;
    return data.status as string;
  };
  let status = await load();

  if ((target === "held" || target === "released") && status === "accepted") {
    const { error } = await admin.from("bookings").update({ status: "held" }).eq("id", bookingId);
    if (error) throw error;
    status = "held";
  }
  if (target === "released" && status === "held") {
    const { error } = await admin.from("bookings").update({ status: "released" }).eq("id", bookingId);
    if (error) throw error;
    status = "released";
  }
  if (target === "cancelled" && status === "held") {
    const { error } = await admin.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    if (error) throw error;
    status = "cancelled";
  }

  // A terminal/newer state can make an older webhook a safe no-op. Anything
  // else is a real reconciliation failure and should be retried.
  const acceptable = target === "held"
    ? ["held", "released"]
    : target === "released"
      ? ["released"]
      : ["accepted", "cancelled"];
  if (!acceptable.includes(status)) {
    throw new Error(`Booking ${bookingId} could not advance from ${status} to ${target}`);
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return text("Method not allowed", 405);

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_PAYMENT_WEBHOOK_SECRET") ?? "";
  const expectedLiveMode = Deno.env.get("STRIPE_LIVE_MODE");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const adminKey = secretKey();
  if (
    !stripeSecret
    || !webhookSecret
    || !supabaseUrl
    || !adminKey
    || !["true", "false"].includes(expectedLiveMode ?? "")
  ) return text("Server configuration missing", 500);

  const signature = request.headers.get("stripe-signature");
  if (!signature) return text("Stripe signature missing", 400);
  const rawBody = await request.text();
  const stripe = new Stripe(stripeSecret, { httpClient: Stripe.createFetchHttpClient() });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return text("Invalid Stripe signature", 400);
  }

  if (event.livemode !== (expectedLiveMode === "true")) return text("Ignored mode mismatch", 200);
  if (!HANDLED_EVENTS.has(event.type)) return text("Received", 200);

  const eventIntent = event.data.object as Stripe.PaymentIntent;
  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });
  const { data: inserted, error: insertError } = await admin
    .from("stripe_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      object_id: eventIntent.id,
      livemode: event.livemode,
    })
    .select("stripe_event_id")
    .maybeSingle();

  if (insertError && (insertError as { code?: string }).code !== "23505") {
    return text("Could not claim event", 500);
  }
  if (!inserted) {
    const { data: prior, error: priorError } = await admin
      .from("stripe_events")
      .select("processed_at,processing_attempts")
      .eq("stripe_event_id", event.id)
      .single();
    if (priorError) return text("Could not load event", 500);
    if (prior.processed_at) return text("Duplicate", 200);
    await admin
      .from("stripe_events")
      .update({ processing_attempts: Number(prior.processing_attempts) + 1 })
      .eq("stripe_event_id", event.id);
  }

  try {
    // Retrieve current Stripe state so older/out-of-order event bodies cannot
    // roll a payment backward.
    const intent = await stripe.paymentIntents.retrieve(eventIntent.id, {
      expand: ["latest_charge"],
    });
    const bookingId = intent.metadata.booking_id;
    if (!bookingId) throw new Error("PaymentIntent booking metadata missing");

    const { data: payment, error: paymentError } = await admin
      .from("booking_payments")
      .select("id,booking_id")
      .eq("stripe_payment_intent_id", intent.id)
      .maybeSingle();
    if (paymentError) throw paymentError;
    if (!payment || payment.booking_id !== bookingId) {
      throw new Error("PaymentIntent is not linked to the expected booking");
    }

    const charge = intent.latest_charge && typeof intent.latest_charge !== "string"
      ? intent.latest_charge
      : null;
    const update: Record<string, unknown> = {
      stripe_latest_charge_id: charge?.id ?? null,
      updated_at: new Date().toISOString(),
      failure_code: intent.last_payment_error?.code ?? null,
      failure_message: intent.last_payment_error?.message?.slice(0, 500) ?? null,
    };
    let bookingTarget: "held" | "released" | "cancelled" | null = null;

    if (intent.status === "requires_capture") {
      const captureBefore = charge?.payment_method_details?.card?.capture_before;
      if (!captureBefore) throw new Error("Card authorization expiry missing");
      update.authorization_expires_at = new Date(captureBefore * 1000).toISOString();
      const { data: booking, error: bookingError } = await admin
        .from("bookings")
        .select("gig_at")
        .eq("id", bookingId)
        .single();
      if (bookingError) throw bookingError;
      const releaseAt = new Date(booking.gig_at as string).getTime() + 24 * 60 * 60 * 1000;
      const captureSafetyMs = 15 * 60 * 1000;
      if (!Number.isFinite(releaseAt) || captureBefore * 1000 <= releaseAt + captureSafetyMs) {
        await stripe.paymentIntents.cancel(intent.id);
        update.status = "cancelled";
        update.failure_code = "authorization_window";
        update.failure_message = "Card authorization expires before the post-gig release window";
      } else {
        update.status = "held";
        bookingTarget = "held";
      }
    } else if (intent.status === "succeeded") {
      update.status = "transferred";
      bookingTarget = "released";
    } else if (intent.status === "canceled") {
      update.status = "cancelled";
      bookingTarget = "cancelled";
    } else if (intent.status === "requires_payment_method") {
      update.status = "failed";
    } else if (intent.status === "requires_action") {
      update.status = "requires_action";
    } else {
      update.status = "pending";
    }

    const { error: updateError } = await admin
      .from("booking_payments")
      .update(update)
      .eq("id", payment.id);
    if (updateError) throw updateError;
    if (bookingTarget) await advanceBooking(admin, bookingId, bookingTarget);

    const { error: completeError } = await admin
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString(), processing_error: null })
      .eq("stripe_event_id", event.id);
    if (completeError) throw completeError;
    return text("Received", 200);
  } catch (error) {
    const message = (error instanceof Error ? error.message : "Processing failed").slice(0, 500);
    await admin
      .from("stripe_events")
      .update({ processing_error: message })
      .eq("stripe_event_id", event.id);
    console.error("[backline] Stripe payment webhook failed", event.id, message);
    return text("Webhook processing failed", 500);
  }
});
