// Import Workbox from CDN (this makes the service worker self-contained)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// Workbox configuration
if (workbox) {
  console.log('Workbox is loaded 🎉');
  
  // Custom precache manifest
  workbox.precaching.precacheAndRoute([
    { url: '/', revision: 'v1' },
    { url: '/index.html', revision: 'v1' },
    { url: '/offline.html', revision: 'v1' },
    { url: '/manifest.json', revision: 'v1' },
    { url: '/icons/icon-192x192.png', revision: 'v1' },
    { url: '/icons/icon-512x512.png', revision: 'v1' },
    { url: '/icons/add-task.png', revision: 'v1' },
    { url: '/icons/view-tasks.png', revision: 'v1' }
  ]);
  
  // Helper function to check for unsupported schemes
  const isValidUrl = (url) => {
    const invalidSchemes = ['chrome-extension:', 'about:', 'data:'];
    return !invalidSchemes.some(scheme => url.startsWith(scheme));
  };
  
  // Cache CSS, JS, and Web Fonts with a stale-while-revalidate strategy
  workbox.routing.registerRoute(
    ({ request, url }) => 
      (request.destination === 'style' || 
       request.destination === 'script' || 
       request.destination === 'font') && 
      isValidUrl(url.href),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );
  
  // Cache images with a cache-first strategy
  workbox.routing.registerRoute(
    ({ request, url }) => 
      request.destination === 'image' && 
      isValidUrl(url.href),
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );
  
  // Special handling for API requests
  workbox.routing.registerRoute(
    ({ url }) => (url.pathname.startsWith('/api') || 
                 url.pathname.includes('supabase')) && 
                 isValidUrl(url.href),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-responses',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        }),
      ],
    })
  );
  
  // Special route for routine-related API requests (to ensure they work offline)
  workbox.routing.registerRoute(
    ({ url }) => 
      (url.pathname.includes('/routines') || 
       url.pathname.includes('/routine_slots')) && 
      isValidUrl(url.href),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'routine-data',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
    })
  );
  
  // Fallback to offline page for navigation requests that fail
  workbox.routing.setCatchHandler(({ event }) => {
    if (event.request.destination === 'document') {
      return caches.match('/offline.html');
    }
    return Response.error();
  });
  
} else {
  console.log('Workbox failed to load 😢');
}

// Network state change detection
self.addEventListener('fetch', event => {
  // Skip non-http/https URLs (like chrome-extension://)
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Connection is back - broadcast a message
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'ONLINE_STATUS_CHANGE',
                payload: { status: 'online' }
              });
            });
          });
          return response;
        })
        .catch(() => {
          // Network is down - broadcast a message
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'ONLINE_STATUS_CHANGE',
                payload: { status: 'offline' }
              });
            });
          });
          
          return caches.match('/offline.html');
        })
    );
  }
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