import { StrictMode, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';
import { LoadingScreen } from './components/LoadingScreen';
import { checkInstallability } from './utils/pwa';
import { setupAutoSync } from './utils/offlineSync';

// Check PWA installability
checkInstallability();

// Setup auto-sync for offline support
const cleanup = setupAutoSync();

// Cleanup function for when the app unmounts
window.addEventListener('unload', cleanup);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<LoadingScreen />}>
      <App />
      <Analytics />
    </Suspense>
  </StrictMode>
);