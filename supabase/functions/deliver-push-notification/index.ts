import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import webpush from "npm:web-push@3.6.7";

type NotificationRow = {
  id: string;
  recipient_id: string;
  urgency: "low" | "normal" | "high";
  dedupe_key: string;
  title: string;
  body: string;
  href: string;
  push_started_at: string | null;
};

type PreferenceRow = {
  push_enabled: boolean;
  high_push: boolean;
  normal_push: boolean;
  hard_mute: boolean;
  quiet_start: string;
  quiet_end: string;
  timezone: string;
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function secretKey(): string {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) return JSON.parse(modern).default;
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function minuteOfDay(value: string): number {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function isQuietHours(preference: PreferenceRow): boolean {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: preference.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24;
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
    const now = hour * 60 + minute;
    const start = minuteOfDay(preference.quiet_start);
    const end = minuteOfDay(preference.quiet_end);
    return start <= end ? now >= start && now < end : now >= start || now < end;
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const expectedWebhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!expectedWebhookSecret || request.headers.get("x-webhook-secret") !== expectedWebhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const adminKey = secretKey();
  if (!supabaseUrl || !adminKey) return new Response("Server configuration missing", { status: 500 });
  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });

  const payload = await request.json() as { record?: { id?: string } };
  const notificationId = payload.record?.id;
  if (!notificationId) return new Response("Notification id missing", { status: 400 });

  // Atomic claim: webhook retries and duplicate invocations cannot fan out the
  // same notification twice once one worker has started it.
  const { data: claimed, error: claimError } = await admin
    .from("notifications")
    .update({ push_started_at: new Date().toISOString(), push_error: null })
    .eq("id", notificationId)
    .is("push_started_at", null)
    .select("id,recipient_id,urgency,dedupe_key,title,body,href,push_started_at")
    .maybeSingle();
  if (claimError) return Response.json({ error: claimError.message }, { status: 500 });
  if (!claimed) return Response.json({ duplicate: true });

  const notification = claimed as NotificationRow;
  const [{ data: preferenceData }, { data: subscriptionData, error: subscriptionsError }] =
    await Promise.all([
      admin
        .from("notification_preferences")
        .select("push_enabled,high_push,normal_push,hard_mute,quiet_start,quiet_end,timezone")
        .eq("user_id", notification.recipient_id)
        .maybeSingle(),
      admin
        .from("push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .eq("user_id", notification.recipient_id),
    ]);

  if (subscriptionsError) {
    await admin.from("notifications").update({ push_error: subscriptionsError.message }).eq("id", notification.id);
    return Response.json({ error: subscriptionsError.message }, { status: 500 });
  }

  const preference = preferenceData as PreferenceRow | null;
  const allowed = Boolean(
    preference?.push_enabled
    && !preference.hard_mute
    && (notification.urgency === "high" ? preference.high_push : preference.normal_push)
    && (notification.urgency === "high" || !isQuietHours(preference)),
  );
  const subscriptions = (subscriptionData ?? []) as SubscriptionRow[];
  if (!allowed || subscriptions.length === 0) {
    await admin.from("notifications").update({
      pushed_at: new Date().toISOString(),
      push_error: allowed ? "No active device subscriptions" : "Push suppressed by preferences",
    }).eq("id", notification.id);
    return Response.json({ delivered: 0, suppressed: true });
  }

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@backline.app";
  if (!publicKey || !privateKey) {
    await admin.from("notifications").update({ push_error: "VAPID secrets missing" }).eq("id", notification.id);
    return Response.json({ error: "VAPID secrets missing" }, { status: 500 });
  }

  const message = JSON.stringify({
    title: notification.title,
    body: notification.body,
    url: notification.href,
    tag: notification.dedupe_key.slice(0, 32),
    renotify: notification.urgency === "high",
  });
  let delivered = 0;
  const errors: string[] = [];

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        message,
        {
          vapidDetails: { subject, publicKey, privateKey },
          TTL: notification.urgency === "high" ? 900 : 3600,
          urgency: notification.urgency === "high" ? "high" : "normal",
        },
      );
      delivered += 1;
    } catch (error) {
      const pushError = error as { statusCode?: number; message?: string };
      if (pushError.statusCode === 404 || pushError.statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", subscription.id);
      }
      errors.push(pushError.message ?? `Push failed (${pushError.statusCode ?? "unknown"})`);
    }
  }));

  await admin.from("notifications").update({
    pushed_at: delivered > 0 ? new Date().toISOString() : null,
    push_error: errors.length > 0 ? errors.join("; ").slice(0, 1000) : null,
  }).eq("id", notification.id);

  return Response.json({ delivered, failed: errors.length });
});
