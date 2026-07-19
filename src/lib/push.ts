const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function pushIsSupported(): boolean {
  return typeof window !== "undefined"
    && window.isSecureContext
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export function pushIsConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY);
}

function urlBase64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration> {
  if (!pushIsSupported()) throw new Error("Push notifications are not supported here.");
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

export async function getBrowserPushSubscription(): Promise<PushSubscription | null> {
  if (!pushIsSupported()) return null;
  return (await registration()).pushManager.getSubscription();
}

export async function subscribeBrowserToPush(): Promise<PushSubscription> {
  if (!VAPID_PUBLIC_KEY) throw new Error("Push notifications are not configured yet.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications were not allowed in this browser.");
  const worker = await registration();
  const existing = await worker.pushManager.getSubscription();
  if (existing) return existing;
  return worker.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToBytes(VAPID_PUBLIC_KEY),
  });
}
