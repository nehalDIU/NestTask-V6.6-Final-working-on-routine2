/**
 * IndexedDB Utility for Offline Storage and Sync
 * 
 * This module provides a simplified API for working with IndexedDB:
 * - Handles database setup and versioning
 * - Provides CRUD operations for offline data
 * - Manages sync queue for operations performed while offline
 * - Implements optimistic UI updates with background sync
 */

// IndexedDB database name and version
const DB_NAME = 'nesttask-db';
const DB_VERSION = 1;

// Store names for different data types
export const STORES = {
  tasks: 'tasks',
  routines: 'routines',
  courses: 'courses',
  assignments: 'assignments',
  syncQueue: 'sync-queue'
};

// Initialize IndexedDB
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize the database
 */
export function initDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      const db = request.result;
      console.log('IndexedDB connected:', db.name, 'v' + db.version);
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;
      
      console.log(`Upgrading IndexedDB from v${oldVersion} to v${DB_VERSION}`);
      
      // Create object stores with auto-incrementing IDs
      if (!db.objectStoreNames.contains(STORES.tasks)) {
        const taskStore = db.createObjectStore(STORES.tasks, { keyPath: 'id' });
        taskStore.createIndex('status', 'status', { unique: false });
        taskStore.createIndex('dueDate', 'dueDate', { unique: false });
        taskStore.createIndex('lastModified', 'lastModified', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.routines)) {
        const routineStore = db.createObjectStore(STORES.routines, { keyPath: 'id' });
        routineStore.createIndex('lastModified', 'lastModified', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.courses)) {
        const courseStore = db.createObjectStore(STORES.courses, { keyPath: 'id' });
        courseStore.createIndex('lastModified', 'lastModified', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.assignments)) {
        const assignmentStore = db.createObjectStore(STORES.assignments, { keyPath: 'id' });
        assignmentStore.createIndex('courseId', 'courseId', { unique: false });
        assignmentStore.createIndex('dueDate', 'dueDate', { unique: false });
        assignmentStore.createIndex('lastModified', 'lastModified', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const syncQueueStore = db.createObjectStore(STORES.syncQueue, { 
          keyPath: 'id',
          autoIncrement: true
        });
        syncQueueStore.createIndex('createdAt', 'createdAt', { unique: false });
        syncQueueStore.createIndex('status', 'status', { unique: false });
      }
    };
  });
  
  return dbPromise;
}

/**
 * Get a connection to the database
 */
export async function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    return initDB();
  }
  return dbPromise;
}

/**
 * Create or update a record in a store
 */
export async function setItem<T extends { id: string, lastModified?: number }>(
  storeName: string, 
  item: T
): Promise<T> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // Add lastModified timestamp if not present
    const itemToStore = {
      ...item,
      lastModified: item.lastModified || Date.now()
    };
    
    const request = store.put(itemToStore);
    
    request.onerror = () => {
      console.error(`Error storing item in ${storeName}:`, request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(itemToStore);
    };
    
    transaction.oncomplete = () => {
      console.log(`Item stored in ${storeName} successfully`);
    };
  });
}

/**
 * Get a record by its ID
 */
export async function getItem<T>(
  storeName: string, 
  id: string
): Promise<T | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onerror = () => {
      console.error(`Error getting item from ${storeName}:`, request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
}

/**
 * Get all records from a store
 */
export async function getAllItems<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => {
      console.error(`Error getting items from ${storeName}:`, request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
  });
}

/**
 * Get records by an index value
 */
export async function getItemsByIndex<T>(
  storeName: string, 
  indexName: string, 
  value: IDBValidKey
): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    
    request.onerror = () => {
      console.error(`Error getting items by index from ${storeName}:`, request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
  });
}

/**
 * Delete a record by its ID
 */
export async function deleteItem(
  storeName: string, 
  id: string
): Promise<boolean> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onerror = () => {
      console.error(`Error deleting item from ${storeName}:`, request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(true);
    };
  });
}

/**
 * Clear all records from a store
 */
export async function clearStore(storeName: string): Promise<boolean> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onerror = () => {
      console.error(`Error clearing ${storeName}:`, request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(true);
    };
  });
}

// Sync queue operations
interface SyncQueueItem {
  id?: number;
  createdAt: number;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  operation: 'create' | 'update' | 'delete';
  storeName: string;
  recordId: string;
  data?: any;
  retryCount: number;
  errorMessage?: string;
}

/**
 * Add an operation to the sync queue
 */
export async function addToSyncQueue(
  operation: 'create' | 'update' | 'delete',
  storeName: string,
  recordId: string,
  data?: any
): Promise<number> {
  const queueItem: SyncQueueItem = {
    createdAt: Date.now(),
    status: 'pending',
    operation,
    storeName,
    recordId,
    data,
    retryCount: 0
  };
  
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.syncQueue, 'readwrite');
    const store = transaction.objectStore(STORES.syncQueue);
    const request = store.add(queueItem);
    
    request.onerror = () => {
      console.error('Error adding to sync queue:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      const syncId = request.result as number;
      // Register for background sync if browser supports it
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          (registration as any).sync.register(`sync-${syncId}`).catch((error: Error) => {
            console.error('Background sync registration failed:', error);
          });
        });
      }
      
      resolve(syncId);
    };
  });
}

