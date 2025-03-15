import { Workbox } from 'workbox-window';

// IndexedDB database name and version
const DB_NAME = 'nesttask-offline-db';
const DB_VERSION = 2; // Upgraded version to accommodate new store

// Store names
const TASKS_STORE = 'tasks';
const PENDING_ACTIONS_STORE = 'pending-actions';
const ROUTINES_STORE = 'routines'; // New store for routines

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
      
      // Add routines store for offline access
      if (!db.objectStoreNames.contains(ROUTINES_STORE)) {
        db.createObjectStore(ROUTINES_STORE, { keyPath: 'id' });
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
          case 'create-routine':
            endpoint = '/api/routines';
            method = 'POST';
            break;
          case 'update-routine':
            endpoint = `/api/routines/${action.data.id}`;
            method = 'PATCH';
            break;
          case 'delete-routine':
            endpoint = `/api/routines/${action.data.id}`;
            method = 'DELETE';
            break;
          case 'add-routine-slot':
            endpoint = `/api/routines/${action.data.routineId}/slots`;
            method = 'POST';
            break;
          case 'update-routine-slot':
            endpoint = `/api/routines/${action.data.routineId}/slots/${action.data.slotId}`;
            method = 'PATCH';
            break;
          case 'delete-routine-slot':
            endpoint = `/api/routines/${action.data.routineId}/slots/${action.data.slotId}`;
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
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        // If successful, remove the action from the pending queue
        await removePendingAction(action.id);
        
        // If this was a create action with a temporary ID, we might need to update
        // the ID in our local storage with the real server-assigned ID
        if (action.action === 'create-task' || action.action === 'create-routine') {
          const responseData = await response.json();
          if (responseData.id && action.data.id && action.data.id.startsWith('temp-')) {
            if (action.action === 'create-task') {
              await updateLocalTaskId(action.data.id, responseData.id);
            } else if (action.action === 'create-routine') {
              await updateLocalRoutineId(action.data.id, responseData.id);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to sync action ${action.action}:`, error);
        
        // Increment retry count
        action.retries = (action.retries || 0) + 1;
        
        // If we haven't exceeded max retries, update the action
        if (action.retries < 5) {
          await updatePendingAction(action.id, action);
        } else {
          // Otherwise, mark it as failed but don't remove it
          await updatePendingAction(action.id, {
            ...action,
            status: 'failed'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error syncing pending actions:', error);
  }
}

// Helper to update a task's ID after successful sync
async function updateLocalTaskId(tempId: string, realId: string): Promise<void> {
  try {
    const tasks = await getLocalTasks();
    const updatedTasks = tasks.map(task => 
      task.id === tempId ? { ...task, id: realId } : task
    );
    await saveTasksLocally(updatedTasks);
  } catch (error) {
    console.error('Error updating local task ID:', error);
  }
}

// Helper to update a routine's ID after successful sync
async function updateLocalRoutineId(tempId: string, realId: string): Promise<void> {
  try {
    const routines = await getLocalRoutines();
    const updatedRoutines = routines.map(routine => 
      routine.id === tempId ? { ...routine, id: realId } : routine
    );
    await saveRoutinesLocally(updatedRoutines);
  } catch (error) {
    console.error('Error updating local routine ID:', error);
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

// Save routines data to IndexedDB for offline access
export async function saveRoutinesLocally(routines: any[]): Promise<void> {
  if (!routines || routines.length === 0) {
    console.warn('No routines provided to save locally');
    return;
  }

  return new Promise((resolve, reject) => {
    initOfflineDB().then(db => {
      // Create a new transaction for the clear operation
      const clearTransaction = db.transaction(ROUTINES_STORE, 'readwrite');
      const clearStore = clearTransaction.objectStore(ROUTINES_STORE);
      
      const clearRequest = clearStore.clear();
      
      clearRequest.onsuccess = () => {
        // After clearing completes successfully, start a new transaction for adding
        const addTransaction = db.transaction(ROUTINES_STORE, 'readwrite');
        const addStore = addTransaction.objectStore(ROUTINES_STORE);
        
        // Track any errors
        let hasError = false;
        
        addTransaction.onerror = (event) => {
          console.error('Transaction error during routine save:', (event.target as IDBTransaction).error);
          hasError = true;
          reject((event.target as IDBTransaction).error);
        };
        
        addTransaction.oncomplete = () => {
          if (!hasError) {
            console.log('Successfully saved routines for offline use');
            resolve();
          }
        };
        
        // Add routines one by one
        routines.forEach(routine => {
          try {
            addStore.add(routine);
          } catch (error) {
            console.error('Error adding routine to store:', error, routine);
            hasError = true;
          }
        });
      };
      
      clearRequest.onerror = (event) => {
        console.error('Error clearing routine store:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
    }).catch(error => {
      console.error('Error initializing DB for saving routines:', error);
      reject(error);
    });
  });
}

// Get routines from IndexedDB when offline
export async function getLocalRoutines(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    initOfflineDB().then(db => {
      const transaction = db.transaction(ROUTINES_STORE, 'readonly');
      const store = transaction.objectStore(ROUTINES_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log('Retrieved routines from local storage:', request.result?.length);
        resolve(request.result || []);
      };
      
      request.onerror = (event) => {
        console.error('Error getting local routines:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
    }).catch(error => {
      console.error('Error initializing DB for getting routines:', error);
      reject(error);
    });
  });
}

// Helper function to update a pending action
export async function updatePendingAction(id: number, updatedAction: any): Promise<void> {
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
          
          const updateRequest = updateStore.put({
            ...record,
            ...updatedAction,
            id // Ensure ID is preserved
          });
          
          updateRequest.onsuccess = () => {
            resolve();
          };
          
          updateRequest.onerror = (event) => {
            console.error('Error updating pending action:', (event.target as IDBRequest).error);
            reject((event.target as IDBRequest).error);
          };
        } else {
          console.warn(`Pending action with ID ${id} not found for update`);
          resolve(); // Record not found, consider it resolved
        }
      };
      
      getRequest.onerror = (event) => {
        console.error('Error getting record for pending action update:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
    }).catch(error => {
      console.error('Error initializing DB for updating pending action:', error);
      reject(error);
    });
  });
} 