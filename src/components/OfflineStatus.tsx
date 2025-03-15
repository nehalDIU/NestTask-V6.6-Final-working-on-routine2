import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { addOnlineStatusListener, isOnline } from '../utils/offlineUtils';
import { AlertCircle, WifiOff } from 'lucide-react';

// Memoized small indicator component
const OfflineIndicator = memo(({ isOffline }: { isOffline: boolean }) => (
  <div 
    className={`fixed bottom-4 right-4 z-50 p-2 rounded-full transition-opacity duration-300 
      ${isOffline ? 'bg-red-500 opacity-100' : 'bg-green-500 opacity-0'}`}
    style={{ pointerEvents: isOffline ? 'auto' : 'none' }}
  >
    <WifiOff className={`h-4 w-4 text-white ${isOffline ? 'opacity-100' : 'opacity-0'}`} />
  </div>
));

// Memoized banner component
const OfflineBanner = memo(({ showBanner, isOffline }: { showBanner: boolean, isOffline: boolean }) => (
  <div 
    className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
      bg-amber-50 border border-amber-200 rounded-lg shadow-lg p-3 flex items-center
      transition-all duration-300 ${showBanner && isOffline ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12'}`}
    style={{ pointerEvents: showBanner && isOffline ? 'auto' : 'none' }}
  >
    <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
    <span className="text-amber-800 font-medium">
      You're offline. Some features may be limited.
    </span>
  </div>
));

// Using names for DevTools debugging
OfflineIndicator.displayName = 'OfflineIndicator';
OfflineBanner.displayName = 'OfflineBanner';

const OfflineStatus = () => {
  const [isOffline, setIsOffline] = useState(() => !isOnline());
  const [showBanner, setShowBanner] = useState(false);

  // Memoize the banner display handler
  const showTemporaryBanner = useCallback(() => {
    setShowBanner(true);
    // Use a ref to track timeout ID and clear it on component unmount
    const timeoutId = setTimeout(() => setShowBanner(false), 5000);
    return timeoutId;
  }, []);

  // Memoize the offline status handler
  const handleOfflineStatus = useCallback((online: boolean) => {
    setIsOffline(!online);
    
    // Only show banner when going offline
    if (!online) {
      showTemporaryBanner();
    }
  }, [showTemporaryBanner]);

  // Memoize the service worker status handler
  const handleStatusChange = useCallback((event: Event) => {
    const { status } = (event as CustomEvent).detail;
    const isNowOffline = status === 'offline';
    setIsOffline(isNowOffline);
    
    // Show banner for offline status
    if (isNowOffline) {
      showTemporaryBanner();
    }
  }, [showTemporaryBanner]);
  
  // Setup event listeners only once with useEffect
  useEffect(() => {
    // Set initial state - already done in useState initializer
    
    // Listen for online/offline events
    const removeListener = addOnlineStatusListener(handleOfflineStatus);
    
    // Listen for service worker messages
    window.addEventListener('connection-status-change', handleStatusChange);
    
    return () => {
      removeListener();
      window.removeEventListener('connection-status-change', handleStatusChange);
    };
  }, [handleOfflineStatus, handleStatusChange]);
  
  // Only re-render when these states change
  return useMemo(() => (
    <>
      <OfflineIndicator isOffline={isOffline} />
      <OfflineBanner showBanner={showBanner} isOffline={isOffline} />
    </>
  ), [isOffline, showBanner]);
};

export default memo(OfflineStatus); 