/* StockAcademia service worker — Web Push only (no offline caching). */

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const title = data.title || 'StockAcademia';
  const options = {
    body: data.body || '',
    data: { url: data.url || '/' },
    // PNG, not the SVG favicon — Android won't render an SVG notification icon.
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'stockacademia',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Focus an existing tab if one is already on the target path.
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Activate immediately on update so pushes work without a manual refresh.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
