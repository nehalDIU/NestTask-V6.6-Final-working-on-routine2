/**
 * IndexedDB Debugging and Verification Utility
 * 
 * This utility provides functions to diagnose and test IndexedDB functionality.
 * It can be used to investigate problems with IndexedDB storage and transactions.
 */

import { initOfflineDB } from './offlineUtils';

/**
 * Check if IndexedDB is supported and accessible in the current browser
 */
export function checkIndexedDBSupport(): boolean {
  try {
    if (!window.indexedDB) {
      console.error('IndexedDB is not supported in this browser');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking IndexedDB support:', error);
    return false;
  }
}

/**
 * List all IndexedDB databases available in the browser
 */
export async function listDatabases(): Promise<string[]> {
  if (!checkIndexedDBSupport()) return [];
  
  try {
    // This is only supported in modern browsers
    if ('databases' in indexedDB) {
      const databases = await (indexedDB as any).databases();
      console.log('Available IndexedDB databases:', databases);
      return databases.map((db: any) => db.name);
    } else {
      console.warn('indexedDB.databases() is not supported in this browser');
      return [];
    }
  } catch (error) {
    console.error('Error listing databases:', error);
    return [];
  }
}

/**
 * List all object stores in the app's database
 */
export async function listObjectStores(): Promise<string[]> {
  if (!checkIndexedDBSupport()) return [];
  
  try {
    const db = await initOfflineDB();
    const storeNames = Array.from(db.objectStoreNames);
    console.log('Available object stores:', storeNames);
    db.close();
    return storeNames;
  } catch (error) {
    console.error('Error listing object stores:', error);
    return [];
  }
}

/**
 * Count the items in each object store
 */
export async function countItemsInStores(): Promise<Record<string, number>> {
  if (!checkIndexedDBSupport()) return {};
  
  try {
    const db = await initOfflineDB();
    const storeNames = Array.from(db.objectStoreNames);
    const counts: Record<string, number> = {};
    
    // We need to do this sequentially to avoid transaction issues
    for (const storeName of storeNames) {
      try {
        const count = await new Promise<number>((resolve, reject) => {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const countRequest = store.count();
          
          countRequest.onsuccess = () => resolve(countRequest.result);
          countRequest.onerror = (event) => {
            console.error(`Error counting items in ${storeName}:`, (event.target as IDBRequest).error);
            reject((event.target as IDBRequest).error);
          };
        });
        
        counts[storeName] = count;
      } catch (error) {
        console.error(`Error counting items in ${storeName}:`, error);
        counts[storeName] = -1; // Indicates error
      }
    }
    
    console.log('Item counts:', counts);
    db.close();
    return counts;
  } catch (error) {
    console.error('Error counting items in stores:', error);
    return {};
  }
}

/**
 * Delete and recreate a specific object store to fix corruption
 * This requires a database version upgrade
 */
export async function resetObjectStore(storeName: string): Promise<boolean> {
  if (!checkIndexedDBSupport()) return false;
  
  try {
    // First, get the current version
    const db = await initOfflineDB();
    const currentVersion = db.version;
    db.close();
    
    // Open with a higher version to trigger an upgrade
    const upgradedDb = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(db.name, currentVersion + 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Delete the store if it exists
        if (db.objectStoreNames.contains(storeName)) {
          db.deleteObjectStore(storeName);
        }
        
        // Recreate the store with appropriate configuration
        if (storeName === 'tasks') {
          db.createObjectStore('tasks', { keyPath: 'id' });
        } else if (storeName === 'pending-actions') {
          const store = db.createObjectStore('pending-actions', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('action', 'action', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      
      request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
      request.onerror = (event) => {
        console.error('Error upgrading database:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
    
    console.log(`Successfully reset object store: ${storeName}`);
    upgradedDb.close();
    return true;
  } catch (error) {
    console.error(`Error resetting object store ${storeName}:`, error);
    return false;
  }
}

/**
 * Delete the entire database and recreate it
 * Use this as a last resort if the database is corrupted
 */
export async function resetEntireDatabase(): Promise<boolean> {
  if (!checkIndexedDBSupport()) return false;
  
  try {
    // Get database name first
    const db = await initOfflineDB();
    const dbName = db.name;
    db.close();
    
    // Delete the database
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      
      request.onsuccess = () => {
        console.log(`Successfully deleted database: ${dbName}`);
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error deleting database:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
    
    // The next call to initOfflineDB will recreate the database
    const newDb = await initOfflineDB();
    console.log('Successfully recreated database with version:', newDb.version);
    newDb.close();
    
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    return false;
  }
}

/**
 * Quick test to verify the database is working properly
 */
export async function testDatabaseOperations(): Promise<boolean> {
  if (!checkIndexedDBSupport()) return false;
  
  try {
    // Step 1: Open the database
    const db = await initOfflineDB();
    
    // Step 2: Test writing to the tasks store
    const writeResult = await new Promise<boolean>((resolve, reject) => {
      try {
        const transaction = db.transaction('tasks', 'readwrite');
        
        transaction.onerror = (event) => {
          console.error('Transaction error during test write:', (event.target as IDBTransaction).error);
          reject((event.target as IDBTransaction).error);
        };
        
        transaction.oncomplete = () => {
          console.log('Test write transaction completed successfully');
          resolve(true);
        };
        
        const store = transaction.objectStore('tasks');
        
        // Test data
        const testTask = {
          id: 'test-' + Date.now(),
          name: 'Test Task',
          description: 'This is a test task to verify IndexedDB',
          category: 'task',
          dueDate: new Date().toISOString(),
          status: 'my-tasks',
          createdAt: new Date().toISOString(),
          isAdminTask: false
        };
        
        store.add(testTask);
      } catch (error) {
        console.error('Error in test write transaction:', error);
        reject(error);
      }
    });
    
    if (!writeResult) {
      console.error('Write test failed');
      return false;
    }
    
    // Step 3: Test reading from the tasks store
    const readResult = await new Promise<boolean>((resolve, reject) => {
      try {
        const transaction = db.transaction('tasks', 'readonly');
        
        transaction.onerror = (event) => {
          console.error('Transaction error during test read:', (event.target as IDBTransaction).error);
          reject((event.target as IDBTransaction).error);
        };
        
        const store = transaction.objectStore('tasks');
        const request = store.getAll();
        
        request.onsuccess = () => {
          const tasks = request.result;
          console.log('Retrieved test tasks:', tasks);
          resolve(tasks.length > 0);
        };
        
        request.onerror = (event) => {
          console.error('Error retrieving test tasks:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };
      } catch (error) {
        console.error('Error in test read transaction:', error);
        reject(error);
      }
    });
    
    if (!readResult) {
      console.error('Read test failed');
      return false;
    }
    
    // Step 4: Close the database
    db.close();
    
    console.log('All database operations tested successfully!');
    return true;
  } catch (error) {
    console.error('Error testing database operations:', error);
    return false;
  }
}

/**
 * Run all diagnostics and tests
 */
export async function runFullDiagnostics(): Promise<void> {
  console.log('===== IndexedDB Diagnostics =====');
  
  // Check basic support
  const isSupported = checkIndexedDBSupport();
  console.log(`IndexedDB Support: ${isSupported ? '✅' : '❌'}`);
  if (!isSupported) {
    console.log('Diagnostics aborted: IndexedDB not supported');
    return;
  }
  
  // List databases
  const databases = await listDatabases();
  console.log(`Available Databases: ${databases.length > 0 ? '✅' : '❌'}`);
  
  // Check object stores
  const stores = await listObjectStores();
  console.log(`Object Stores: ${stores.length > 0 ? '✅' : '❓'}`);
  
  // Count items
  const counts = await countItemsInStores();
  const countsFormatted = Object.entries(counts)
    .map(([store, count]) => `${store}: ${count}`)
    .join(', ');
  console.log(`Store Contents: ${countsFormatted}`);
  
  // Test operations
  const opsResult = await testDatabaseOperations();
  console.log(`Database Operations: ${opsResult ? '✅' : '❌'}`);
  
  console.log('===== Diagnostics Complete =====');
  
  // Provide recommendations
  if (!opsResult) {
    console.log('\nRecommendations:');
    console.log('1. Try resetting the object stores using resetObjectStore()');
    console.log('2. If that fails, try resetting the entire database using resetEntireDatabase()');
    console.log('3. Check browser settings to ensure IndexedDB is not being blocked');
    console.log('4. Ensure you have sufficient storage quota (especially on mobile devices)');
  }
} 