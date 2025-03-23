import { Task } from '../types/task';
import { 
  Crown, 
  Calendar, 
  Clock,
  BookOpen,
  PenSquare,
  Presentation,
  Beaker,
  Microscope,
  Activity,
  FileText,
  Building,
  Users,
  GraduationCap,
  Tag,
  Folder,
  ChevronRight,
  CheckCircle2,
  MoreVertical,
  Trash2,
  WifiOff
} from 'lucide-react';
import { isOverdue } from '../utils/dateUtils';
import { parseLinks } from '../utils/linkParser';
import { useState, useMemo } from 'react';
import { TaskDetailsPopup } from './task/TaskDetailsPopup';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { PullToRefresh } from './ui/PullToRefresh';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface TaskListProps {
  tasks: Task[];
  onDeleteTask?: (taskId: string) => void;
  showDeleteButton?: boolean;
  onRefresh?: () => Promise<void>;
}

export function TaskList({ 
  tasks, 
  onDeleteTask, 
  showDeleteButton = false, 
  onRefresh 
}: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isOffline = useOfflineStatus();

  // Initialize pull-to-refresh hook
  const { refreshProps, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      if (onRefresh) {
        await onRefresh();
      }
    },
    disabled: !onRefresh || isOffline, // Disable pull-to-refresh when offline or onRefresh not provided
    facebookStyle: true, // Use Facebook-style pull-to-refresh
  });

  // Sort tasks to move completed tasks to the bottom and handle overdue tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    // First, separate completed tasks from non-completed tasks
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;

    // For non-completed tasks, prioritize overdue tasks
    const aIsOverdue = isOverdue(a.dueDate);
    const bIsOverdue = isOverdue(b.dueDate);
    if (aIsOverdue && !bIsOverdue) return -1;
    if (!aIsOverdue && bIsOverdue) return 1;

    // Otherwise, sort by due date (earlier dates first)
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'quiz':
        return <BookOpen className="w-3.5 h-3.5" />;
      case 'assignment':
        return <PenSquare className="w-3.5 h-3.5" />;
      case 'presentation':
        return <Presentation className="w-3.5 h-3.5" />;
      case 'project':
        return <Folder className="w-3.5 h-3.5" />;
      case 'lab-report':
        return <Beaker className="w-3.5 h-3.5" />;
      case 'lab-final':
        return <Microscope className="w-3.5 h-3.5" />;
      case 'lab-performance':
        return <Activity className="w-3.5 h-3.5" />;
      case 'documents':
        return <FileText className="w-3.5 h-3.5" />;
      case 'blc':
        return <Building className="w-3.5 h-3.5" />;
      case 'groups':
        return <Users className="w-3.5 h-3.5" />;
      default:
        return <GraduationCap className="w-3.5 h-3.5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'quiz':
        return 'text-blue-600 dark:text-blue-400';
      case 'assignment':
        return 'text-orange-600 dark:text-orange-400';
      case 'presentation':
        return 'text-red-600 dark:text-red-400';
      case 'project':
        return 'text-indigo-600 dark:text-indigo-400';
      case 'lab-report':
        return 'text-green-600 dark:text-green-400';
      case 'lab-final':
        return 'text-purple-600 dark:text-purple-400';
      case 'lab-performance':
        return 'text-pink-600 dark:text-pink-400';
      case 'documents':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'blc':
        return 'text-cyan-600 dark:text-cyan-400';
      case 'groups':
        return 'text-teal-600 dark:text-teal-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (sortedTasks.length === 0) {
    // Wrap empty state in PullToRefresh if onRefresh provided
    return (
      <PullToRefresh {...refreshProps}>
        <div className="text-center py-8 sm:py-12 animate-fade-in">
          <img
            src="https://images.unsplash.com/photo-1496115965489-21be7e6e59a0?auto=format&fit=crop&q=80&w=400"
            alt="Empty tasks"
            className="w-32 h-32 sm:w-48 sm:h-48 object-cover rounded-2xl mx-auto mb-4 opacity-50 shadow-lg"
          />
          <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-medium">No tasks found in this category</p>
          <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm sm:text-base">
            {isRefreshing ? 'Refreshing...' : 'Pull down to refresh or add some new tasks!'}
          </p>
        </div>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh {...refreshProps}>
      <div className="space-y-3 animate-fade-in pb-20">
        {sortedTasks.map(task => (
          <div
            key={task.id}
            className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm 
              hover:shadow-md transition-all border border-gray-100 dark:border-gray-700
              ${task.status === 'completed' ? 'opacity-70 dark:opacity-50' : ''}
              ${isOverdue(task.dueDate) && task.status !== 'completed' ? 'border-l-2 border-l-red-500' : ''}
            `}
            onClick={() => setSelectedTask(task)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center p-1.5 rounded-lg ${getCategoryColor(task.category)}`}>
                  {getCategoryIcon(task.category)}
                </div>
                <span className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  {task.category.replace('-', ' ')}
                </span>
              </div>
              
              {/* Task Status Indicator */}
              <div className="flex items-center">
                {task.status === 'completed' ? (
                  <div className="px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Completed</span>
                  </div>
                ) : isOverdue(task.dueDate) ? (
                  <div className="px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Overdue</span>
                  </div>
                ) : (
                  <div className="px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>In Progress</span>
                  </div>
                )}
                
                {/* Delete Button */}
                {showDeleteButton && onDeleteTask && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (deletingTaskId === task.id) {
                        setIsDeleting(true);
                        onDeleteTask(task.id)
                          .then(() => {
                            setDeletingTaskId(null);
                          })
                          .catch((error) => {
                            console.error('Error deleting task:', error);
                          })
                          .finally(() => {
                            setIsDeleting(false);
                          });
                      } else {
                        setDeletingTaskId(task.id);
                      }
                    }}
                    className={`ml-2 p-1.5 rounded-full ${
                      deletingTaskId === task.id
                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                    aria-label={deletingTaskId === task.id ? "Confirm delete" : "Delete task"}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            
            <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-1 line-clamp-2">
              {task.title}
            </h3>
            
            {task.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                {parseLinks(task.description)}
              </p>
            )}
            
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(task.dueDate).toLocaleDateString()} {new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              
              <div className="flex items-center">
                {task.isImportant && (
                  <div className="mr-2 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    <span>Important</span>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        ))}
        
        {isOffline && (
          <div className="flex items-center justify-center py-4 px-2 mt-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm">
            <WifiOff className="w-4 h-4 mr-2" />
            You're offline. Some data may not be up to date.
          </div>
        )}
        
        {selectedTask && (
          <TaskDetailsPopup
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
