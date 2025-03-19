import { useState, useEffect } from 'react';
import { updateServiceWorker } from '../../utils/serviceWorker';

export function ServiceWorkerUpdateNotification() {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  useEffect(() => {
    // Listen for service worker update events
    const handleUpdateAvailable = () => {
      setShowUpdateNotification(true);
    };

    window.addEventListener('serviceWorkerUpdateAvailable', handleUpdateAvailable);

    return () => {
      window.removeEventListener('serviceWorkerUpdateAvailable', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = async () => {
    // Get all service worker registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    // Find registration with a waiting worker
    const registration = registrations.find(reg => reg.waiting);
    
    if (registration) {
      // Update the service worker
      updateServiceWorker(registration);
      
      // Hide the notification
      setShowUpdateNotification(false);
      
      // Reload after a short delay to ensure the new service worker is activated
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  if (!showUpdateNotification) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-blue-600 text-white text-center z-50 flex justify-between items-center">
      <div className="flex-1">
        New version available! Update for improved performance and features.
      </div>
      <div className="flex space-x-2">
        <button 
          onClick={handleUpdate}
          className="bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50 transition-colors"
        >
          Update Now
        </button>
        <button 
          onClick={() => setShowUpdateNotification(false)}
          className="text-white/80 hover:text-white px-4 py-2 rounded font-medium transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
} 