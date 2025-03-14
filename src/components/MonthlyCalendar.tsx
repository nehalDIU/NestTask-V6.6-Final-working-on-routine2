import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO, addMonths, getDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../types/task';

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

export function MonthlyCalendar({ isOpen, onClose, selectedDate, onSelectDate, tasks }: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [longPressedDate, setLongPressedDate] = useState<Date | null>(null);
  const [focusedDateIndex, setFocusedDateIndex] = useState<number | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout>();
  const longPressTimeoutRef = useRef<NodeJS.Timeout>();
  const calendarRef = useRef<HTMLDivElement>(null);
  const dayButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const isMobileRef = useRef(false);

  // Check if device is mobile and adjust UI accordingly
  useEffect(() => {
    const checkMobile = () => {
      isMobileRef.current = window.innerWidth <= 768;
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get all days in the current month with padding for the start of the month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDayOfWeek = getDay(monthStart);
  
  // Add empty spaces for the first week
  const calendarDays: (Date | null)[] = Array(startDayOfWeek).fill(null);
  
  // Add all days of the month
  const daysInMonth = eachDayOfInterval({
    start: monthStart,
    end: monthEnd
  });
  calendarDays.push(...daysInMonth);

  // Get tasks summary for a specific date
  const getTaskSummary = (date: Date | null): TaskSummary => {
    if (!date) return { total: 0, completed: 0, overdue: 0, inProgress: 0 };
    
    const dayTasks = tasks.filter(task => isSameDay(parseISO(task.dueDate), date));
    return {
      total: dayTasks.length,
      completed: dayTasks.filter(task => task.status === 'completed').length,
      overdue: dayTasks.filter(task => 
        task.status !== 'completed' && new Date(task.dueDate) < new Date()
      ).length,
      inProgress: dayTasks.filter(task => 
        task.status !== 'completed' && new Date(task.dueDate) >= new Date()
      ).length
    };
  };

  // Handle change month
  const changeMonth = (increment: number) => {
    setCurrentMonth(prev => addMonths(prev, increment));
    setFocusedDateIndex(null);
  };

  // Handle mouse enter with delay for tooltip
  const handleMouseEnter = (date: Date) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setHoveredDate(date);
    }, 400); // Show tooltip after 400ms hover (slightly faster for better UX)
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setHoveredDate(null);
  };

  // Handle touch start for long press
  const handleTouchStart = (date: Date) => {
    if (!isMobileRef.current) return;
    
    longPressTimeoutRef.current = setTimeout(() => {
      setLongPressedDate(date);
    }, 500); // 500ms for long press
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    setLongPressedDate(null);
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!focusedDateIndex && focusedDateIndex !== 0) {
      setFocusedDateIndex(index);
      return;
    }

    const rowSize = 7;
    let newIndex = focusedDateIndex;

    switch (e.key) {
      case 'ArrowRight':
        newIndex = Math.min(calendarDays.length - 1, focusedDateIndex + 1);
        break;
      case 'ArrowLeft':
        newIndex = Math.max(0, focusedDateIndex - 1);
        break;
      case 'ArrowUp':
        newIndex = Math.max(0, focusedDateIndex - rowSize);
        break;
      case 'ArrowDown':
        newIndex = Math.min(calendarDays.length - 1, focusedDateIndex + rowSize);
        break;
      case 'Enter':
      case ' ':
        if (calendarDays[focusedDateIndex]) {
          onSelectDate(calendarDays[focusedDateIndex] as Date);
          onClose();
        }
        return;
      case 'Escape':
        onClose();
        return;
      default:
        return;
    }

    e.preventDefault();
    setFocusedDateIndex(newIndex);
    
    // Focus the new button
    if (dayButtonsRef.current[newIndex]) {
      dayButtonsRef.current[newIndex]?.focus();
    }
  };

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

  // Add keyboard listener for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown as any);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [isOpen, onClose]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  // Reset dayButtonsRef when calendar days change
  useEffect(() => {
    dayButtonsRef.current = dayButtonsRef.current.slice(0, calendarDays.length);
  }, [calendarDays.length]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-4 bg-black/30 backdrop-blur-sm"
        >
          <div 
            className="monthly-calendar w-full max-w-xs sm:max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
            ref={calendarRef}
            role="dialog"
            aria-modal="true"
            aria-label="Monthly Calendar"
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750">
              <button
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>

              <button
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Calendar Legend */}
            <div className="flex items-center justify-center gap-4 py-2 px-4 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-750">
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
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
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
                  const hasOverdueTasks = summary.overdue > 0;
                  const isSelected = isSameDay(date, selectedDate);
                  const isTodayDate = isToday(date);
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
                        onSelectDate(date);
                        onClose();
                      }}
                      onTouchStart={() => handleTouchStart(date)}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
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
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-1.5 h-1.5 rounded-full bg-green-500/80 dark:bg-green-400/80 shadow-sm"
                            />
                          )}
                          {summary.overdue > 0 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-1.5 h-1.5 rounded-full bg-red-500/80 dark:bg-red-400/80 shadow-sm animate-pulse"
                            />
                          )}
                          {summary.inProgress > 0 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-1.5 h-1.5 rounded-full bg-blue-500/80 dark:bg-blue-400/80 shadow-sm"
                            />
                          )}
                        </div>
                      )}

                      {/* Task count badge for days with many tasks */}
                      {summary.total > 3 && (
                        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center px-1 shadow-sm">
                          {summary.total}
                        </div>
                      )}

                      {/* Tooltip - Show on hover for desktop or long press for mobile */}
                      <AnimatePresence>
                        {((hoveredDate && isSameDay(date, hoveredDate)) || 
                          (longPressedDate && isSameDay(date, longPressedDate))) && 
                          summary.total > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute bottom-[calc(100%+8px)] z-50 w-56 p-3
                              bg-white dark:bg-gray-800 rounded-lg shadow-xl
                              border border-gray-100 dark:border-gray-700
                              text-left touch-none"
                          >
                            <div className="relative space-y-2 text-xs">
                              {/* Triangle pointer */}
                              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0 h-0 
                                  border-l-[8px] border-l-transparent 
                                  border-r-[8px] border-r-transparent 
                                  border-t-[8px] border-t-white dark:border-t-gray-800"></div>
                              
                              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {format(date, 'MMMM d, yyyy')}
                              </div>
                              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="font-medium">Completed:</span> {summary.completed}
                              </div>
                              {summary.overdue > 0 && (
                                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                  <span className="font-medium">Overdue:</span> {summary.overdue}
                                </div>
                              )}
                              {summary.inProgress > 0 && (
                                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <span className="font-medium">In Progress:</span> {summary.inProgress}
                                </div>
                              )}
                              <div className="text-gray-500 dark:text-gray-400 pt-1 text-[10px]">
                                Click date to view details
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Selected/Today Indicator Ring */}
                      {(isSelected || isTodayDate) && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
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
            
            {/* Footer */}
            <div className="flex justify-end p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
