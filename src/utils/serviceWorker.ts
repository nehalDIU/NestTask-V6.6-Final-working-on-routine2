/**
 * Service Worker registration and offline support utilities
 */

// Common route patterns that we can predict and precache
const PREDICTABLE_ROUTES = [
  '/tasks',
  '/routines',
  '/courses',
  '/dashboard'
];

// Service Worker registration
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check network for updated service worker
      });
      
      console.log('Service Worker registered successfully:', registration);
      
      // Set up update detection
      setUpServiceWorkerUpdates(registration);
      
      // Register predictable routes for precaching
      if (registration.active) {
        precachePredictableRoutes(registration);
      }
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Handle service worker updates
function setUpServiceWorkerUpdates(registration: ServiceWorkerRegistration) {
  // When a new service worker is found
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    
    if (newWorker) {
      // Track state changes
      newWorker.addEventListener('statechange', () => {
        // When the new service worker is installed but waiting
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // There's a new service worker waiting to activate
            console.log('New service worker available, ready to update');
            
            // Show UI notification to user about available update if needed
            const updateEvent = new CustomEvent('serviceWorkerUpdateAvailable');
            window.dispatchEvent(updateEvent);
          } else {
            // First-time service worker installation
            console.log('Service Worker installed for the first time');
          }
        }
      });
    }
  });
  
  // Listen for controlling service worker change
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('New service worker is now controlling the page');
  });
}

// Check if the app is running in a service worker context
export const isServiceWorker = () => {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 
         navigator.serviceWorker.controller !== null;
};

// Keep service worker alive with periodic heartbeat to prevent it from being terminated
export const keepServiceWorkerAlive = (registration: ServiceWorkerRegistration) => {
  if (!registration) return;
  
  // Send periodic heartbeat to keep the service worker alive
  setInterval(() => {
    registration.active?.postMessage({ type: 'heartbeat' });
  }, 30000); // Send heartbeat every 30 seconds
};

// Handle offline/online status changes
export const handleConnectivityChange = (registration: ServiceWorkerRegistration) => {
  if (!registration) return;
  
  window.addEventListener('online', () => {
    console.log('App is online, syncing data...');
    registration.active?.postMessage({ type: 'sync' });
  });
  
  window.addEventListener('offline', () => {
    console.log('App is offline, using cached data');
    registration.active?.postMessage({ type: 'offline' });
  });
};

// Precache predictable routes that the user is likely to visit
export const precachePredictableRoutes = (registration: ServiceWorkerRegistration) => {
  if (!registration.active) return;
  
  // Send message to service worker to precache predictable routes
  registration.active.postMessage({
    type: 'precacheAssets',
    assets: PREDICTABLE_ROUTES.map(route => route)
  });
};

// Update service worker immediately (skip waiting)
export const updateServiceWorker = (registration: ServiceWorkerRegistration) => {
  if (!registration.waiting) return;
  
  // Send message to waiting service worker to skip waiting
  registration.waiting.postMessage({ type: 'skipWaiting' });
};

// Prefetch and cache resources for a specific route
export const prefetchRoute = async (route: string) => {
  try {
    if (!navigator.serviceWorker.controller) return;
    
    // Get all current service worker registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    // Find the active registration
    const registration = registrations.find(reg => reg.active);
    if (!registration?.active) return;
    
    // Send request to prefetch the route
    registration.active.postMessage({
      type: 'precacheAssets',
      assets: [route]
    });
    
    console.log(`Prefetched route: ${route}`);
  } catch (error) {
    console.error('Error prefetching route:', error);
  }
}; 