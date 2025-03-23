import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { ArrowDownCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  pullDownThreshold?: number;
  maxPullDownDistance?: number;
  refreshIndicatorHeight?: number;
  loadingIndicator?: ReactNode;
  pullDownIndicator?: ReactNode;
  releaseIndicator?: ReactNode;
  className?: string;
  disabled?: boolean;
  facebookStyle?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  pullDownThreshold = 80,
  maxPullDownDistance = 120,
  refreshIndicatorHeight = 60,
  loadingIndicator,
  pullDownIndicator,
  releaseIndicator,
  className = '',
  disabled = false,
  facebookStyle = true,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wasOverThreshold, setWasOverThreshold] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  
  const shouldRefresh = pullDistance >= pullDownThreshold;

  // Update wasOverThreshold state when pull distance changes
  useEffect(() => {
    if (shouldRefresh) {
      setWasOverThreshold(true);
    }
  }, [shouldRefresh]);

  // Handle the actual refresh action
  const handleRefresh = async () => {
    if (isRefreshing || disabled) return;
    
    setIsRefreshing(true);
    
    try {
      await onRefresh();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      // Add a small delay to make the refresh indicator visible
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        setWasOverThreshold(false);
      }, 600);
    }
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    lastScrollTopRef.current = scrollTop;
    
    // Only enable pull-to-refresh when at the top of the content
    if (scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      currentYRef.current = startYRef.current;
      setIsPulling(true);
      setWasOverThreshold(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    
    // If scrolled down, cancel the pull-to-refresh
    if (scrollTop > 0) {
      startYRef.current = null;
      setIsPulling(false);
      setPullDistance(0);
      return;
    }
    
    if (startYRef.current !== null) {
      currentYRef.current = e.touches[0].clientY;
      const deltaY = Math.max(0, currentYRef.current - startYRef.current);
      
      // Apply a resistance factor to make the pull feel more natural
      const resistanceFactor = facebookStyle ? 0.3 : 0.4;
      const distance = Math.min(maxPullDownDistance, deltaY * resistanceFactor);
      
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling || disabled || isRefreshing) return;
    
    setIsPulling(false);
    
    if (shouldRefresh) {
      handleRefresh();
    } else {
      setPullDistance(0);
      setWasOverThreshold(false);
    }
    
    startYRef.current = null;
    currentYRef.current = null;
  };

  // Custom indicator components
  const FacebookLoadingIndicator = (
    <div className="flex items-center justify-center w-full h-full">
      <div className="relative">
        <div className="w-6 h-6 border-2 border-t-transparent border-primary rounded-full animate-spin"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full opacity-20"></div>
      </div>
    </div>
  );

  const DefaultLoadingIndicator = (
    <div className="flex items-center justify-center w-full h-full">
      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const FacebookPullDownIndicator = (
    <motion.div 
      className="flex items-center justify-center w-full h-full"
      animate={{ 
        rotate: pullDistance > 0 ? Math.min(180, (pullDistance / pullDownThreshold) * 180) : 0 
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M12 5V19M12 5L6 11M12 5L18 11" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );

  const DefaultPullDownIndicator = (
    <div className="flex items-center justify-center w-full h-full gap-2">
      <ArrowDownCircle 
        className={`w-5 h-5 transition-transform ${shouldRefresh ? 'scale-110' : 'scale-100'}`}
      />
      <span className="text-sm font-medium">Pull down to refresh</span>
    </div>
  );

  const FacebookReleaseIndicator = (
    <motion.div 
      className="flex items-center justify-center w-full h-full"
      initial={{ rotate: 180 }}
      animate={{ 
        rotate: 180 
      }}
    >
      <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M12 5V19M12 5L6 11M12 5L18 11" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );

  const DefaultReleaseIndicator = (
    <div className="flex items-center justify-center w-full h-full gap-2">
      <RefreshCw className="w-5 h-5" />
      <span className="text-sm font-medium">Release to refresh</span>
    </div>
  );

  const selectedLoadingIndicator = facebookStyle 
    ? loadingIndicator || FacebookLoadingIndicator 
    : loadingIndicator || DefaultLoadingIndicator;

  const selectedPullDownIndicator = facebookStyle 
    ? pullDownIndicator || FacebookPullDownIndicator 
    : pullDownIndicator || DefaultPullDownIndicator;

  const selectedReleaseIndicator = facebookStyle 
    ? releaseIndicator || FacebookReleaseIndicator 
    : releaseIndicator || DefaultReleaseIndicator;

  return (
    <div
      ref={containerRef}
      className={`pull-to-refresh-container relative overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Facebook-style spinner that appears at the top */}
      <AnimatePresence>
        {facebookStyle && (isRefreshing || pullDistance > 0) && (
          <motion.div 
            className="absolute left-0 right-0 flex items-center justify-center overflow-hidden z-10"
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: isRefreshing ? refreshIndicatorHeight : pullDistance, 
              opacity: (isRefreshing || pullDistance > 0) ? 1 : 0 
            }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              damping: facebookStyle ? 40 : 30, 
              stiffness: facebookStyle ? 300 : 200 
            }}
          >
            {isRefreshing ? 
              selectedLoadingIndicator : 
              (shouldRefresh ? selectedReleaseIndicator : selectedPullDownIndicator)
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standard pull-to-refresh indicator (non-Facebook style) */}
      {!facebookStyle && (
        <motion.div 
          className="absolute left-0 right-0 flex items-center justify-center overflow-hidden z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
          initial={{ height: 0, opacity: 0 }}
          animate={{ 
            height: isRefreshing ? refreshIndicatorHeight : pullDistance, 
            opacity: isRefreshing || pullDistance > 0 ? 1 : 0 
          }}
          transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        >
          {isRefreshing ? 
            selectedLoadingIndicator : 
            (shouldRefresh ? selectedReleaseIndicator : selectedPullDownIndicator)
          }
        </motion.div>
      )}

      {/* Content with translation */}
      <motion.div
        className="pull-to-refresh-content"
        animate={{ 
          y: isRefreshing 
             ? refreshIndicatorHeight 
             : (facebookStyle && !wasOverThreshold) 
               ? pullDistance * 0.5 // Reduce movement for Facebook style
               : pullDistance 
        }}
        transition={{ 
          type: 'spring', 
          damping: facebookStyle ? 40 : 30, 
          stiffness: facebookStyle ? 300 : 200 
        }}
      >
        {children}
      </motion.div>
    </div>
  );
} 