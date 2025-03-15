import { Workbox } from 'workbox-window';

// IndexedDB database name and version
const DB_NAME = 'nesttask-offline-db';
const DB_VERSION = 1;

// Store names
const TASKS_STORE = 'tasks';
const PENDING_ACTIONS_STORE = 'pending-actions';

// Initialize the offline database
export async function initOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(TASKS_STORE)) {
        db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(PENDING_ACTIONS_STORE)) {
        const pendingStore = db.createObjectStore(PENDING_ACTIONS_STORE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        pendingStore.createIndex('action', 'action', { unique: false });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Register the service worker for offline functionality
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined | null> {
  if ('serviceWorker' in navigator) {
    const wb = new Workbox('/service-worker.js');
    
    // Add event listeners for service worker updates
    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        // Notify user about the update
        if (confirm('New version available! Reload to update?')) {
          window.location.reload();
        }
      }
    });
    
    // Add event listeners for online/offline status changes from the service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'ONLINE_STATUS_CHANGE') {
        const { status } = event.data.payload;
        
        // Dispatch a custom event that components can listen for
        window.dispatchEvent(
          new CustomEvent('connection-status-change', { 
            detail: { status } 
          })
        );
        
        // Update UI based on connection status
        if (status === 'online') {
          // Try to sync pending actions
          syncPendingActions();
        }
      }
    });
    
    // Register and return the service worker registration
    return wb.register();
  }
  
  return Promise.resolve(null);
}

// Save task data to IndexedDB for offline access
export async function saveTasksLocally(tasks: any[]): Promise<void> {
  if (!tasks || tasks.length === 0) {
    console.warn('No tasks provided to save locally');
    return;
  }

  return new Promise((resolve, reject) => {
    initOfflineDB().then(db => {
      // Create a new transaction for the clear operation
      const clearTransaction = db.transaction(TASKS_STORE, 'readwrite');
      const clearStore = clearTransaction.objectStore(TASKS_STORE);
      
      const clearRequest = clearStore.clear();
      
      clearRequest.onsuccess = () => {
        // After clearing completes successfully, start a new transaction for adding
        const addTransaction = db.transaction(TASKS_STORE, 'readwrite');
        const addStore = addTransaction.objectStore(TASKS_STORE);
        
        // Track any errors
        let hasError = false;
        
        addTransaction.onerror = (event) => {
          console.error('Transaction error during task save:', (event.target as IDBTransaction).error);
          hasError = true;
          reject((event.target as IDBTransaction).error);
        };
        
        addTransaction.oncomplete = () => {
          if (!hasError) {
            resolve();
          }
        };
        
        // Add tasks one by one
        tasks.forEach(task => {
          try {
            addStore.add(task);
          } catch (error) {
            console.error('Error adding task to store:', error, task);
            hasError = true;
          }
        });
      };
      
      clearRequest.onerror = (event) => {
        console.error('Error clearing task store:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
    }).catch(error => {
      console.error('Error initializing DB for saving tasks:', error);
      reject(error);
    });
  });
}

// Get tasks from IndexedDB when offline
export async function getLocalTasks(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    initOfflineDB().then(db => {
      const transaction = db.transaction(TASKS_STORE, 'readonly');
      const store = transaction.objectStore(TASKS_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = (event) => {
        console.error('Error getting local tasks:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
    }).catch(error => {
      console.error('Error initializing DB for getting tasks:', error);
      reject(error);
    });
  });
}

// Add a pending action to be synced when back online
export async function addPendingAction(action: string, data: any): Promise<number> {
  return new Promise((resolve, reject) => {
    initOfflineDB().then(db => {
      const transaction = db.transaction(PENDING_ACTIONS_STORE, 'readwrite');
      const store = transaction.objectStore(PENDING_ACTIONS_STORE);
      
      const pendingAction = {
        action,
        data,
        timestamp: Date.now(),
        retries: 0
      };
      
      const request = store.add(pendingAction);
      
      request.onsuccess = () => {
        resolve(request.result as number);
      };
      
      request.onerror = (event) => {
        console.error('Error adding pending action:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
    }).catch(error => {
      console.error('Error initializing DB for adding pending action:', error);
      reject(error);
    });
  });
}

// Process pending actions when back online
export async function syncPendingActions(): Promise<void> {
  try {
    if (!navigator.onLine) return;
    
    // Request a sync through the service worker, if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as any).sync.register('sync-tasks');
        return;
      }
    }
    
    // Fallback for browsers without background sync
    const pendingActions = await getPendingActions();
    
    for (const action of pendingActions) {
      try {
        let endpoint = '';
        let method = 'POST';
        
        // Determine API endpoint and method based on action type
        switch (action.action) {
          case 'create-task':
            endpoint = '/api/tasks';
            method = 'POST';
            break;
          case 'update-task':
            endpoint = `/api/tasks/${action.data.id}`;
            method = 'PATCH';
            break;
          case 'delete-task':
            endpoint = `/api/tasks/${action.data.id}`;
            method = 'DELETE';
            break;
          default:
            console.warn('Unknown action type:', action.action);
            continue;
        }
        
        // Attempt to sync with server
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(action.data)
        });
        
        if (response.ok) {
          // Remove successful action from pending queue
          await removePendingAction(action.id);
        } else {
          // Increment retry count or remove if too many attempts
          if (action.retries >= 3) {
            await removePendingAction(action.id);
          } else {
            await updateActionRetryCount(action.id, action.retries + 1);
          }
        }
      } catch (error) {
        console.error('Error syncing action:', action, error);
      }
    }
  } catch (error) {
    console.error('Error in syncPendingActions:', error);
  }
}

// Helper function to get all pending actions
export async function getPendingActions(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    initOfflineDB().then(db => {
      const transaction = db.transaction(PENDING_ACTIONS_STORE, 'readonly');
      const store = transaction.objectStore(PENDING_ACTIONS_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = (event) => {
        console.error('Error getting pending actions:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
    }).catch(error => {
      console.error('Error initializing DB for getting pending actions:', error);
      resolve([]); // Resolve with empty array to prevent further errors
    });
  });
}

// Helper function to remove a pending action
export async function removePendingAction(id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    initOfflineDB().then(db => {
      const transaction = db.transaction(PENDING_ACTIONS_STORE, 'readwrite');
      const store = transaction.objectStore(PENDING_ACTIONS_STORE);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error removing pending action:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
    }).catch(error => {
      console.error('Error initializing DB for removing pending action:', error);
      reject(error);
    });
  });
}

