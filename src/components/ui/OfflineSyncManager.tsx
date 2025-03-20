import { useState } from 'react';
import { Wifi, RefreshCw } from 'lucide-react';

interface OfflineSyncManagerProps {
  isSyncing?: boolean;
  onSync?: () => Promise<void>;
  isOffline?: boolean;
}

export function OfflineSyncManager({ 
  isSyncing = false, 
  onSync, 
  isOffline = false 
}: OfflineSyncManagerProps) {
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  
  const handleSync = async () => {
    if (onSync && !isSyncing) {
      await onSync();
    }
  };
  
  // Force a page refresh
  const handleForceRefresh = () => {
    setIsManualRefreshing(true);
    // Add a small delay to show the loading state before refresh
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };
  
  return (
    <div className="flex flex-col gap-2">
      {isOffline ? (
        <button
          disabled
          className="flex items-center justify-center gap-2 text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 text-sm px-3 py-1.5 rounded-md"
        >
          <Wifi className="h-4 w-4" />
          <span>Offline Mode</span>
        </button>
      ) : (
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 text-sm px-3 py-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      )}
      
      {/* Manual Refresh Button */}
      <button
        onClick={handleForceRefresh}
        disabled={isManualRefreshing}
        className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 text-sm px-3 py-1.5 rounded-md hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isManualRefreshing ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        <span>{isManualRefreshing ? 'Refreshing...' : 'Manual Refresh'}</span>
      </button>
    </div>
  );
} 