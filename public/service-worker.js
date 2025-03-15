// Import Workbox from CDN (this makes the service worker self-contained)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// Cache version - increment when making significant changes
const CACHE_VERSION = 'v2';

// Workbox configuration
if (workbox) {
  console.log('Workbox is loaded 🎉');
  
  // Skip waiting and claim clients to ensure the newest service worker activates immediately
  self.skipWaiting();
  workbox.core.clientsClaim();
  
  // Custom precache manifest with versioned URLs
  workbox.precaching.precacheAndRoute([
    { url: '/', revision: CACHE_VERSION },
    { url: '/index.html', revision: CACHE_VERSION },
    { url: '/offline.html', revision: CACHE_VERSION },
    { url: '/manifest.json', revision: CACHE_VERSION },
    { url: '/icons/icon-192x192.png', revision: CACHE_VERSION },
    { url: '/icons/icon-512x512.png', revision: CACHE_VERSION },
    { url: '/icons/add-task.png', revision: CACHE_VERSION },
    { url: '/icons/view-tasks.png', revision: CACHE_VERSION }
  ]);
  
  // Helper function to check for unsupported schemes
  const isValidUrl = (url) => {
    // Check if the URL is valid before attempting to cache
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    // List of schemes that should not be cached
    const invalidSchemes = [
      'chrome-extension:', 
      'chrome:', 
      'about:', 
      'data:', 
      'file:', 
      'blob:', 
      'moz-extension:'
    ];
    
    // Make sure we're checking a proper URL string
    try {
      // Some URLs might be passed as URL objects, so we get the href
      const urlString = typeof url === 'object' && url.href ? url.href : url;
      return !invalidSchemes.some(scheme => urlString.startsWith(scheme));
    } catch (error) {
      console.error('Error validating URL:', error, url);
      return false;
    }
  };
  
  // Cache CSS, JS, and Web Fonts with a stale-while-revalidate strategy
  workbox.routing.registerRoute(
    ({ request, url }) => {
      // First check if the URL is valid before proceeding
      if (!isValidUrl(url.href)) {
        return false;
      }
      
      return request.destination === 'style' || 
             request.destination === 'script' || 
             request.destination === 'font';
    },
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: `static-resources-${CACHE_VERSION}`,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          purgeOnQuotaError: true, // Automatically purge if quota is exceeded
        }),
        // Add cache header plugin to respect Cache-Control headers
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );
  
  // Cache images with a cache-first strategy for better performance
  workbox.routing.registerRoute(
    ({ request, url }) => {
      // First check if the URL is valid before proceeding
      if (!isValidUrl(url.href)) {
        return false;
      }
      
      return request.destination === 'image';
    },
    new workbox.strategies.CacheFirst({
      cacheName: `images-${CACHE_VERSION}`,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          purgeOnQuotaError: true,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );
  
  // API requests - NetworkFirst with fallback
  workbox.routing.registerRoute(
    ({ url }) => {
      // First check if the URL is valid before proceeding
      if (!isValidUrl(url.href)) {
        return false;
      }
      
      return url.pathname.startsWith('/api') || url.pathname.includes('supabase');
    },
    new workbox.strategies.NetworkFirst({
      cacheName: `api-responses-${CACHE_VERSION}`,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
          purgeOnQuotaError: true,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
      networkTimeoutSeconds: 3, // Timeout for network requests
    })
  );
  
  // Routine data - StaleWhileRevalidate with longer cache
  workbox.routing.registerRoute(
    ({ url }) => { 
      // First check if the URL is valid before proceeding
      if (!isValidUrl(url.href)) {
        return false;
      }
      
      return url.pathname.includes('/routines') || url.pathname.includes('/routine_slots');
    },
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: `routine-data-${CACHE_VERSION}`,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          purgeOnQuotaError: true,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );
  
  // Faster assets cache - use CacheFirst for third-party libraries and fonts
  workbox.routing.registerRoute(
    ({ url }) => {
      // First check if the URL is valid before proceeding
      if (!isValidUrl(url.href)) {
        return false;
      }
      
      return url.href.includes('fonts.googleapis.com') || 
             url.href.includes('cdn') || 
             url.href.includes('unpkg.com') || 
             url.href.includes('jsdelivr.net');
    },
    new workbox.strategies.CacheFirst({
      cacheName: `external-resources-${CACHE_VERSION}`,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
          purgeOnQuotaError: true,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );
  
  // Fallback to offline page for navigation requests that fail
  workbox.routing.setCatchHandler(({ event }) => {
    // Only handle document (HTML) navigation requests
    if (event.request.destination === 'document') {
      return caches.match('/offline.html');
    }
    
    // For other requests that fail, return an error response
    return Response.error();
  });
  
  // Clean up old caches when a new service worker activates
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete any cache that doesn't include the current version
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  });
  
} else {
  console.log('Workbox failed to load 😢');
}

// Network state change detection - optimized to reduce overhead
self.addEventListener('fetch', event => {
  // Skip non-http/https URLs and non-navigation requests
  if (!event.request.url.startsWith('http') || event.request.mode !== 'navigate') {
    return;
  }
  
  // Skip URLs with invalid schemes
  if (!isValidUrl(event.request.url)) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Connection is back - broadcast a message only if status changed
        if (!self.isOnline) {
          self.isOnline = true;
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'ONLINE_STATUS_CHANGE',
                payload: { status: 'online' }
              });
            });
          });
        }
        return response;
      })
      .catch(() => {
        // Network is down - broadcast a message only if status changed
        if (self.isOnline !== false) {
          self.isOnline = false;
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'ONLINE_STATUS_CHANGE',
                payload: { status: 'offline' }
              });
            });
          });
        }
        
        return caches.match('/offline.html');
      })
  );
});

// Background sync for deferred operations
self.addEventListener('sync', event => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  try {
    // Get pending tasks from IndexedDB
    const db = await openTasksDB();
    const pendingTasks = await getAllPendingTasks(db);
    
    // Process each pending task
    for (const task of pendingTasks) {
      try {
        // Send to server
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(task.data)
        });
        
        if (response.ok) {
          // Remove from pending queue
          await removePendingTask(db, task.id);
        }
      } catch (error) {
        console.error('Failed to sync task:', error);
      }
    }
  } catch (error) {
    console.error('Error in syncTasks:', error);
  }
}

// IndexedDB helper functions
async function openTasksDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tasks-store', 1);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-tasks')) {
        db.createObjectStore('pending-tasks', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

async function getAllPendingTasks(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-tasks'], 'readonly');
    const store = transaction.objectStore('pending-tasks');
    const request = store.getAll();
    
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

async function removePendingTask(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-tasks'], 'readwrite');
    const store = transaction.objectStore('pending-tasks');
    const request = store.delete(id);
    
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
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