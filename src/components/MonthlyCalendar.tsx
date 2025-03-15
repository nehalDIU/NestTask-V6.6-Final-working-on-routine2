import { useState, useEffect, useRef, KeyboardEvent, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, parseISO, addMonths, getDay, getYear, setYear } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../types/task';

// Pre-defined animation variants for better performance
const overlayAnimationVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

const transitionProps = { 
  duration: 0.15, 
  ease: [0.4, 0.0, 0.2, 1]
};

// Weekday headers - defined outside component to prevent recreation
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface TaskSummary {
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
}

interface MonthlyCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  tasks: Task[];
}

// Add the CalendarDay type and fix the month navigation handlers
interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

export function MonthlyCalendar({ isOpen, onClose, selectedDate, onSelectDate, tasks }: MonthlyCalendarProps) {
  // If not open, render nothing for better performance
  if (!isOpen) return null;

  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [focusedDateIndex, setFocusedDateIndex] = useState<number | null>(null);
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'year'>('calendar');
  const tooltipTimeoutRef = useRef<NodeJS.Timeout>();
  const calendarRef = useRef<HTMLDivElement>(null);
  const dayButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const isMobileRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Optimized date utilities
  const isSameDayOptimized = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
  };

  const createNormalizedDate = (date: Date): Date => {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12, // Set noon to avoid any timezone issues
      0,
      0
    );
  };

  // Reset view mode when opening
  useEffect(() => {
    if (isOpen) {
      setViewMode('calendar');
      
      // Set current month to match selected date when opening
      setCurrentMonth(selectedDate);
    }
  }, [isOpen, selectedDate]);

  // Get current year and generate years array for year selector
  const currentYear = getYear(new Date());
  const years = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  }, [currentYear]);

  // Check if device is mobile and adjust UI accordingly
  useEffect(() => {
    // Set mobile flag based on screen width
    const handleResize = () => {
      isMobileRef.current = window.innerWidth < 768;
    };

    // Initial check
    handleResize();

    // Add listener for resize
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Clear any pending timeouts
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      
      // Reset refs
      touchStartXRef.current = null;
      touchStartYRef.current = null;
    };
  }, []);

  // Create a task lookup map for faster retrieval - memoized
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    
    if (!tasks || tasks.length === 0) return map;
    
    for (const task of tasks) {
      try {
        const taskDate = new Date(task.dueDate);
        const dateKey = `${taskDate.getFullYear()}-${taskDate.getMonth()}-${taskDate.getDate()}`;
        
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        
        map.get(dateKey)!.push(task);
      } catch {
        // Skip invalid dates
      }
    }
    
    return map;
  }, [tasks]);

  // Get all days in the current month with padding for the start of the month - memoized
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDayOfWeek = getDay(monthStart);
    
    // Add empty spaces for the first week
    const days: (Date | null)[] = Array(startDayOfWeek).fill(null);
    
    // Add all days of the month
    const daysInMonth = eachDayOfInterval({
      start: monthStart,
      end: monthEnd
    });
    
    return [...days, ...daysInMonth];
  }, [currentMonth]);

  // Get tasks summary for a specific date - optimized with the task map
  const getTaskSummary = (date: Date | null): TaskSummary => {
    if (!date) return { total: 0, completed: 0, overdue: 0, inProgress: 0 };
    
    // Quick return if no tasks
    if (!tasksByDate.size) {
      return { total: 0, completed: 0, overdue: 0, inProgress: 0 };
    }
    
    // Get tasks for this date from the map (much faster lookup)
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const dayTasks = tasksByDate.get(dateKey) || [];
    
    if (dayTasks.length === 0) {
      return { total: 0, completed: 0, overdue: 0, inProgress: 0 };
    }

    // Count completed tasks
    let completed = 0;
    let overdue = 0;
    let inProgress = 0;
    const now = new Date();
    
    // Count in a single loop
    for (const task of dayTasks) {
      if (task.status === 'completed') {
        completed++;
      } else {
        try {
          const taskDueDate = new Date(task.dueDate);
          if (taskDueDate < now) {
            overdue++;
          } else {
            inProgress++;
          }
        } catch {
          inProgress++; // Default to in-progress on error
        }
      }
    }

    return {
      total: dayTasks.length,
      completed,
      overdue,
      inProgress
    };
  };

  // Month navigation handlers
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, -1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  }, []);

  // Toggle year selector
  const toggleYearSelector = useCallback(() => {
    setViewMode(prev => prev === 'calendar' ? 'year' : 'calendar');
  }, []);

  // Handle change year
  const handleYearChange = useCallback((year: number) => {
    setCurrentMonth(prevMonth => setYear(prevMonth, year));
    setViewMode('calendar');
  }, []);

  // Handle mouse enter for tooltip
  const handleMouseEnter = useCallback((date: Date) => {
    if (!isMobileRef.current) {
      setHoveredDate(date);
    }
  }, []);

  // Handle mouse leave for tooltip
  const handleMouseLeave = useCallback(() => {
    setHoveredDate(null);
  }, []);

  // Update the touch handlers to accept correct parameters
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Save touch start coordinates for swipe detection
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Clear hovered date during touch move
    setHoveredDate(null);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Optimized touch end handler for swipe detection
    if (touchStartXRef.current !== null && touchStartYRef.current !== null) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartXRef.current;
      const deltaY = touchEndY - touchStartYRef.current;
      
      // If more horizontal than vertical movement and exceeds threshold
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 80) {
        if (deltaX > 0) {
          // Swipe right - go to previous month
          handlePrevMonth();
        } else {
          // Swipe left - go to next month
          handleNextMonth();
        }
      }
    }
    
    // Reset touch start references
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }, [handlePrevMonth, handleNextMonth]);

  // Separate handler for date selection with touch
  const handleDateTouchEnd = useCallback((date: Date, e: React.TouchEvent) => {
    e.stopPropagation();
    
    if (touchStartXRef.current !== null && touchStartYRef.current !== null) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartXRef.current;
      const deltaY = touchEndY - touchStartYRef.current;
      
      // If small movement, treat as a tap
      if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30) {
        // Create a normalized date to avoid timezone issues
        const normalizedDate = createNormalizedDate(date);
        
        // Pass the normalized date to ensure consistency
        onSelectDate(normalizedDate);
        
        // Close calendar after a short delay to ensure date selection is processed
        setTimeout(() => onClose(), 50);
      }
    }
    
    // Reset touch start references
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }, [onSelectDate, onClose]);

  // Updated keyboard handler for the correct element type
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();

    // Set focused index if not already set
    if (focusedDateIndex === null) {
      setFocusedDateIndex(index);
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
        setFocusedDateIndex(prev => (prev === null ? index : Math.max(0, prev - 1)));
        break;
      case 'ArrowRight':
        setFocusedDateIndex(prev => (prev === null ? index : Math.min(calendarDays.length - 1, prev + 1)));
        break;
      case 'ArrowUp':
        setFocusedDateIndex(prev => (prev === null ? index : Math.max(0, prev - 7)));
        break;
      case 'ArrowDown':
        setFocusedDateIndex(prev => (prev === null ? index : Math.min(calendarDays.length - 1, prev + 7)));
        break;
      case 'PageUp':
        handlePrevMonth();
        break;
      case 'PageDown':
        handleNextMonth();
        break;
      case 'Home':
        setFocusedDateIndex(0);
        break;
      case 'End':
        setFocusedDateIndex(calendarDays.length - 1);
        break;
      case 'Enter':
      case ' ':
        if (focusedDateIndex !== null) {
          const focusedDate = calendarDays[focusedDateIndex];
          if (focusedDate) {
            try {
              // Create a normalized date from the focused date
              const normalizedDate = createNormalizedDate(focusedDate);
              onSelectDate(normalizedDate);
              
              // Close calendar after a short delay to ensure date selection is processed
              setTimeout(() => onClose(), 50);
            } catch (error) {
              console.error('Error selecting date via keyboard:', error);
            }
          }
        }
        break;
      case 'Escape':
        onClose();
        break;
    }

    // Focus the new button if needed
    if (focusedDateIndex !== null && dayButtonsRef.current[focusedDateIndex]) {
      dayButtonsRef.current[focusedDateIndex]?.focus();
    }
  }, [focusedDateIndex, calendarDays, handlePrevMonth, handleNextMonth, onSelectDate, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Reset dayButtonsRef when calendar days change
  useEffect(() => {
    dayButtonsRef.current = dayButtonsRef.current.slice(0, calendarDays.length);
  }, [calendarDays.length]);

  // Handle today button
  const handleTodayClick = useCallback(() => {
    const today = createNormalizedDate(new Date());
    setCurrentMonth(today);
    onSelectDate(today);
  }, [onSelectDate]);

  return (
    <AnimatePresence>
      <motion.div
        key="monthly-calendar-overlay"
        variants={overlayAnimationVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={transitionProps}
        className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 bg-black/30 backdrop-blur-sm"
        style={{ 
          willChange: 'opacity, transform',
          translateZ: 0,
          backfaceVisibility: 'hidden'
        }}
      >
        <div 
          className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden max-w-md w-full max-h-[80vh]"
          ref={calendarRef}
          role="dialog"
          aria-modal="true"
          aria-label="Monthly Calendar"
          onClick={(e) => {
            // Prevent clicks on the container from closing the calendar
            // unless they're on the background overlay
            e.stopPropagation();
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Calendar header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex-1">
              <button 
                onClick={handlePrevMonth}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Previous month"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            
            <button
              onClick={toggleYearSelector}
              className="flex-1 text-lg font-semibold text-gray-900 dark:text-white mx-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg py-1"
            >
              {format(currentMonth, 'MMMM yyyy')}
            </button>
            
            <div className="flex-1 flex justify-end">
              <button 
                onClick={handleNextMonth}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Next month"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Calendar Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-2 px-2 sm:px-4 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-750">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>In Progress</span>
            </div>
            {!isMobileRef.current && (
              <div className="hidden sm:flex items-center text-[10px] gap-1 ml-2 text-gray-500 italic">
                <span>Swipe or use arrow keys to navigate</span>
              </div>
            )}
          </div>

          {/* Year Selector View */}
          <AnimatePresence mode="wait">
            {viewMode === 'year' ? (
              <motion.div
                key="year-selector"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.15 }}
                className="p-4 max-h-[250px] overflow-y-auto"
              >
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                  {years.map(year => (
                    <button
                      key={year}
                      onClick={() => handleYearChange(year)}
                      className={`
                        py-2 rounded-md text-center transition-colors
                        ${year === getYear(currentMonth)
                          ? 'bg-blue-500 text-white font-medium'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }
                      `}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="calendar-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.15 }}
                className="calendar-container"
                onTouchStart={(e) => {
                  // Only handle touch events at container level if not on a button
                  if (!(e.target as HTMLElement).closest('button')) {
                    handleTouchStart(e);
                  }
                }}
                onTouchMove={(e) => {
                  // Allow move events for swipe detection at container level
                  handleTouchMove(e);
                }}
                onTouchEnd={(e) => {
                  // Only handle touch events at container level if not on a button
                  if (!(e.target as HTMLElement).closest('button')) {
                    handleTouchEnd(e);
                  }
                }}
              >
                {/* Calendar Grid */}
                <div className="p-4">
                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 mb-3">
                    {WEEKDAYS.map(day => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {calendarDays.map((date, index) => {
                      if (!date) {
                        // Empty cell for padding
                        return <div key={`empty-${index}`} className="aspect-square"></div>;
                      }
                      
                      const summary = getTaskSummary(date);
                      
                      // Safely compare dates to avoid errors
                      let isSelected = false;
                      let isTodayDate = false;
                      
                      try {
                        isSelected = isSameDayOptimized(date, selectedDate);
                        isTodayDate = isToday(date);
                      } catch (error) {
                        // Silent error - performance optimization
                      }
                      
                      const isFocused = focusedDateIndex === index;

                      return (
                        <motion.button
                          key={date.toISOString()}
                          ref={el => {
                            dayButtonsRef.current[index] = el;
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            try {
                              // Create a normalized date to avoid timezone issues
                              const selectedDate = createNormalizedDate(date);
                              
                              // Pass the date and ensure it's fully processed before closing
                              onSelectDate(selectedDate);
                              
                              // Close calendar after a short delay to ensure date selection is processed
                              setTimeout(() => onClose(), 50);
                            } catch (error) {
                              console.error('Error selecting date:', error);
                            }
                          }}
                          onTouchStart={(e) => handleTouchStart(e)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={(e) => handleDateTouchEnd(date, e)}
                          onMouseEnter={() => handleMouseEnter(date)}
                          onMouseLeave={handleMouseLeave}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          tabIndex={0}
                          aria-label={`${format(date, 'MMMM d, yyyy')}${
                            summary.total > 0 ? `, ${summary.total} tasks` : ''
                          }${isSelected ? ', selected' : ''}${isTodayDate ? ', today' : ''}`}
                          aria-selected={isSelected}
                          className={`
                            relative aspect-square rounded-lg
                            flex flex-col items-center justify-center gap-1
                            transition-all duration-200 ease-in-out
                            ${isSelected
                              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 z-10'
                              : isTodayDate
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }
                            ${isFocused 
                              ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800 z-10' 
                              : ''
                            }
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800
                          `}
                        >
                          {/* Date Number */}
                          <span className={`
                            text-sm font-medium 
                            ${isSelected
                              ? 'text-white'
                              : isTodayDate
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-700 dark:text-gray-300'
                            }
                          `}>
                            {format(date, 'd')}
                          </span>
                          
                          {/* Task Status Indicators */}
                          {summary.total > 0 && (
                            <div className={`
                              flex items-center justify-center
                              min-h-[6px] min-w-[6px]
                              gap-[3px]
                            `}>
                              {summary.completed > 0 && (
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500/80 dark:bg-green-400/80 shadow-sm" />
                              )}
                              {summary.overdue > 0 && (
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500/80 dark:bg-red-400/80 shadow-sm animate-pulse" />
                              )}
                              {summary.inProgress > 0 && (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/80 dark:bg-blue-400/80 shadow-sm" />
                              )}
                            </div>
                          )}

                          {/* Task count badge for days with tasks */}
                          {summary.total > 0 && (
                            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center px-1 shadow-sm">
                              {summary.total}
                            </div>
                          )}
                          
                          {/* Selected/Today Indicator Ring */}
                          {(isSelected || isTodayDate) && (
                            <div
                              className={`
                                absolute inset-0 rounded-lg
                                ${isSelected
                                  ? 'ring-2 ring-blue-400/50 dark:ring-blue-500/50'
                                  : 'ring-1 ring-blue-400/30 dark:ring-blue-500/30'
                                }
                              `}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Footer with controls */}
          <div className="flex justify-between items-center p-4 border-t border-gray-200">
            <div>
              {isMobileRef.current ? (
                <p className="text-sm text-gray-500">Tap to select date</p>
              ) : (
                <p className="text-sm text-gray-500">Swipe to navigate</p>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                onClick={handleTodayClick}
              >
                Today
              </button>
              <button
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

