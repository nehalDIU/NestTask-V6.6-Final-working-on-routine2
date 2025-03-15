import { StrictMode, Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import { LoadingScreen } from './components/LoadingScreen';
import { checkInstallability } from './utils/pwa';
import { registerServiceWorker } from './utils/offlineUtils';
import OfflineStatus from './components/OfflineStatus';

// Add an error boundary component to catch and handle React errors
class ErrorBoundary extends Component<{ children: ReactNode, fallback?: ReactNode }> {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  formatError(error: any): string {
    if (!error) return 'Unknown error';
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error instanceof Error) {
      return error.message || error.toString();
    }
    
    try {
      return JSON.stringify(error, null, 2);
    } catch (e) {
      return 'Error object could not be stringified';
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error occurs
      return this.props.fallback || (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">Something went wrong</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We're sorry, but there was a problem loading the application.
              Please try refreshing the page.
            </p>
            <div className="text-left bg-gray-100 dark:bg-gray-700 p-3 rounded-md mb-4 overflow-auto max-h-32 text-xs">
              <pre className="text-red-600 dark:text-red-400">
                {this.formatError(this.state.error)}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Use lazy loading for the main App component
const App = lazy(() => import('./App'));

// Check PWA installability
checkInstallability();

// Register service worker for offline functionality
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <App />
        <OfflineStatus />
        <Analytics />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>
);