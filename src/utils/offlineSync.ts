/**
 * Syncs data with the server when the app comes back online
 * This can be called from any component that needs to refresh data
 * after regaining network connectivity
 */
export async function syncDataWithServer() {
  if (!navigator.onLine) {
    console.warn('Cannot sync data while offline');
    return false;
  }

  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    console.warn('Service worker not available for sync');
    return false;
  }

  try {
    // Send a message to the service worker to initiate sync
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_DATA',
      timestamp: new Date().toISOString()
    });

    // Return a promise that resolves when sync is complete
    return new Promise((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SYNC_COMPLETE') {
          navigator.serviceWorker.removeEventListener('message', messageHandler);
          resolve(true);
        }
      };

      // Add event listener for the response
      navigator.serviceWorker.addEventListener('message', messageHandler);

      // Set a timeout in case the service worker doesn't respond
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
        resolve(false);
      }, 5000);
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    return false;
  }
}

/**
 * Hook up event listeners to sync data automatically when the app comes back online
 * Call this function once during app initialization
 */
export function setupAutoSync() {
  const handleOnline = async () => {
    console.log('App is back online, syncing data...');
    await syncDataWithServer();
  };

  window.addEventListener('online', handleOnline);

  // Return a cleanup function to remove the listener
  return () => {
    window.removeEventListener('online', handleOnline);
  };
} 