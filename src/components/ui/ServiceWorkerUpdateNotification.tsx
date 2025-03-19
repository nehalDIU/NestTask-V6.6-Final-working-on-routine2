import React, { useEffect, useState } from 'react';

// Add keyframe styles to the component
const slideUpAnimation = `
  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

export default function ServiceWorkerUpdateNotification() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [updateHandler, setUpdateHandler] = useState<(() => void) | null>(null);

  useEffect(() => {
    // Add keyframe animation to the document head
    const styleElement = document.createElement('style');
    styleElement.textContent = slideUpAnimation;
    document.head.appendChild(styleElement);

    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ onUpdate: () => void }>;
      
      // Check if update handler is available
      if (customEvent.detail?.onUpdate) {
        setIsUpdateAvailable(true);
        setUpdateHandler(() => customEvent.detail.onUpdate);
      } else {
        setIsUpdateAvailable(true);
        setUpdateHandler(() => () => window.location.reload());
      }
    };

    // Listen for service worker update events
    window.addEventListener('sw-update-available', handleUpdate);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdate);
      // Remove the style element on unmount
      document.head.removeChild(styleElement);
    };
  }, []);

  if (!isUpdateAvailable) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 bg-blue-500 text-white rounded-lg shadow-lg p-4 z-50 flex items-center justify-between max-w-md"
      style={{
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div className="mr-4">
        <p className="font-medium">New version available!</p>
        <p className="text-sm opacity-90">Refresh to update the application</p>
      </div>
      <div className="flex space-x-2">
        <button 
          className="bg-white text-blue-500 px-3 py-1 rounded-md font-medium hover:bg-blue-50 transition-colors"
          onClick={() => updateHandler && updateHandler()}
        >
          Update
        </button>
        <button 
          className="text-white hover:text-blue-100 transition-colors"
          onClick={() => setIsUpdateAvailable(false)}
        >
          Later
        </button>
      </div>
    </div>
  );
} 