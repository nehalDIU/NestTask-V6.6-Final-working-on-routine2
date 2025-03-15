import { useState, useEffect } from 'react';
import { addOnlineStatusListener, isOnline } from '../utils/offlineUtils';
import { AlertCircle, WifiOff } from 'lucide-react';

const OfflineStatus = () => {
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOffline(!isOnline());
    
    // Listen for online/offline events
    const removeListener = addOnlineStatusListener((online) => {
      setIsOffline(!online);
      
      // Only show banner when going offline
      if (!online) {
        setShowBanner(true);
        // Auto-hide banner after 5 seconds
        setTimeout(() => setShowBanner(false), 5000);
      }
    });
    
    // Listen for service worker messages
    const handleStatusChange = (event: Event) => {
      const { status } = (event as CustomEvent).detail;
      setIsOffline(status === 'offline');
      
      // Show banner for offline status
      if (status === 'offline') {
        setShowBanner(true);
        // Auto-hide banner after 5 seconds
        setTimeout(() => setShowBanner(false), 5000);
      }
    };
    
    window.addEventListener('connection-status-change', handleStatusChange);
    
    return () => {
      removeListener();
      window.removeEventListener('connection-status-change', handleStatusChange);
    };
  }, []);
  
  // Small indicator that's always visible in the UI
  const OfflineIndicator = () => (
    <div 
      className={`fixed bottom-4 right-4 z-50 p-2 rounded-full transition-opacity duration-300 
        ${isOffline ? 'bg-red-500 opacity-100' : 'bg-green-500 opacity-0'}`}
    >
      <WifiOff className={`h-4 w-4 text-white ${isOffline ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
  
  // Banner notification that shows temporarily
  const OfflineBanner = () => (
    <div 
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
        bg-amber-50 border border-amber-200 rounded-lg shadow-lg p-3 flex items-center
        transition-all duration-300 ${showBanner && isOffline ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12'}`}
    >
      <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
      <span className="text-amber-800 font-medium">
        You're offline. Some features may be limited.
      </span>
    </div>
  );
  
  return (
    <>
      <OfflineIndicator />
      <OfflineBanner />
    </>
  );
};

export default OfflineStatus; 