import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import Stripe from "npm:stripe@22.3.2";

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

Deno.serve(async (request) => {
  if (request.method !== "POST") return text("Method not allowed", 405);

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET") ?? "";
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
  const stripe = new Stripe(stripeSecret, {
    httpClient: Stripe.createFetchHttpClient(),
  });

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

  if (event.livemode !== (expectedLiveMode === "true")) {
    return text("Ignored mode mismatch", 200);
  }
  if (event.type !== "account.updated") return text("Received", 200);

  const account = event.data.object as Stripe.Account;
  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });

  const { data: inserted, error: insertError } = await admin
    .from("stripe_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      object_id: account.id,
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
    const { data: connected, error: accountError } = await admin
      .from("connected_accounts")
      .update({
        details_submitted: Boolean(account.details_submitted),
        charges_enabled: Boolean(account.charges_enabled),
        payouts_enabled: Boolean(account.payouts_enabled),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", account.id)
      .select("user_id")
      .maybeSingle();
    if (accountError) throw accountError;
    if (!connected) throw new Error("Connected account is not linked to a Backline user");

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
    console.error("[backline] Stripe Connect webhook failed", event.id, message);
    return text("Webhook processing failed", 500);
  }
});
