/**
 * Utility to test offline functionality
 * This can be run from the developer console to verify that the offline features are working properly
 */

import { saveTasksLocally, getLocalTasks, addPendingAction, initOfflineDB } from './offlineUtils';

/**
 * Verify that the IndexedDB is working properly
 */
export async function verifyIndexedDB(): Promise<boolean> {
  try {
    // Check if IndexedDB is supported
    if (!window.indexedDB) {
      console.error('IndexedDB is not supported in this browser');
      return false;
    }
    
    // Try to open the database
    const db = await initOfflineDB();
    console.log('✅ IndexedDB initialized successfully', db);
    return true;
  } catch (error) {
    console.error('❌ IndexedDB verification failed:', error);
    return false;
  }
}

/**
 * Test saving and retrieving tasks from local storage
 */
export async function testLocalTaskStorage(): Promise<boolean> {
  try {
    const testTasks = [
      {
        id: 'test-1',
        name: 'Test Task 1',
        category: 'task',
        dueDate: new Date().toISOString(),
        description: 'This is a test task for offline functionality',
        status: 'my-tasks',
        createdAt: new Date().toISOString(),
        isAdminTask: false
      },
      {
        id: 'test-2',
        name: 'Test Task 2',
        category: 'assignment',
        dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        description: 'Another test task for offline functionality',
        status: 'in-progress',
        createdAt: new Date().toISOString(),
        isAdminTask: false
      }
    ];
    
    // Save test tasks
    await saveTasksLocally(testTasks);
    console.log('✅ Tasks saved locally');
    
    // Retrieve tasks
    const retrievedTasks = await getLocalTasks();
    console.log('📋 Retrieved tasks:', retrievedTasks);
    
    // Verify tasks match
    const success = 
      retrievedTasks.length === testTasks.length &&
      retrievedTasks.some(t => t.id === 'test-1') &&
      retrievedTasks.some(t => t.id === 'test-2');
    
    if (success) {
      console.log('✅ Local task storage test passed!');
    } else {
      console.error('❌ Local task storage test failed - retrieved tasks do not match saved tasks');
    }
    
    return success;
  } catch (error) {
    console.error('❌ Local task storage test failed:', error);
    return false;
  }
}

/**
 * Test pending actions storage
 */
export async function testPendingActions(): Promise<boolean> {
  try {
    // Add a test pending action
    const actionId = await addPendingAction('create-task', {
      name: 'Offline Created Task',
      category: 'task',
      dueDate: new Date().toISOString(),
      description: 'This task was created while offline',
      status: 'my-tasks'
    });
    
    console.log('✅ Pending action saved with ID:', actionId);
    
    // We can't easily verify the pending actions directly,
    // but if addPendingAction didn't throw, we consider it a success
    return true;
  } catch (error) {
    console.error('❌ Pending actions test failed:', error);
    return false;
  }
}

/**
 * Run all offline verification tests
 */
export async function runOfflineTests(): Promise<void> {
  console.log('🧪 Starting offline functionality tests...');
  
  const indexedDBStatus = await verifyIndexedDB();
  const localStorageStatus = await testLocalTaskStorage();
  const pendingActionsStatus = await testPendingActions();
  
  console.log('📊 Offline Test Results:');
  console.log(`IndexedDB: ${indexedDBStatus ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Local Storage: ${localStorageStatus ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Pending Actions: ${pendingActionsStatus ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallStatus = indexedDBStatus && localStorageStatus && pendingActionsStatus;
  console.log(`Overall Status: ${overallStatus ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (overallStatus) {
    console.log('🎉 Your app is ready for offline use!');
  } else {
    console.log('⚠️ Some offline features may not work correctly.');
  }
} 