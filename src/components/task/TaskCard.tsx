import { useState, memo, useCallback } from 'react';
import { format, isToday, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Eye
} from 'lucide-react';
import { isOverdue } from '../../utils/dateUtils';
import type { Task } from '../../types';

interface TaskCardProps {
  task: Task;
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  onDelete?: (id: string) => void;
  onView?: (task: Task) => void;
}

// Memoize the TaskCard to prevent unnecessary re-renders
export const TaskCard = memo(function TaskCard({ 
  task, 
  onUpdate, 
  onDelete,
  onView 
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  // Convert callbacks to memoized functions
  const toggleMenu = useCallback(() => {
    setShowMenu(prev => !prev);
  }, []);
  
  const handleComplete = useCallback(() => {
    if (onUpdate) {
      onUpdate(task.id, { status: task.status === 'completed' ? 'my-tasks' : 'completed' });
    }
  }, [task.id, task.status, onUpdate]);
  
  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(task.id);
    }
  }, [task.id, onDelete]);
  
  const handleView = useCallback(() => {
    if (onView) {
      onView(task);
    }
    setShowMenu(false);
  }, [task, onView]);
  
  // Determine card style based on status
  const isCompleted = task.status === 'completed';
  const isLate = !isCompleted && isOverdue(task.dueDate);
  const isDueSoon = !isLate && !isCompleted && differenceInDays(new Date(task.dueDate), new Date()) <= 2;
  
  // Determine badge color
  const getBadgeColor = () => {
    if (isCompleted) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (isLate) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (isDueSoon) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  };

  return (
    <motion.div 
      className={`
        relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md 
        transition-shadow border border-gray-100 dark:border-gray-700 overflow-hidden
        ${isCompleted ? 'opacity-75' : ''}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      layout
    >
      {/* Task completion status indicator */}
      <div 
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isCompleted ? 'bg-green-500' : 
          isLate ? 'bg-red-500' : 
          isDueSoon ? 'bg-amber-500' : 
          'bg-blue-500'
        }`}
      />
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          {/* Category badge */}
          <span className={`text-xs font-medium py-1 px-2 rounded-full ${getBadgeColor()}`}>
            {task.category}
          </span>
          
          {/* Action menu */}
          <div className="relative">
            <button 
              onClick={toggleMenu}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Task menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                <button 
                  onClick={handleView}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </button>
                {onUpdate && (
                  <button 
                    onClick={handleComplete}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                  </button>
                )}
                {onDelete && (
                  <button 
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Task title */}
        <h3 className={`text-lg font-semibold mb-2 text-gray-900 dark:text-white ${
          isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : ''
        }`}>
          {task.name}
        </h3>
        
        {/* Task due date and time */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>
              {isToday(new Date(task.dueDate)) 
                ? 'Today' 
                : format(new Date(task.dueDate), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
        
        {/* Status indicator for urgent/late tasks */}
        {!isCompleted && (isLate || isDueSoon) && (
          <div className={`
            text-xs rounded-lg py-1 px-2 flex items-center mt-2
            ${isLate ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 
              'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}
          `}>
            <AlertCircle className="w-3 h-3 mr-1" />
            <span>
              {isLate 
                ? `Overdue by ${differenceInDays(new Date(), new Date(task.dueDate))} days`
                : `Due in ${differenceInDays(new Date(task.dueDate), new Date())} days`}
            </span>
          </div>
        )}
        
        {/* Task description summary */}
        {task.description && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {task.description}
          </div>
        )}
      </div>
    </motion.div>
  );
});