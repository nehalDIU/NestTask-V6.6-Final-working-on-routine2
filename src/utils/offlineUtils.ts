import { Workbox } from 'workbox-window';

// IndexedDB database name and version
const DB_NAME = 'nesttask-offline-db';
const DB_VERSION = 2; // Upgraded version to accommodate new store

// Store names
const TASKS_STORE = 'tasks';
const PENDING_ACTIONS_STORE = 'pending-actions';
const ROUTINES_STORE = 'routines'; // New store for routines

// Keep a reference to the open database to avoid repeatedly opening it
let dbPromise: Promise<IDBDatabase> | null = null;

// Initialize the offline database with connection pooling
export async function initOfflineDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
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
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Handle connection closing
        db.onclose = () => {
          console.log("IndexedDB connection closed, clearing cached connection");
          dbPromise = null;
        };
        
        // Handle version change (another tab updated the DB)
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
          console.log("Database version changed in another tab, refreshing connection");
          // You might want to reload the page here or re-initialize the DB
        };
        
        resolve(db);
      };
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB:', (event.target as IDBOpenDBRequest).error);
        dbPromise = null;
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }
  
  return dbPromise;
}

// Register the service worker for offline functionality
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined | null> {
  // Skip service worker registration during development for faster reloads
  if (process.env.NODE_ENV === 'development') {
    console.log('Skipping service worker registration in development mode');
    return Promise.resolve(null);
  }

  if ('serviceWorker' in navigator) {
    // Defer service worker registration until after the page has loaded
    // to avoid blocking the main thread during startup
    const registerSW = () => {
      const wb = new Workbox('/service-worker.js');
      
      // Add event listeners for service worker updates
      wb.addEventListener('installed', (event) => {
        if (event.isUpdate) {
          // Create a non-blocking notification for updates
          const updateNotification = document.createElement('div');
          updateNotification.className = 
            'fixed bottom-4 left-4 z-50 bg-blue-50 border border-blue-200 text-blue-800 ' +
            'dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 ' + 
            'rounded-lg p-3 shadow-lg flex items-center';
          
          updateNotification.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="font-medium">App updated!</p>
              <button id="update-btn" class="text-sm underline cursor-pointer">Reload to update</button>
            </div>
          `;
          
          document.body.appendChild(updateNotification);
          document.getElementById('update-btn')?.addEventListener('click', () => {
            window.location.reload();
          });
        }
      });
      
      // Add event listeners for online/offline status changes from the service worker
      // using a more efficient message handling approach
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'ONLINE_STATUS_CHANGE') {
          const { status } = event.data.payload;
          
          // Dispatch a custom event that components can listen for
          window.dispatchEvent(
            new CustomEvent('connection-status-change', { 
              detail: { status } 
            })
          );
          
          // Update UI based on connection status
          if (status === 'online') {
            // Try to sync pending actions without blocking the main thread
            setTimeout(() => syncPendingActions(), 0);
          }
        }
      });
      
      // Register and return the service worker registration
      return wb.register();
    };

    // Register after page load to avoid blocking rendering
    if (document.readyState === 'complete') {
      return registerSW();
    } else {
      return new Promise(resolve => {
        window.addEventListener('load', () => {
          resolve(registerSW());
        });
      });
    }
  }
  
  return Promise.resolve(null);
}

// Helper to run a database transaction with improved error handling
async function runTransaction<T>(
  storeName: string, 
  mode: IDBTransactionMode, 
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  try {
    const db = await initOfflineDB();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      const request = callback(store);
      
      // Handle transaction completion and errors
      transaction.oncomplete = () => {
        if (request.readyState === 'done' && !request.error) {
          resolve(request.result);
        }
      };
      
      transaction.onerror = () => {
        console.error(`Transaction error on ${storeName}:`, transaction.error);
        reject(transaction.error);
      };
      
      transaction.onabort = () => {
        console.warn(`Transaction aborted on ${storeName}:`, transaction.error);
        reject(transaction.error || new Error('Transaction aborted'));
      };
      
      // Also handle request errors specifically
      request.onerror = () => {
        console.error(`Request error on ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error(`Error in transaction on ${storeName}:`, error);
    throw error;
  }
}

// Optimized: Save task data to IndexedDB for offline access using batched operations
export async function saveTasksLocally(tasks: any[]): Promise<void> {
  if (!tasks || tasks.length === 0) {
    console.warn('No tasks provided to save locally');
    return;
  }

  const db = await initOfflineDB();
  const transaction = db.transaction(TASKS_STORE, 'readwrite');
  const store = transaction.objectStore(TASKS_STORE);
  
  // Clear existing data first
  store.clear();
  
  // Add all tasks in the same transaction
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      console.log(`Successfully saved ${tasks.length} tasks for offline use`);
      resolve();
    };
    
    transaction.onerror = () => {
      console.error('Error saving tasks:', transaction.error);
      reject(transaction.error);
    };
    
    // Use try-catch inside the transaction to keep it going if one task fails
    tasks.forEach(task => {
      try {
        store.add(task);
      } catch (error) {
        console.error('Error adding task:', error, task);
        // Continue with other tasks
      }
    });
  });
}

// Optimized: Get tasks from IndexedDB with improved error handling
export async function getLocalTasks(): Promise<any[]> {
  try {
    return await runTransaction(TASKS_STORE, 'readonly', (store) => store.getAll());
  } catch (error) {
    console.error('Failed to get local tasks:', error);
    return []; // Return empty array on error for graceful degradation
  }
}

// Optimized: Add a pending action with better transaction handling
export async function addPendingAction(action: string, data: any): Promise<IDBValidKey> {
  const pendingAction = {
    action,
    data,
    timestamp: Date.now(),
    retries: 0
  };
  
  try {
    return await runTransaction(PENDING_ACTIONS_STORE, 'readwrite', 
      (store) => store.add(pendingAction));
  } catch (error) {
    console.error('Error adding pending action:', error);
    throw error;
  }
}

// Process pending actions when back online - with optimized error handling and batching
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
    if (pendingActions.length === 0) return;
    
    console.log(`Syncing ${pendingActions.length} pending actions`);
    
    // Group similar actions to potentially batch them
    const actionsByType = pendingActions.reduce<Record<string, any[]>>((acc, action) => {
      if (!acc[action.action]) {
        acc[action.action] = [];
      }
      acc[action.action].push(action);
      return acc;
    }, {});
    
    // Process each action type
    const allPromises: Promise<void>[] = [];
    
    for (const actionType in actionsByType) {
      const actionItems = actionsByType[actionType];
      // For certain action types, we could implement batching
      // For simplicity, process each action individually for now
      for (const action of actionItems) {
        allPromises.push(processPendingAction(action));
      }
    }
    
    // Wait for all actions to complete
    await Promise.allSettled(allPromises);
    
  } catch (error) {
    console.error('Error syncing pending actions:', error);
  }
}

