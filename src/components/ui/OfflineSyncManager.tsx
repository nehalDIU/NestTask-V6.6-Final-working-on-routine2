import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export function OfflineSyncManager() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullMoveY, setPullMoveY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger pull-to-refresh at the top of the page
      if (window.scrollY <= 10) {
        setPullStartY(e.touches[0].clientY);
        setIsPulling(true);
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (isPulling) {
        setPullMoveY(e.touches[0].clientY);
      }
    };
    
    const handleTouchEnd = () => {
      if (isPulling && pullMoveY - pullStartY > 100) {
        // If pulled down more than 100px, trigger refresh
        handleRefresh();
      }
      
      // Reset pulling state
      setIsPulling(false);
      setPullStartY(0);
      setPullMoveY(0);
    };
    
    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullStartY, pullMoveY]);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };
  
  // Calculate the pull distance for visual feedback
  const pullDistance = isPulling ? Math.min(Math.max(0, pullMoveY - pullStartY), 150) : 0;
  
  return (
    <>
      {/* Pull-to-refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div 
          className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 bg-gradient-to-b from-gray-100 to-transparent dark:from-gray-800 dark:to-transparent"
          style={{ 
            height: pullDistance || (isRefreshing ? 60 : 0),
            transition: isRefreshing ? 'none' : 'height 0.2s ease'
          }}
        >
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : 'transform rotate-0'}`} 
              style={{ 
                transform: isRefreshing ? 'rotate(0deg)' : `rotate(${Math.min(pullDistance * 2, 360)}deg)` 
              }} 
            />
            <span className="text-sm font-medium">
              {isRefreshing ? 'Refreshing...' : pullDistance > 100 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
    </>
  );
} 