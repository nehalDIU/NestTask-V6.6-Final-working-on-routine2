import { useState, useEffect, useCallback } from 'react';
import { supabase, testConnection } from '../lib/supabase';
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/task.service';
import { 
  getLocalTasks, 
  saveTasksLocally, 
  addPendingAction, 
  syncPendingActions, 
  isOnline 
} from '../utils/offlineUtils';
import type { Task, NewTask } from '../types/task';

// Type guard to validate task data
function isValidTask(task: any): task is Task {
  return (
    task !== null &&
    typeof task === 'object' &&
    typeof task.id === 'string' &&
    typeof task.name === 'string' &&
    typeof task.dueDate === 'string' &&
    typeof task.category === 'string' &&
    typeof task.status === 'string'
  );
}

// Helper function to sanitize task data
function sanitizeTask(task: any): Task {
  // Create a base valid task with defaults
  const sanitized: Task = {
    id: typeof task.id === 'string' ? task.id : `fallback_${Date.now()}`,
    name: typeof task.name === 'string' ? task.name : 'Untitled Task',
    category: typeof task.category === 'string' ? task.category : 'task',
    dueDate: typeof task.dueDate === 'string' ? task.dueDate : new Date().toISOString(),
    description: typeof task.description === 'string' ? task.description : '',
    status: typeof task.status === 'string' ? task.status : 'my-tasks',
    createdAt: typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString(),
    isAdminTask: !!task.isAdminTask
  };
  
  return sanitized;
}

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOffline, setIsOffline] = useState(!isOnline());

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (userId) {
        // When coming back online, sync any pending changes
        syncPendingActions().catch((err) => {
          console.error('Failed to sync pending actions:', err);
        });
        // Then reload tasks from server
        loadTasks();
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Also listen for service worker messages
    const handleStatusChange = (event: Event) => {
      const { status } = (event as CustomEvent).detail;
      setIsOffline(status === 'offline');
      
      if (status === 'online' && userId) {
        syncPendingActions().catch((err) => {
          console.error('Failed to sync pending actions:', err);
        });
        // Then reload tasks from server
        loadTasks();
      }
    };
    
    window.addEventListener('connection-status-change', handleStatusChange);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('connection-status-change', handleStatusChange);
    };
  }, [userId]);

  const loadTasks = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Check if we're online first
      if (isOnline()) {
        try {
          // Ensure connection is established
          const isConnected = await testConnection();
          if (!isConnected) {
            throw new Error('Unable to connect to database');
          }

          const rawData = await fetchTasks(userId);
          
          // Validate and sanitize data before setting state
          const validatedData = Array.isArray(rawData) 
            ? rawData.map(task => isValidTask(task) ? task : sanitizeTask(task))
            : [];
            
          setTasks(validatedData);
          
          // Store the tasks locally for offline use
          try {
            await saveTasksLocally(validatedData);
          } catch (saveError) {
            console.error('Failed to save tasks locally:', saveError);
            // Continue anyway as this is a non-critical operation
          }
        } catch (err: any) {
          console.error('Error fetching tasks from server:', err);
          
          // If server fetch fails, try to load from offline storage
          try {
            const localRawTasks = await getLocalTasks();
            if (localRawTasks && localRawTasks.length > 0) {
              console.log('Using locally cached tasks');
              
              // Validate and sanitize local data before setting state
              const validatedLocalTasks = localRawTasks.map(task => 
                isValidTask(task) ? task : sanitizeTask(task)
              );
              
              setTasks(validatedLocalTasks);
            } else {
              setError(err.message || 'Failed to load tasks');
              
              // Retry with exponential backoff if it's a connection error
              if (retryCount < 3) {
                const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
                setTimeout(() => {
                  setRetryCount(prev => prev + 1);
                }, timeout);
              }
            }
          } catch (localError) {
            console.error('Error loading local tasks:', localError);
            setError('Failed to load tasks from server or local storage');
          }
        }
      } else {
        // We're offline, load from local storage
        try {
          const localRawTasks = await getLocalTasks();
          if (localRawTasks && localRawTasks.length > 0) {
            console.log('Using locally cached tasks (offline mode)');
            
            // Validate and sanitize local data
            const validatedLocalTasks = localRawTasks.map(task => 
              isValidTask(task) ? task : sanitizeTask(task)
            );
            
            setTasks(validatedLocalTasks);
          } else {
            setError('You are offline and no cached tasks are available');
          }
        } catch (localError) {
          console.error('Error loading local tasks in offline mode:', localError);
          setError('Failed to load tasks from local storage');
        }
      }
    } catch (err: any) {
      console.error('Error in loadTasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [userId, retryCount, isOffline]);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    loadTasks();

    // Only set up real-time if we're online
    if (isOnline()) {
      // Subscribe to real-time changes
      const channel = supabase.channel('tasks-changes');
      
      const subscription = channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `user_id=eq.${userId}`
          },
          () => loadTasks()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: 'is_admin_task=eq.true'
          },
          () => loadTasks()
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to tasks changes');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to tasks changes');
            setError('Real-time updates unavailable');
          }
        });

      return () => {
        subscription.unsubscribe();
      };
    }
    
    return undefined;
  }, [userId, loadTasks, isOffline]);

  const handleCreateTask = async (newTask: NewTask) => {
    if (!userId) return;

    try {
      setError(null);

      // Generate a temporary ID for the task for immediate rendering
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const tempTask: Task = {
        id: tempId,
        ...newTask,
        createdAt: new Date().toISOString(),
        status: newTask.status || 'my-tasks',
        isAdminTask: false
      };
      
      // Optimistically update UI
      setTasks(prevTasks => [...prevTasks, tempTask]);
      
      if (isOnline()) {
        // We're online, try to create the task on the server
        try {
          await createTask(userId, newTask);
          await loadTasks(); // Refresh tasks from server to get real ID
        } catch (err: any) {
          console.error('Error creating task on server:', err);
          
          // Save pending action for later sync
          try {
            await addPendingAction('create-task', newTask);
            setError('Task will be created when you go back online');
          } catch (pendingError) {
            console.error('Failed to save pending action:', pendingError);
            setError('Failed to create task. Please try again later.');
          }
        }
      } else {
        // We're offline, save pending action for later
        try {
          await addPendingAction('create-task', newTask);
          setError('Task will be created when you go back online');
        } catch (pendingError) {
          console.error('Failed to save pending action:', pendingError);
          setError('Failed to queue task for creation. Please try again when online.');
        }
      }
    } catch (err: any) {
      console.error('Error in handleCreateTask:', err);
      setError(err.message || 'Failed to create task');
      throw err;
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      setError(null);
      
      // Optimistically update UI immediately
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        )
      );
      
      if (isOnline()) {
        // We're online, try to update on the server
        try {
          const updatedTask = await updateTask(taskId, updates);
          return updatedTask;
        } catch (err: any) {
          console.error('Error updating task on server:', err);
          
          // Save pending action for later sync
          try {
            await addPendingAction('update-task', { id: taskId, ...updates });
            setError('Task update will be synced when you go back online');
          } catch (pendingError) {
            console.error('Failed to save pending update:', pendingError);
            setError('Failed to queue task update. Please try again later.');
          }
          return null;
        }
      } else {
        // We're offline, save pending action for later
        try {
          await addPendingAction('update-task', { id: taskId, ...updates });
          setError('Task update will be synced when you go back online');
        } catch (pendingError) {
          console.error('Failed to save pending update:', pendingError);
          setError('Failed to queue task update. Please try again when online.');
        }
        return null;
      }
    } catch (err: any) {
      console.error('Error in handleUpdateTask:', err);
      setError(err.message || 'Failed to update task');
      throw err;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setError(null);
      
      // Optimistically update UI immediately
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      if (isOnline()) {
        // We're online, try to delete on the server
        try {
          await deleteTask(taskId);
        } catch (err: any) {
          console.error('Error deleting task on server:', err);
          
          // Save pending action for later sync
          try {
            await addPendingAction('delete-task', { id: taskId });
            setError('Task deletion will be synced when you go back online');
          } catch (pendingError) {
            console.error('Failed to save pending deletion:', pendingError);
            setError('Failed to queue task deletion. Please try again later.');
          }
        }
      } else {
        // We're offline, save pending action for later
        try {
          await addPendingAction('delete-task', { id: taskId });
          setError('Task deletion will be synced when you go back online');
        } catch (pendingError) {
          console.error('Failed to save pending deletion:', pendingError);
          setError('Failed to queue task deletion. Please try again when online.');
        }
      }
    } catch (err: any) {
      console.error('Error in handleDeleteTask:', err);
      setError(err.message || 'Failed to delete task');
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    isOffline,
    createTask: handleCreateTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
  };
}