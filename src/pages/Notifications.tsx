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
  if (notification.kind === "booking_offer" || notification.kind === "sos_request") return <BoltIcon size={18} />;
  if (notification.kind === "booking_accepted" || notification.kind === "sos_accepted") return <CheckIcon size={18} />;
  return <CalendarIcon size={18} />;
}

export default function Notifications() {
  const { state, api } = useApp();
  const unread = state.notifications.filter((notification) => !notification.read).length;
  const preferences = state.notificationPreferences;
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
        <Card className="mb-4 overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
              <BellIcon size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-hi">Browser alerts</p>
              <p className="mt-0.5 text-xs text-text-lo">
                {!pushIsConfigured()
                  ? "Push delivery will be available after the VAPID key is added to this deployment."
                  : pushEnabled
                    ? "This browser can alert you about time-sensitive bookings."
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
          </div>

          {pushEnabled && (
            <div className="grid gap-3 border-t border-hairline-subtle bg-surface-850 p-4 sm:grid-cols-2">
              <label className="flex items-start gap-2.5 text-xs text-text-mid">
                <input
                  type="checkbox"
                  checked={preferences.highPush}
                  onChange={(event) => api.updateNotificationPreferences({ highPush: event.target.checked })}
                  className="mt-0.5 accent-amber-500"
                />
                <span><strong className="block text-text-hi">Urgent alerts</strong>Offers, acceptances, and cancellations.</span>
              </label>
              <label className="flex items-start gap-2.5 text-xs text-text-mid">
                <input
                  type="checkbox"
                  checked={preferences.normalPush}
                  onChange={(event) => api.updateNotificationPreferences({ normalPush: event.target.checked })}
                  className="mt-0.5 accent-cyan-400"
                />
                <span><strong className="block text-text-hi">Message alerts</strong>Push every new direct message.</span>
              </label>
              <label className="flex items-start gap-2.5 text-xs text-text-mid sm:col-span-2">
                <input
                  type="checkbox"
                  checked={preferences.hardMute}
                  onChange={(event) => api.updateNotificationPreferences({ hardMute: event.target.checked })}
                  className="mt-0.5 accent-[var(--color-danger)]"
                />
                <span><strong className="block text-text-hi">Mute every push</strong>In-app alerts still arrive and stay synced.</span>
              </label>
              <div className="sm:col-span-2">
                <Mono className="mb-2 block text-[10px] font-bold text-text-lo">Quiet hours · {preferences.timezone}</Mono>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-text-mid">
                    From
                    <input
                      type="time"
                      value={preferences.quietStart}
                      onChange={(event) => api.updateNotificationPreferences({ quietStart: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-hairline-strong bg-surface-800 px-3 py-2 text-sm text-text-hi"
                    />
                  </label>
                  <label className="text-xs text-text-mid">
                    Until
                    <input
                      type="time"
                      value={preferences.quietEnd}
                      onChange={(event) => api.updateNotificationPreferences({ quietEnd: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-hairline-strong bg-surface-800 px-3 py-2 text-sm text-text-hi"
                    />
                  </label>
                </div>
                <p className="mt-1.5 text-[10px] text-text-faint">Urgent alerts can break quiet hours unless every push is muted.</p>
              </div>
            </div>
          )}
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
