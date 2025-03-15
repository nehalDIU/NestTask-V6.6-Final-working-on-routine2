import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';
import { LoadingScreen } from './components/LoadingScreen';
import { checkInstallability } from './utils/pwa';

// Check PWA installability
checkInstallability();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<LoadingScreen />}>
      <App />
      <Analytics />
    </Suspense>
  </StrictMode>
);