import { Workbox } from 'workbox-window';

// Cache names for different types of assets
const CACHE_NAMES = {
  static: 'static-assets-v1',
  dynamic: 'dynamic-content-v1',
  images: 'images-v1',
  fonts: 'fonts-v1',
  api: 'api-cache-v1'
};

// Check if the app can be installed
export function checkInstallability() {
  if ('BeforeInstallPromptEvent' in window) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      // Store the event for later use
      (window as any).deferredPrompt = e;
    });
  }
}

// Request to install the PWA
export async function installPWA() {
  const deferredPrompt = (window as any).deferredPrompt;
  if (!deferredPrompt) return false;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  // Clear the stored prompt
  (window as any).deferredPrompt = null;
  
  return outcome === 'accepted';
}

// Register for push notifications
export async function registerPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.VITE_VAPID_PUBLIC_KEY || '')
    });
    
    return subscription;
  } catch (error) {
    console.error('Failed to register push notifications:', error);
    return null;
  }
}

// Track service worker registration state
let workbox: Workbox | null = null;

// Register service worker using Workbox for better caching and performance
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  
  try {
    // Use Workbox for better service worker management
    if (!workbox) {
      workbox = new Workbox('/service-worker.js', {
        scope: '/'
      });
      
      // Set up update handling
      workbox.addEventListener('waiting', showUpdatePrompt);
      workbox.addEventListener('controlling', () => {
        // If a new service worker is controlling the page, reload for fresh content
        window.location.reload();
      });
      
      // Set up message handling for background sync events
      workbox.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          const { updatedURL } = event.data.payload;
          console.log(`Content for ${updatedURL} has been updated in the cache.`);
        }
        
        if (event.data && event.data.type === 'BACKGROUND_SYNC_SUCCESS') {
          console.log('Background sync completed successfully:', event.data.payload);
          // Notify the user that their action completed in the background
          notifyBackgroundSyncComplete(event.data.payload);
        }
      });
      
      // Register the service worker
      await workbox.register();
      console.log('Service Worker registered with Workbox');
      
      // Schedule periodic updates
      schedulePeriodicUpdates();
      
      return workbox.getSW();
    }
    
    return workbox.getSW();
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    
    // Try one more time after a delay with a simpler approach
    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          const retryRegistration = await navigator.serviceWorker.register('/service-worker.js', {
            scope: '/'
          });
          console.log('Service Worker registered with fallback method');
          resolve(retryRegistration);
        } catch (retryError) {
          console.error('Service worker retry failed:', retryError);
          resolve(null);
        }
      }, 2000);
    });
  }
}

// Show update prompt when a new service worker is available
function showUpdatePrompt() {
  // Dispatch event for UI to show an update notification
  window.dispatchEvent(new CustomEvent('sw-update-available', {
    detail: {
      onUpdate: () => {
        if (workbox) {
          workbox.messageSW({ type: 'SKIP_WAITING' });
        }
      }
    }
  }));
}

// Notify user when background sync completes
function notifyBackgroundSyncComplete(data: any) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Sync Complete', {
      body: 'Your changes have been saved and synchronized.',
      icon: '/icons/icon-192x192.png'
    });
  }
}

// Helper function to schedule periodic updates
function schedulePeriodicUpdates() {
  // Check for updates every hour using requestIdleCallback
  const checkInterval = 60 * 60 * 1000; // 1 hour
  
  const scheduleNextCheck = () => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        if (workbox) {
          workbox.update();
        }
        setTimeout(scheduleNextCheck, checkInterval);
      }, { timeout: 10000 });
    } else {
      setTimeout(() => {
        if (workbox) {
          workbox.update();
        }
        scheduleNextCheck();
      }, checkInterval);
    }
  };
  
  // Schedule first check
  scheduleNextCheck();
}

// Prefetch critical assets
export async function prefetchCriticalAssets(assets: string[]) {
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAMES.static);
      return cache.addAll(assets);
    }
    return false;
  } catch (error) {
    console.error('Failed to prefetch assets:', error);
    return false;
  }
}

// Preload images for faster display
export function preloadImages(imageUrls: string[]) {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) return;
  
  // Use requestIdleCallback to not block the main thread
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      imageUrls.forEach(url => {
        const img = new Image();
        img.src = url;
      });
    }, { timeout: 2000 });
  } else {
    // Fallback
    setTimeout(() => {
      imageUrls.forEach(url => {
        const img = new Image();
        img.src = url;
      });
    }, 1000);
  }
}

// Initialize PWA features with enhanced performance and caching
export async function initPWA(options = {
  prefetchAssets: [] as string[],
  preloadImages: [] as string[],
}) {
  // Initialize features in parallel
  const results = await Promise.allSettled([
    Promise.resolve().then(checkInstallability),
    Promise.resolve().then(registerServiceWorker),
    Promise.resolve().then(() => prefetchCriticalAssets(options.prefetchAssets))
  ]);
  
  // Preload images after critical initialization
  if (options.preloadImages.length > 0) {
    preloadImages(options.preloadImages);
  }
  
  // Log any errors but don't block the app
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`PWA initialization step ${index} failed:`, result.reason);
    }
  });
  
  return true;
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// API for background sync registration
export async function registerBackgroundSync(syncName: string) {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('Background sync not supported');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    // Use type assertion to fix TypeScript error
    await (registration as any).sync.register(syncName);
    console.log(`Background sync registered: ${syncName}`);
    return true;
  } catch (err) {
    console.error('Background sync registration failed:', err);
    return false;
  }
}

// Store data in IndexedDB for offline use
export async function storeInIndexedDB(storeName: string, key: string, data: any) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pwa-app-db', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const storeRequest = store.put({ id: key, data });
      
      storeRequest.onsuccess = () => resolve(true);
      storeRequest.onerror = () => reject(new Error('Failed to store data'));
      
      transaction.oncomplete = () => db.close();
    };
    
    request.onerror = () => reject(new Error('Failed to open database'));
  });
}

// Get data from IndexedDB
export async function getFromIndexedDB(storeName: string, key: string) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pwa-app-db', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        const result = getRequest.result;
        resolve(result ? result.data : null);
      };
      
      getRequest.onerror = () => reject(new Error('Failed to get data'));
      
      transaction.oncomplete = () => db.close();
    };
    
    request.onerror = () => reject(new Error('Failed to open database'));
  });
}