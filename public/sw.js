self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Backline", body: event.data?.text() || "You have a new alert." };
  }

  event.waitUntil(self.registration.showNotification(data.title || "Backline", {
    body: data.body || "You have a new alert.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: data.tag || "backline-alert",
    renotify: Boolean(data.renotify),
    data: { url: data.url || "/notifications" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  })());
});
