const CACHE_NAME = 'kokonut-push-v1';

const pushPayload = self.registration.showNotification('Test', {
  body: 'Push notifications are working!',
  icon: '/icon-192.png',
});

self.addEventListener('push', event => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/badge-72.png',
      tag: data.tag || 'kokonut-notification',
      data: data.data || {},
      actions: data.actions || [],
      vibrate: [100, 50, 100],
      requireInteraction: data.requireInteraction || false,
    };

    event.waitUntil(self.registration.showNotification(data.title || 'Kokonut', options));
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', event => {
  console.log('Notification closed:', event.notification.title);
});

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});