/**
 * Get pending sync queue items
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return getItemsByIndex<SyncQueueItem>(STORES.syncQueue, 'status', 'pending');
}

/**
 * Update sync queue item status
 */
export async function updateSyncItemStatus(
  id: number,
  status: 'processing' | 'complete' | 'failed',
  errorMessage?: string
): Promise<boolean> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.syncQueue, 'readwrite');
    const store = transaction.objectStore(STORES.syncQueue);
    const request = store.get(id);
    
    request.onerror = () => {
      console.error('Error getting sync item:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      const item = request.result;
      if (!item) {
        reject(new Error(`Sync item ${id} not found`));
        return;
      }
      
      item.status = status;
      if (status === 'failed') {
        item.retryCount += 1;
        if (errorMessage) {
          item.errorMessage = errorMessage;
        }
      }
      
      const updateRequest = store.put(item);
      updateRequest.onerror = () => {
        console.error('Error updating sync item:', updateRequest.error);
        reject(updateRequest.error);
      };
      
      updateRequest.onsuccess = () => {
        resolve(true);
      };
    };
  });
}

/**
 * Process all pending sync items (for when online)
 */
export async function processPendingSyncItems(
  apiCallbacks: {
    [key: string]: {
      create: (data: any) => Promise<any>;
      update: (id: string, data: any) => Promise<any>;
      delete: (id: string) => Promise<any>;
    }
  }
): Promise<{
  success: number;
  failed: number;
}> {
  const pendingItems = await getPendingSyncItems();
  let success = 0;
  let failed = 0;
  
  for (const item of pendingItems) {
    try {
      if (!item.id) continue;
      
      // Mark as processing
      await updateSyncItemStatus(item.id, 'processing');
      
      // Check if we have API handlers for this store
      if (!apiCallbacks[item.storeName]) {
        throw new Error(`No API handler for store: ${item.storeName}`);
      }
      
      // Process based on operation type
      if (item.operation === 'create') {
        await apiCallbacks[item.storeName].create(item.data);
      } else if (item.operation === 'update') {
        await apiCallbacks[item.storeName].update(item.recordId, item.data);
      } else if (item.operation === 'delete') {
        await apiCallbacks[item.storeName].delete(item.recordId);
      }
      
      // Mark as complete
      await updateSyncItemStatus(item.id, 'complete');
      success++;
    } catch (error) {
      console.error(`Error processing sync item ${item.id}:`, error);
      if (item.id) {
        await updateSyncItemStatus(
          item.id, 
          'failed', 
          error instanceof Error ? error.message : String(error)
        );
      }
      failed++;
    }
  }
  
  return { success, failed };
}

/**
 * Event listener for online status changes
 * This should be called in the app initialization
 */
export function setupOnlineListener(
  apiCallbacks: {
    [key: string]: {
      create: (data: any) => Promise<any>;
      update: (id: string, data: any) => Promise<any>;
      delete: (id: string) => Promise<any>;
    }
  }
): void {
  // Process pending sync items when coming back online
  window.addEventListener('online', async () => {
    console.log('Network connection restored. Processing pending sync items...');
    try {
      const result = await processPendingSyncItems(apiCallbacks);
      console.log(`Sync complete. Success: ${result.success}, Failed: ${result.failed}`);
    } catch (error) {
      console.error('Error processing sync queue:', error);
    }
  });
  
  // If already online, check for pending items on startup
  if (navigator.onLine) {
    setTimeout(async () => {
      const pendingItems = await getPendingSyncItems();
      if (pendingItems.length > 0) {
        console.log(`Found ${pendingItems.length} pending sync items. Processing...`);
        try {
          const result = await processPendingSyncItems(apiCallbacks);
          console.log(`Sync complete. Success: ${result.success}, Failed: ${result.failed}`);
        } catch (error) {
          console.error('Error processing sync queue:', error);
        }
      }
    }, 3000); // Small delay to allow app to initialize
  }
}

/**
 * Initialize the database and set up listeners
 */
export function initializeOfflineStorage(
  apiCallbacks: {
    [key: string]: {
      create: (data: any) => Promise<any>;
      update: (id: string, data: any) => Promise<any>;
      delete: (id: string) => Promise<any>;
    }
  }
): Promise<IDBDatabase> {
  const initPromise = initDB();
  setupOnlineListener(apiCallbacks);
  
  // Set up service worker message listener
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'BACKGROUND_SYNC_SUCCESS') {
        console.log('Background sync completed successfully:', event.data.payload);
        // Trigger UI refresh or notification
      }
    });
  }
  
  return initPromise;
} 