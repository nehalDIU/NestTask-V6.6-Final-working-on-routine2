/**
 * Application Initializer
 * 
 * This module initializes all performance and PWA features including:
 * - Service worker registration
 * - Image optimizations
 * - IndexedDB for offline storage
 * - Resource prefetching
 */

import { initPWA, registerServiceWorker } from './pwa';
import { initImageOptimizations } from './imageOptimizer';
import { initializeOfflineStorage } from './idb';

// Critical assets to prefetch
const CRITICAL_ASSETS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
  // Add your critical CSS and JS files here
];

// Critical images to preload
const CRITICAL_IMAGES = [
  '/icons/icon-192x192.png',
  // Add your critical images here
];

/**
 * Initialize all application features with optimal loading order
 */
export async function initializeApp(apiCallbacks: any = {}): Promise<void> {
  // Track initialization timing
  const startTime = performance.now();
  
  // Register service worker early but don't wait
  const serviceWorkerPromise = registerServiceWorker()
    .catch(error => {
      console.error('Failed to register service worker:', error);
      return null;
    });
  
  // Initialize offline storage (don't block the main thread)
  const dbPromise = initializeOfflineStorage(apiCallbacks)
    .catch(error => {
      console.error('Failed to initialize offline storage:', error);
      return null;
    });
  
  // Main thread optimizations
  try {
    // Set up image optimizations
    initImageOptimizations();
    
    // Initialize PWA features with prefetching
    await initPWA({
      prefetchAssets: CRITICAL_ASSETS,
      preloadImages: CRITICAL_IMAGES,
    });
    
    // Log timing information
    const initTime = Math.round(performance.now() - startTime);
    console.log(`App initialized in ${initTime}ms`);
    
    // Wait for service worker registration
    const serviceWorker = await serviceWorkerPromise;
    if (serviceWorker) {
      console.log('Service worker registered successfully');
    }
    
    // Wait for database initialization
    const db = await dbPromise;
    if (db) {
      console.log('Offline storage initialized successfully');
    }
    
    return;
  } catch (error) {
    console.error('Error initializing app:', error);
    // Continue with degraded functionality
  }
}

/**
 * Prefetch routes for faster navigation
 */
export function prefetchRoutes(routes: string[]): void {
  if (!('requestIdleCallback' in window)) return;
  
  // Use requestIdleCallback to not block the main thread
  (window as any).requestIdleCallback(() => {
    routes.forEach(route => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      link.as = 'document';
      document.head.appendChild(link);
    });
  }, { timeout: 2000 });
}

/**
 * Preconnect to origins for faster resource loading
 */
export function preconnect(origins: string[]): void {
  origins.forEach(origin => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

/**
 * Install PWA if eligible
 */
export async function promptInstallPWA(): Promise<boolean> {
  try {
    // Import dynamically to avoid loading this code unnecessarily
    const { installPWA } = await import('./pwa');
    return installPWA();
  } catch (error) {
    console.error('Error prompting PWA installation:', error);
    return false;
  }
}

/**
 * Check if running as installed PWA
 */
export function isRunningAsPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true;
}

/**
 * Utility to measure performance metrics
 */
export function trackPerformance(): void {
  if ('performance' in window && 'getEntriesByType' in performance) {
    // Report performance metrics when page is fully loaded
    window.addEventListener('load', () => {
      setTimeout(() => {
        try {
          // Core Web Vitals and other metrics
          if ('getEntriesByType' in performance) {
            const paintMetrics = performance.getEntriesByType('paint');
            const FCP = paintMetrics.find(({ name }) => name === 'first-contentful-paint')?.startTime;
            
            if (FCP) {
              console.log(`First Contentful Paint: ${Math.round(FCP)}ms`);
            }
            
            // Layout shifts (CLS) - requires PerformanceObserver in production
            if ('LayoutShift' in window && 'layoutShiftSum' in performance) {
              console.log(`Cumulative Layout Shift: ${(performance as any).layoutShiftSum.toFixed(3)}`);
            }
            
            // Largest Contentful Paint - requires PerformanceObserver in production
            const LCPEntry = performance.getEntriesByType('largest-contentful-paint')[0];
            if (LCPEntry) {
              console.log(`Largest Contentful Paint: ${Math.round((LCPEntry as any).startTime)}ms`);
            }
            
            // First Input Delay - requires PerformanceObserver in production
            const FIDEntry = performance.getEntriesByType('first-input')[0];
            if (FIDEntry) {
              const delay = (FIDEntry as any).processingStart - (FIDEntry as any).startTime;
              console.log(`First Input Delay: ${Math.round(delay)}ms`);
            }
            
            // Navigation timing
            const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (navEntry) {
              console.log(`DOM Content Loaded: ${Math.round(navEntry.domContentLoadedEventEnd)}ms`);
              console.log(`Load Event: ${Math.round(navEntry.loadEventEnd)}ms`);
            }
          }
        } catch (e) {
          console.error('Error collecting performance metrics:', e);
        }
      }, 0);
    });
  }
} 