import React, { Suspense, ComponentType, lazy } from 'react';

interface LazyWrapperProps {
  componentImport: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
}

/**
 * Safely wraps lazy-loaded components to handle potential errors
 * and prevent object-to-primitive conversion errors during initialization
 */
export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  componentImport, 
  fallback = <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
}) => {
  // Use safe lazy loading with error handling
  const SafeLazyComponent = React.useMemo(() => {
    return lazy(() => 
      componentImport().catch(error => {
        console.error('Error loading component:', error);
        return {
          default: () => (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
              <h3 className="font-bold mb-2">Failed to load component</h3>
              <p className="text-sm">There was an error loading this component. Please try refreshing the page.</p>
            </div>
          )
        };
      })
    );
  }, [componentImport]);

  // Use error boundary to catch rendering errors
  return (
    <ErrorBoundary>
      <Suspense fallback={fallback}>
        <SafeLazyComponent />
      </Suspense>
    </ErrorBoundary>
  );
};

// Simple error boundary for lazy-loaded components
class ErrorBoundary extends React.Component<{ children: React.ReactNode }> {
  state: { hasError: boolean; error: Error | null } = { 
    hasError: false, 
    error: null 
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error in lazy-loaded component:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          <h3 className="font-bold mb-2">Rendering Error</h3>
          <p className="text-sm">
            {this.state.error instanceof Error 
              ? this.state.error.message 
              : 'An unknown error occurred while rendering this component'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 text-xs font-medium bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-700/50"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
} 