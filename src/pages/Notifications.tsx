import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellIcon, BoltIcon, CalendarIcon, ChatIcon, CheckIcon } from "../components/icons";
import { Page } from "../components/shell";
import { Button, Card, EmptyState, Mono } from "../components/ui";
import { useApp } from "../lib/store";
import type { NotificationItem } from "../lib/types";
import { isCloudBackend } from "../lib/backend";
import { getBrowserPushSubscription, pushIsConfigured, pushIsSupported } from "../lib/push";

function relativeTime(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 2) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1_440)}d`;
}

function NotificationIcon({ notification }: { notification: NotificationItem }) {
  if (notification.kind === "direct_message") return <ChatIcon size={18} />;
  if (notification.kind === "booking_offer") return <BoltIcon size={18} />;
  if (notification.kind === "booking_accepted") return <CheckIcon size={18} />;
  return <CalendarIcon size={18} />;
}

export default function Notifications() {
  const { state, api } = useApp();
  const unread = state.notifications.filter((notification) => !notification.read).length;
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBrowserPushSubscription()
      .then((subscription) => {
        if (!cancelled) setPushEnabled(Boolean(subscription));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushEnabled) {
        await api.disablePushNotifications();
        setPushEnabled(false);
      } else {
        await api.enablePushNotifications();
        setPushEnabled(true);
      }
    } catch (error) {
      setPushError(error instanceof Error ? error.message : "Could not update push notifications.");
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <Page
      title="Alerts"
      subtitle="Messages and booking updates that need your attention."
      action={unread > 0 ? (
        <Button variant="ghost" size="sm" onClick={api.markAllNotificationsRead}>
          Mark all read
        </Button>
      ) : undefined}
    >
      {isCloudBackend && (
        <Card className="mb-4 flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
            <BellIcon size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-hi">Urgent booking alerts</p>
            <p className="mt-0.5 text-xs text-text-lo">
              {!pushIsConfigured()
                ? "Push delivery will be available after the VAPID key is added to this deployment."
                : pushEnabled
                ? "This browser can alert you about new offers and cancellations."
                : "Turn on browser alerts for time-sensitive offers."}
            </p>
            {pushError && <p role="alert" className="mt-1 text-xs text-[var(--color-danger)]">{pushError}</p>}
          </div>
          <Button
            size="sm"
            variant={pushEnabled ? "secondary" : "primary"}
            onClick={togglePush}
            disabled={pushBusy || !pushIsSupported() || !pushIsConfigured()}
          >
            {pushBusy ? "Saving…" : pushEnabled ? "Turn off" : "Turn on"}
          </Button>
        </Card>
      )}
      {state.notifications.length === 0 ? (
        <EmptyState
          icon={<BellIcon size={34} />}
          title="All quiet"
          body="New messages and booking offers will land here, even if push notifications are off."
        />
      ) : (
        <Card className="divide-y divide-hairline-subtle overflow-hidden">
          {state.notifications.map((notification) => (
            <Link
              key={notification.id}
              to={notification.href}
              onClick={() => {
                if (!notification.read) api.markNotificationRead(notification.id);
              }}
              className={`flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface-850 ${
                notification.read ? "bg-surface-900" : "bg-cyan-400/[0.045]"
              }`}
            >
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                notification.urgency === "high"
                  ? "border-amber-500/35 bg-amber-500/10 text-amber-300"
                  : "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"
              }`}>
                <NotificationIcon notification={notification} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-3">
                  <span className={`text-sm ${notification.read ? "font-medium text-text-mid" : "font-semibold text-text-hi"}`}>
                    {notification.title}
                  </span>
                  <Mono className="shrink-0 text-[9px] text-text-faint">
                    {relativeTime(notification.createdAt)}
                  </Mono>
                </span>
                {notification.body && (
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-text-lo">
                    {notification.body}
                  </span>
                )}
              </span>
              {!notification.read && (
                <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-cyan-400" aria-label="Unread" />
              )}
            </Link>
          ))}
        </Card>
      )}
    </Page>
  );
}
