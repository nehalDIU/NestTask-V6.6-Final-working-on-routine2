import { StrictMode, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';
import { LoadingScreen } from './components/LoadingScreen';
import { checkInstallability } from './utils/pwa';
import { registerServiceWorker } from './utils/offlineUtils';
import OfflineStatus from './components/OfflineStatus';

// Check PWA installability
checkInstallability();

// Register the service worker
registerServiceWorker().then((registration) => {
  if (registration) {
    console.log('Service worker registered successfully');
  }
}).catch((error) => {
  console.error('Service worker registration failed:', error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<LoadingScreen />}>
      <App />
      <OfflineStatus />
      <Analytics />
    </Suspense>
  </StrictMode>
);