/**
 * IndexedDB Debugging Helper
 * 
 * This script provides examples of how to use the indexedDBDebug utilities
 * to diagnose and fix common IndexedDB issues.
 */

import { 
  runFullDiagnostics, 
  resetObjectStore, 
  resetEntireDatabase,
  testDatabaseOperations
} from './indexedDBDebug';

/**
 * Fix IndexedDB issues based on the problem type.
 * Call this function from the browser console to diagnose and fix IndexedDB issues.
 * 
 * @example
 * // Import and run in browser console
 * import { fixIndexedDBIssues } from './src/utils/debugIDB';
 * fixIndexedDBIssues();
 */
export async function fixIndexedDBIssues(): Promise<void> {
  console.log('Starting IndexedDB issue diagnosis...');
  
  // Step 1: Run full diagnostics
  await runFullDiagnostics();
  
  // Step 2: Ask the user what action to take
  const action = prompt(
    'What action would you like to take?\n' +
    '1. Reset tasks store\n' +
    '2. Reset pending-actions store\n' +
    '3. Reset entire database (use as last resort)\n' +
    '4. Test database operations again\n' +
    '5. Cancel'
  );
  
  // Step 3: Execute the chosen action
  switch (action) {
    case '1':
      console.log('Resetting tasks store...');
      const tasksResult = await resetObjectStore('tasks');
      console.log(`Tasks store reset ${tasksResult ? 'successful' : 'failed'}`);
      break;
      
    case '2':
      console.log('Resetting pending-actions store...');
      const pendingResult = await resetObjectStore('pending-actions');
      console.log(`Pending-actions store reset ${pendingResult ? 'successful' : 'failed'}`);
      break;
      
    case '3':
      if (confirm('CAUTION: This will delete all locally stored tasks and pending actions. Continue?')) {
        console.log('Resetting entire database...');
        const dbResult = await resetEntireDatabase();
        console.log(`Database reset ${dbResult ? 'successful' : 'failed'}`);
      } else {
        console.log('Database reset cancelled by user');
      }
      break;
      
    case '4':
      console.log('Testing database operations again...');
      const testResult = await testDatabaseOperations();
      console.log(`Test ${testResult ? 'passed' : 'failed'}`);
      break;
      
    case '5':
    default:
      console.log('Action cancelled');
      break;
  }
  
  // Step 4: Final message
  console.log('IndexedDB issue diagnosis complete.');
  console.log('If issues persist, try reloading the page or clearing browser data.');
}

/**
 * Quick fix to reset all IndexedDB data.
 * This is a convenience function for emergency situations.
 * 
 * @example
 * // Import and run in browser console
 * import { resetAllIDBData } from './src/utils/debugIDB';
 * resetAllIDBData();
 */
export async function resetAllIDBData(): Promise<void> {
  if (confirm('CAUTION: This will delete all locally stored tasks and pending actions. Continue?')) {
    console.log('Resetting entire database...');
    const result = await resetEntireDatabase();
    
    if (result) {
      console.log('Database successfully reset. Please reload the page.');
      alert('Database has been reset. Please reload the page to complete the fix.');
    } else {
      console.error('Database reset failed. Please try the following:');
      console.error('1. Open browser developer tools');
      console.error('2. Go to Application tab > Storage > IndexedDB');
      console.error('3. Right-click on your database and select "Delete Database"');
      console.error('4. Reload the page');
      
      alert('Database reset failed. Please see console for manual instructions.');
    }
  } else {
    console.log('Reset cancelled by user');
  }
}

// Export diagnostic functions for direct use in console
export { runFullDiagnostics, resetObjectStore, resetEntireDatabase, testDatabaseOperations }; 