// Helper to process a single pending action
async function processPendingAction(action: any): Promise<void> {
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
        return; // Skip this action
    }
    
    // Implement exponential backoff for retries
    const maxRetryDelay = 10000; // 10 seconds
    const baseDelay = 1000; // 1 second
    const retryDelay = Math.min(baseDelay * Math.pow(2, action.retries), maxRetryDelay);
    
    // Add some jitter to prevent all retries happening at the same time
    const jitter = Math.random() * 0.3 + 0.85; // Between 0.85 and 1.15
    const delay = retryDelay * jitter;
    
    // If this isn't the first attempt, add a small delay
    if (action.retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
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
    
    // If this was a create action with a temporary ID, update the ID
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

// Get all pending actions
export async function getPendingActions(): Promise<any[]> {
  try {
    return await runTransaction(PENDING_ACTIONS_STORE, 'readonly', (store) => store.getAll());
  } catch (error) {
    console.error('Error getting pending actions:', error);
    return []; // Return empty array on error
  }
}

// Remove a pending action
export async function removePendingAction(id: IDBValidKey): Promise<void> {
  try {
    await runTransaction(PENDING_ACTIONS_STORE, 'readwrite', (store) => store.delete(id));
  } catch (error) {
    console.error('Error removing pending action:', error);
    throw error;
  }
}

// Update a pending action
export async function updatePendingAction(id: IDBValidKey, updatedAction: any): Promise<void> {
  try {
    // First get the existing record
    const existingAction = await runTransaction(PENDING_ACTIONS_STORE, 'readonly', 
      (store) => store.get(id));
    
    if (!existingAction) {
      console.warn(`Pending action with ID ${id} not found for update`);
      return;
    }
    
    // Update the record
    await runTransaction(PENDING_ACTIONS_STORE, 'readwrite', (store) => 
      store.put({
        ...existingAction,
        ...updatedAction,
        id // Ensure ID is preserved
      })
    );
  } catch (error) {
    console.error('Error updating pending action:', error);
    throw error;
  }
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

  const db = await initOfflineDB();
  const transaction = db.transaction(ROUTINES_STORE, 'readwrite');
  const store = transaction.objectStore(ROUTINES_STORE);
  
  // Clear existing data first
  store.clear();
  
  // Add all routines in the same transaction
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      console.log(`Successfully saved ${routines.length} routines for offline use`);
      resolve();
    };
    
    transaction.onerror = () => {
      console.error('Error saving routines:', transaction.error);
      reject(transaction.error);
    };
    
    // Add each routine
    routines.forEach(routine => {
      try {
        store.add(routine);
      } catch (error) {
        console.error('Error adding routine:', error, routine);
        // Continue with other routines
      }
    });
  });
}

// Get routines from IndexedDB when offline
export async function getLocalRoutines(): Promise<any[]> {
  try {
    return await runTransaction(ROUTINES_STORE, 'readonly', (store) => store.getAll());
  } catch (error) {
    console.error('Error getting local routines:', error);
    return []; // Return empty array on error
  }
} 