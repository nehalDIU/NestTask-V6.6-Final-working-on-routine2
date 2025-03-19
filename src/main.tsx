import { StrictMode, Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
// Import CSS (Vite handles this correctly)
import './index.css';
import { LoadingScreen } from './components/LoadingScreen';
import { initializeApp, prefetchRoutes, preconnect, trackPerformance } from './utils/appInitializer';
import ServiceWorkerUpdateNotification from './components/ui/ServiceWorkerUpdateNotification';

// Performance optimizations initialization
const startTime = performance.now();

// Mark the first paint timing
performance.mark('app-init-start');

// Lazy load the main App component
const App = lazy(() => import('./App').then(module => {
  // Track and log module loading time
  const loadTime = performance.now() - startTime;
  console.debug(`App component loaded in ${loadTime.toFixed(2)}ms`);
  return module;
}));

// Wrapper component to initialize app features
const AppWrapper = () => {
  useEffect(() => {
    // Initialize app features
    initializeApp({
      tasks: {
        create: async (data: any) => {
          // Implementation for task creation API call
          const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          return response.json();
        },
        update: async (id: string, data: any) => {
          // Implementation for task update API call
          const response = await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          return response.json();
        },
        delete: async (id: string) => {
          // Implementation for task deletion API call
          const response = await fetch(`/api/tasks/${id}`, {
            method: 'DELETE'
          });
          return response.json();
        }
      },
      // Add handlers for other data types
    }).catch(console.error);
    
    // Track performance metrics
    trackPerformance();
  }, []);
  
  return (
    <>
      <App />
      <ServiceWorkerUpdateNotification />
      <Analytics />
    </>
  );
};

// Preconnect to important domains
preconnect([
  import.meta.env.VITE_SUPABASE_URL || '',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
]);

// Prefetch important routes
prefetchRoutes([
  '/',
  '/auth',
  '/tasks',
  '/routines'
]);

// Get the root element with null check
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a div with id "root" in the HTML.');
}

// Create the root with improved error handling
const root = createRoot(rootElement);

// Track initial render time
performance.mark('react-mount-start');

// Render the app with optimized suspense rendering
root.render(
  <StrictMode>
    <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
      <AppWrapper />
    </Suspense>
  </StrictMode>
);

// Add reliable cleanup for loading screen
window.addEventListener('load', () => {
  // Remove loading screen with animation
  const loadingScreen = document.querySelector('.loading');
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.remove();
    }, 500);
  }
  
  // Measure and log render completion time
  performance.measure('react-mount', 'react-mount-start');
  performance.getEntriesByName('react-mount').forEach(entry => {
    console.debug(`Initial render completed in ${entry.duration.toFixed(2)}ms`);
  });
});