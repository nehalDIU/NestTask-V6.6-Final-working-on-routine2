const CACHE_NAME = 'nesttask-v2';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/add-task.png',
  '/icons/view-tasks.png',
  // Cache additional assets for UI
  '/icons/badge.png',
  '/src/index.css'
];

// API routes to cache
const API_ROUTES_TO_CACHE = [
  /\/api\/tasks/,
  /\/api\/routines/,
  /\/api\/courses/,
  /\/api\/teachers/
];

// Dynamic assets that should be cached during runtime
const RUNTIME_CACHE_PATTERNS = [
  /\.(js|css)$/, // JS and CSS files
  /\/icons\/.*\.png$/, // Icon images
  /^https:\/\/fonts\.googleapis\.com/, // Google fonts stylesheets
  /^https:\/\/fonts\.gstatic\.com/ // Google fonts files
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Helper function to determine if a URL should be cached at runtime
function shouldCacheAtRuntime(url) {
  // Check if the URL matches any of our patterns
  return RUNTIME_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

// Helper function to determine if a URL is an API route that should be cached
function isApiRouteToCache(url) {
  return API_ROUTES_TO_CACHE.some(pattern => pattern.test(url));
}

// Fetch event - stale-while-revalidate strategy for assets, network-first for API
self.addEventListener('fetch', (event) => {
  // Handle non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip Supabase API requests (let them go to network)
  if (url.hostname.includes('supabase.co')) {
    // For Supabase API, we'll use a cache-first strategy for specific endpoints
    if (isApiRouteToCache(url.pathname)) {
      event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
          return cache.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request)
              .then(networkResponse => {
                // Cache the new version
                if (networkResponse.ok) {
                  cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
              })
              .catch(() => {
                console.log('[Service Worker] Using cached API response for', url.pathname);
                return cachedResponse;
              });

            // Return cached response immediately if available, or wait for network
            return cachedResponse || fetchPromise;
          });
        })
      );
    }
    return;
  }

  // Navigation requests (HTML pages) - network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the latest version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          // Offline fallback
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) return cachedResponse;
          
          // If no cached version, show offline page
          return cache.match(OFFLINE_URL);
        })
    );
    return;
  }

  // For runtime-cacheable assets (JS, CSS, images) - stale-while-revalidate
  if (shouldCacheAtRuntime(event.request.url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request)
            .then(networkResponse => {
              // Cache the new version
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            })
            .catch(() => {
              // If fetch fails, return cached or null
              return cachedResponse || null;
            });

          // Return cached response immediately, or wait for network
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // For all other requests - network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses that match patterns
        if (response.ok && shouldCacheAtRuntime(event.request.url)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Try to get from cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // Return error response
        return new Response('Network error', { status: 408 });
      })
  );
});

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

// Message event listener for syncing data when online
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_DATA') {
    console.log('[Service Worker] Received sync data message');
    
    // The client is back online and wants to sync data
    event.waitUntil(
      // We could perform additional operations here
      // Like clearing specific cache entries to force a refresh
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_COMPLETE',
            timestamp: new Date().toISOString()
          });
        });
      })
    );
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
            // Focus if already open
            windowClient.focus();
            return true;
          }
          return false;
        });

        // If no window/tab is already open, open one
        if (!hadWindowToFocus) {
          clients.openWindow(urlToOpen).then((windowClient) => {
            if (windowClient) {
              windowClient.focus();
            }
          });
        }

        // Broadcast message to all clients about the notification click
        if (taskId && notificationType) {
          windowClients.forEach((client) => {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              payload: {
                taskId,
                notificationType
              }
            });
          });
        }
      })
  );
});