// Helper function to update retry count
export async function updateActionRetryCount(id: number, retries: number): Promise<void> {
  return new Promise((resolve, reject) => {
    initOfflineDB().then(db => {
      // First get the record
      const getTransaction = db.transaction(PENDING_ACTIONS_STORE, 'readonly');
      const getStore = getTransaction.objectStore(PENDING_ACTIONS_STORE);
      const getRequest = getStore.get(id);
      
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          // Update the record in a new transaction
          const updateTransaction = db.transaction(PENDING_ACTIONS_STORE, 'readwrite');
          const updateStore = updateTransaction.objectStore(PENDING_ACTIONS_STORE);
          
          record.retries = retries;
          const updateRequest = updateStore.put(record);
          
          updateRequest.onsuccess = () => {
            resolve();
          };
          
          updateRequest.onerror = (event) => {
            console.error('Error updating retry count:', (event.target as IDBRequest).error);
            reject((event.target as IDBRequest).error);
          };
        } else {
          resolve(); // Record not found, consider it resolved
        }
      };
      
      getRequest.onerror = (event) => {
        console.error('Error getting record for retry update:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
    }).catch(error => {
      console.error('Error initializing DB for updating retry count:', error);
      reject(error);
    });
  });
}

// Helper function to clear a store
export async function clearStore(storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    initOfflineDB().then(db => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error(`Error clearing store ${storeName}:`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
    }).catch(error => {
      console.error(`Error initializing DB for clearing store ${storeName}:`, error);
      reject(error);
    });
  });
}

// Check if the connection is online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Add a listener for online/offline events
export function addOnlineStatusListener(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return a function to remove the listeners
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
} 