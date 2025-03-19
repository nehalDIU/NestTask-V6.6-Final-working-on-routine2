importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Define cache names
const CACHE_VERSION = 'v3';
const CACHE_NAMES = {
  static: `static-assets-${CACHE_VERSION}`,
  documents: `document-pages-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
  fonts: `fonts-${CACHE_VERSION}`,
  api: `api-cache-${CACHE_VERSION}`
};

const OFFLINE_URL = '/offline.html';

// Use Workbox for efficient caching
workbox.setConfig({ debug: false });

// Cache static assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAMES.static).then((cache) => {
        return cache.addAll([
          '/',
          '/index.html',
          '/offline.html',
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png',
          '/icons/add-task.png',
          '/icons/view-tasks.png',
          '/icons/badge.png'
        ]);
      }),
      // Precache fallback offline page
      caches.open(CACHE_NAMES.documents).then(cache => {
        return cache.add(OFFLINE_URL);
      })
    ])
  );
  self.skipWaiting();
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return Object.values(CACHE_NAMES).every(name => cacheName !== name);
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// WORKBOX CACHING STRATEGIES

// 1. Static assets - CacheFirst strategy (long-term caching)
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'style' || 
                  request.destination === 'script' || 
                  request.destination === 'worker',
  new workbox.strategies.CacheFirst({
    cacheName: CACHE_NAMES.static,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// 2. Images - CacheFirst with expiration
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: CACHE_NAMES.images,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// 3. Fonts - CacheFirst (rarely change)
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || 
               url.origin === 'https://fonts.gstatic.com',
  new workbox.strategies.CacheFirst({
    cacheName: CACHE_NAMES.fonts,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
      }),
    ],
  })
);

// 4. HTML pages - NetworkFirst strategy (always serve latest, fallback to cache)
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: CACHE_NAMES.documents,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
    networkTimeoutSeconds: 3,
  })
);

// 5. API endpoints - StaleWhileRevalidate (quick response, update in background)
workbox.routing.registerRoute(
  ({ url }) => {
    // Exclude Supabase direct API calls
    if (url.hostname.includes('supabase.co')) {
      return false;
    }
    // Match app API calls pattern
    return url.pathname.startsWith('/api/');
  },
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: CACHE_NAMES.api,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Fallback page for navigation requests that fail
workbox.routing.setCatchHandler(async ({ event }) => {
  if (event.request.mode === 'navigate') {
    return caches.match(OFFLINE_URL);
  }
  return Response.error();
});

// ADDITIONAL SERVICE WORKER FEATURES

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag.startsWith('sync-')) {
    const syncKey = event.tag.replace('sync-', '');
    
    event.waitUntil(
      (async () => {
        try {
          // Retrieve the data from IndexedDB
          const db = await openDB('pwa-app-db', 1, {
            upgrade(db) {
              if (!db.objectStoreNames.contains('sync-tasks')) {
                db.createObjectStore('sync-tasks', { keyPath: 'id' });
              }
            }
          });
          
          // Get pending operations
          const syncData = await db.get('sync-tasks', syncKey);
          
          if (syncData) {
            // Process the sync operation
            const { url, method, headers, body } = syncData.data;
            
            // Attempt to send the request
            const response = await fetch(url, {
              method: method || 'POST',
              headers: headers || {},
              body: body ? JSON.stringify(body) : undefined,
            });
            
            if (response.ok) {
              // Delete the operation if successful
              await db.delete('sync-tasks', syncKey);
              
              // Notify the client
              self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                  client.postMessage({
                    type: 'BACKGROUND_SYNC_SUCCESS',
                    payload: {
                      syncKey,
                      data: syncData.data,
                    }
                  });
                });
              });
            }
          }
        } catch (error) {
          console.error('Background sync failed:', error);
        }
      })()
    );
  }
});

// Helper function for IndexedDB
function openDB(name, version, options) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    
    if (options && options.upgrade) {
      request.onupgradeneeded = event => options.upgrade(event.target.result);
    }
    
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = () => reject(request.error);
  });
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.data?.url || '/',
        taskId: data.data?.taskId,
        type: data.data?.type
      },
      actions: data.actions || [
        {
          action: 'open',
          title: 'Open',
          icon: '/icons/icon-192x192.png'
        }
      ],
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';
  const taskId = event.notification.data?.taskId;
  const notificationType = event.notification.data?.type;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        const hadWindowToFocus = windowClients.some((windowClient) => {
          if (windowClient.url === urlToOpen) {
            windowClient.focus();
            // Send message to client to navigate to specific task
            if (taskId) {
              windowClient.postMessage({
                type: 'NOTIFICATION_CLICK',
                taskId: taskId,
                notificationType: notificationType
              });
            }
            return true;
          }
          return false;
        });

        // If no window/tab to focus, open new one
        if (!hadWindowToFocus) {
          return clients.openWindow(urlToOpen)
            .then((windowClient) => {
              // Wait a bit for window to load and then send message
              if (windowClient && taskId) {
                setTimeout(() => {
                  windowClient.postMessage({
                    type: 'NOTIFICATION_CLICK',
                    taskId: taskId,
                    notificationType: notificationType
                  });
                }, 1000);
              }
            });
        }
      })
  );
});