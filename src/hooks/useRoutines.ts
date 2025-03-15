import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  fetchRoutines, 
  createRoutine as createRoutineService,
  updateRoutine as updateRoutineService,
  deleteRoutine as deleteRoutineService,
  addRoutineSlot as addRoutineSlotService,
  updateRoutineSlot as updateRoutineSlotService,
  deleteRoutineSlot as deleteRoutineSlotService
} from '../services/routine.service';
import { getLocalRoutines, saveRoutinesLocally, isOnline, addPendingAction } from '../utils/offlineUtils';

// Import types directly from routine.ts file since they're not exported from index.ts
import type { Routine, RoutineSlot } from '../types/routine';

// Type guard to validate routine data
function isValidRoutine(routine: any): boolean {
  return (
    routine !== null &&
    typeof routine === 'object' &&
    typeof routine.id === 'string'
  );
}

// Helper function to sanitize routine data
function sanitizeRoutine(routine: any): Routine {
  // Create a valid routine with defaults if some properties are missing
  const sanitized: Routine = {
    id: typeof routine.id === 'string' ? routine.id : `fallback_${Date.now()}`,
    name: typeof routine.name === 'string' ? routine.name : 'Untitled Routine',
    semester: typeof routine.semester === 'string' ? routine.semester : '',
    isActive: !!routine.isActive,
    // The slots will be fetched separately or set to empty array
    slots: Array.isArray(routine.slots) ? routine.slots : [],
    createdAt: typeof routine.createdAt === 'string' ? routine.createdAt : new Date().toISOString(),
    createdBy: typeof routine.createdBy === 'string' ? routine.createdBy : 'unknown'
  };
  
  return sanitized;
}

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!isOnline());

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      loadRoutines();
    };
    
    const handleOffline = () => {
      setOffline(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load routines from server or local storage
  const loadRoutines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isOnline()) {
        try {
          const routinesData = await fetchRoutines();
          
          // Validate and sanitize routines
          const validatedRoutines = routinesData
            .filter(routine => routine !== null)
            .map(routine => isValidRoutine(routine) ? routine : sanitizeRoutine(routine));
            
          setRoutines(validatedRoutines);
          
          // Save to local storage for offline use
          try {
            await saveRoutinesLocally(validatedRoutines);
          } catch (saveError) {
            console.error('Failed to save routines locally:', saveError);
          }
        } catch (err) {
          console.error('Error fetching routines from server:', err);
          
          // If server fetch fails, try to load from offline storage
          try {
            const localRoutines = await getLocalRoutines();
            if (localRoutines && localRoutines.length > 0) {
              const validatedLocalRoutines = localRoutines
                .filter(routine => routine !== null)
                .map(routine => isValidRoutine(routine) ? routine : sanitizeRoutine(routine));
                
              setRoutines(validatedLocalRoutines);
            } else {
              setError('Failed to load routines');
            }
          } catch (localError) {
            console.error('Error loading local routines:', localError);
            setError('Failed to load routines from server or local storage');
          }
        }
      } else {
        // We're offline, load from local storage
        try {
          const localRoutines = await getLocalRoutines();
          if (localRoutines && localRoutines.length > 0) {
            const validatedLocalRoutines = localRoutines
              .filter(routine => routine !== null)
              .map(routine => isValidRoutine(routine) ? routine : sanitizeRoutine(routine));
              
            setRoutines(validatedLocalRoutines);
          } else {
            setError('You are offline and no cached routines are available');
          }
        } catch (localError) {
          console.error('Error loading local routines in offline mode:', localError);
          setError('Failed to load routines from local storage');
        }
      }
    } catch (err: any) {
      console.error('Error in loadRoutines:', err);
      setError(err.message || 'Failed to load routines');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRoutine = async (routine: Omit<Routine, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      setError(null);
      
      if (isOnline()) {
        const createdRoutine = await createRoutineService(routine);
        setRoutines([createdRoutine, ...routines]);
        return createdRoutine;
      } else {
        // Store the pending action for when we're back online
        await addPendingAction('createRoutine', routine);
        setError('Cannot create routine while offline');
        throw new Error('Cannot create routine while offline');
      }
    } catch (err: any) {
      console.error('Error creating routine:', err);
      setError(err.message);
      throw err;
    }
  };
  
  const updateRoutine = async (id: string, updates: Partial<Routine>) => {
    try {
      setError(null);
      
      // Optimistically update UI
      setRoutines(prev => 
        prev.map(routine => routine.id === id ? { ...routine, ...updates } : routine)
      );
      
      if (isOnline()) {
        await updateRoutineService(id, updates);
      } else {
        // Store the pending action for when we're back online
        await addPendingAction('updateRoutine', { id, updates });
        setError('Changes will be saved when you go back online');
      }
    } catch (err: any) {
      console.error('Error updating routine:', err);
      setError(err.message);
      // Revert optimistic update on error
      loadRoutines();
      throw err;
    }
  };
  
  const deleteRoutine = async (id: string) => {
    try {
      setError(null);
      
      // Optimistically update UI
      setRoutines(prev => prev.filter(routine => routine.id !== id));
      
      if (isOnline()) {
        await deleteRoutineService(id);
      } else {
        // Store the pending action for when we're back online
        await addPendingAction('deleteRoutine', { id });
        setError('Cannot delete routine while offline');
        // Revert optimistic update
        loadRoutines();
        throw new Error('Cannot delete routine while offline');
      }
    } catch (err: any) {
      console.error('Error deleting routine:', err);
      setError(err.message);
      throw err;
    }
  };
  
  const addRoutineSlot = async (routineId: string, slotData: Omit<RoutineSlot, 'id' | 'routineId' | 'createdAt'>) => {
    try {
      setError(null);
      
      if (isOnline()) {
        const newSlot = await addRoutineSlotService(routineId, slotData);
        
        // Update the routine with the new slot
        setRoutines(prev => 
          prev.map(routine => 
            routine.id === routineId 
              ? { 
                  ...routine, 
                  slots: [...(routine.slots || []), newSlot] 
                } 
              : routine
          )
        );
        
        return newSlot;
      } else {
        // Store the pending action for when we're back online
        await addPendingAction('addRoutineSlot', { routineId, slot: slotData });
        setError('Cannot add slot while offline');
        throw new Error('Cannot add slot while offline');
      }
    } catch (err: any) {
      console.error('Error adding routine slot:', err);
      setError(err.message);
      throw err;
    }
  };
  
  const updateRoutineSlot = async (
    routineId: string, 
    slotId: string, 
    updates: Partial<RoutineSlot>
  ) => {
    try {
      setError(null);
      
      // Optimistically update UI
      setRoutines(prev => 
        prev.map(routine => {
          if (routine.id !== routineId) return routine;
          
          return {
            ...routine,
            slots: (routine.slots || []).map(slot => 
              slot.id === slotId ? { ...slot, ...updates } : slot
            )
          };
        })
      );
      
      if (isOnline()) {
        await updateRoutineSlotService(routineId, slotId, updates);
      } else {
        // Store the pending action for when we're back online
        await addPendingAction('updateRoutineSlot', { routineId, slotId, updates });
        setError('Changes will be saved when you go back online');
      }
    } catch (err: any) {
      console.error('Error updating routine slot:', err);
      setError(err.message);
      // Revert optimistic update
      loadRoutines();
      throw err;
    }
  };
  
  const deleteRoutineSlot = async (routineId: string, slotId: string) => {
    try {
      setError(null);
      
      // Optimistically update UI
      setRoutines(prev => 
        prev.map(routine => {
          if (routine.id !== routineId) return routine;
          
          return {
            ...routine,
            slots: (routine.slots || []).filter(slot => slot.id !== slotId)
          };
        })
      );
      
      if (isOnline()) {
        await deleteRoutineSlotService(routineId, slotId);
      } else {
        // Store the pending action for when we're back online
        await addPendingAction('deleteRoutineSlot', { routineId, slotId });
        setError('Cannot delete slot while offline');
        // Revert optimistic update
        loadRoutines();
        throw new Error('Cannot delete slot while offline');
      }
    } catch (err: any) {
      console.error('Error deleting routine slot:', err);
      setError(err.message);
      throw err;
    }
  };

  // Load routines on component mount
  useEffect(() => {
    loadRoutines();
    
    // Set up real-time subscription if online
    if (isOnline()) {
      const channel = supabase
        .channel('routines_changes')
        .on(
          'postgres_changes', 
          { event: '*', schema: 'public', table: 'routines' }, 
          () => {
            loadRoutines();
          }
        )
        .subscribe();
        
      return () => {
        channel.unsubscribe();
      };
    }
    
    return undefined;
  }, [loadRoutines]);

  return {
    routines,
    loading,
    error,
    offline,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    addRoutineSlot,
    updateRoutineSlot,
    deleteRoutineSlot,
    reload: loadRoutines
  };
}