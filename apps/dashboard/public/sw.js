// Service Worker for Push Notifications
const CACHE_NAME = 'task-master-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
  event.waitUntil(self.clients.claim());
});

// Push event
self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      image: data.image,
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icon-view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icon-close.png'
        }
      ],
      requireInteraction: data.data?.priority === 'HIGH',
      silent: false,
      timestamp: Date.now(),
      tag: data.data?.notificationId || 'default'
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Task Master', options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Task Master', {
        body: 'You have a new notification',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png'
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'dismiss') {
    return;
  }

  // Default action or 'view' action
  const urlToOpen = data.url || '/dashboard';
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    // Check if there's already a window/tab open with the target URL
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url.includes('/dashboard') && 'focus' in client) {
        client.postMessage({
          type: 'NOTIFICATION_CLICKED',
          data: data
        });
        return client.focus();
      }
    }

    // If no window/tab is already open, open a new one
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Optional: Track notification dismissals
  const data = event.notification.data;
  if (data.notificationId) {
    // Could send analytics data here
    console.log('Notification dismissed:', data.notificationId);
  }
});

// Background sync (for offline notifications)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    // Sync any offline notifications when back online
    console.log('Syncing notifications...');
    
    // This could fetch missed notifications from the server
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Notifications synced:', data);
    }
  } catch (error) {
    console.error('Error syncing notifications:', error);
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service worker message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event (for caching strategies if needed)
self.addEventListener('fetch', (event) => {
  // Only handle API requests for notifications
  if (event.request.url.includes('/api/notifications')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response for caching
          const responseClone = response.clone();
          
          // Cache successful responses
          if (response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Return cached response if available
          return caches.match(event.request);
        })
    );
  }
});