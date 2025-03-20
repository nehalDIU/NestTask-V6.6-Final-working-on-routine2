import { useState } from 'react';
import { Wifi, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  
  const handleSync = async () => {
    if (onSync && !isSyncing) {
      try {
        await onSync();
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } catch (error) {
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 3000);
      }
    }
  };
  
  const handleForceRefresh = () => {
    setIsManualRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };
  
  return (
    <div className="relative">
      <div className="flex flex-col gap-2">
        {isOffline ? (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            disabled
            className="flex items-center justify-center gap-2 text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 text-sm px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <Wifi className="h-4 w-4" />
            <span>Offline Mode</span>
          </motion.button>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-200 dark:border-blue-800"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </motion.button>
        )}
        
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={handleForceRefresh}
          disabled={isManualRefreshing}
          className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed border border-green-200 dark:border-green-800"
        >
          {isManualRefreshing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>{isManualRefreshing ? 'Refreshing...' : 'Manual Refresh'}</span>
        </motion.button>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg shadow-lg border border-green-200 dark:border-green-800 flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Sync completed successfully</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {showErrorToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg shadow-lg border border-red-200 dark:border-red-800 flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Sync failed. Please try again.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 