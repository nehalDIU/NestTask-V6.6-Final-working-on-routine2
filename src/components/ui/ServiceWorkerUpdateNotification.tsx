import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

interface ServiceWorkerUpdateNotificationProps {
  duration?: number;
  position?: 'top' | 'bottom';
}

export function ServiceWorkerUpdateNotification({
  duration = 0, // 0 means it will stay until dismissed
  position = 'bottom'
}: ServiceWorkerUpdateNotificationProps) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Listen for update available events
    const handleUpdateAvailable = () => {
      setVisible(true);
      
      // Auto-hide after duration if specified
      if (duration > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
        }, duration);
        
        return () => clearTimeout(timer);
      }
    };
    
    // Listen for service worker updates
    window.addEventListener('sw-update-available', handleUpdateAvailable);
    
    // Also listen for toast events with update message
    const handleToastEvent = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail?.message?.includes('New version') || 
          detail?.message?.includes('update')) {
        setVisible(true);
      }
    };
    
    window.addEventListener('show-toast', handleToastEvent as EventListener);
    
    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      window.removeEventListener('show-toast', handleToastEvent as EventListener);
    };
  }, [duration]);
  
  // Handle refresh action
  const handleRefresh = () => {
    window.location.reload();
  };
  
  // Handle dismiss action
  const handleDismiss = () => {
    setVisible(false);
  };
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`fixed ${position === 'top' ? 'top-4' : 'bottom-4'} left-1/2 transform -translate-x-1/2 z-50`}
          initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 max-w-md w-full">
            <RefreshCw className="h-5 w-5 animate-spin-slow" />
            <div className="flex-1">
              <p className="text-sm font-medium">New version available</p>
              <p className="text-xs opacity-90">Refresh to update the application</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Update
              </button>
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 