import { useState, useEffect } from 'react';
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
import type { Routine, RoutineSlot } from '../types/routine';
import { 
  saveRoutinesLocally, 
  getLocalRoutines, 
  isOnline,
  addPendingAction
} from '../utils/offlineUtils';

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!isOnline());

  useEffect(() => {
    loadRoutines();

    // Handle online/offline events
    const handleConnectionChange = async (event: Event | CustomEvent) => {
      const isConnected = event.type === 'online' || 
        (event instanceof CustomEvent && event.detail?.status === 'online');
      
      setOffline(!isConnected);
      
      // If we're back online, try to load fresh data
      if (isConnected) {
        await loadRoutines();
      }
    };

    // Listen for online/offline status changes
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);
    window.addEventListener('connection-status-change', handleConnectionChange as EventListener);

    // Subscribe to changes
    const subscription = supabase
      .channel('routines')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'routines'
        },
        () => {
          if (isOnline()) {
            loadRoutines();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
      window.removeEventListener('connection-status-change', handleConnectionChange as EventListener);
    };
  }, []);

  const loadRoutines = async () => {
    try {
      setLoading(true);
      
      // Check if we're online
      if (isOnline()) {
        // Fetch from server
        console.log('Fetching routines from server');
        const data = await fetchRoutines();
        setRoutines(data);
        
        // Save for offline use
        await saveRoutinesLocally(data);
      } else {
        // Use local data
        console.log('Fetching routines from local storage');
        const localData = await getLocalRoutines();
        setRoutines(localData);
      }
    } catch (err: any) {
      console.error('Error loading routines:', err);
      setError(err.message);
      
      // If server fetch fails, try to use local data as fallback
      try {
        const localData = await getLocalRoutines();
        if (localData && localData.length > 0) {
          console.log('Using cached routines as fallback');
          setRoutines(localData);
        }
      } catch (localErr) {
        console.error('Failed to load local routines:', localErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const createRoutine = async (routine: Omit<Routine, 'id' | 'createdAt'>) => {
    try {
      setError(null);
      
      // If online, create on server
      if (isOnline()) {
        const newRoutine = await createRoutineService(routine);
        setRoutines(prev => [newRoutine, ...prev]);
      } else {
        // If offline, queue the action for later sync
        const tempId = `temp-${Date.now()}`;
        const tempRoutine = {
          id: tempId,
          ...routine,
          createdAt: new Date().toISOString(),
          createdBy: 'local-user',
          slots: []
        };
        
        // Add to local state
        setRoutines(prev => [tempRoutine, ...prev]);
        
        // Save to local storage
        await getLocalRoutines().then(existingRoutines => {
          return saveRoutinesLocally([tempRoutine, ...existingRoutines]);
        });
        
        // Add to pending actions
        await addPendingAction('create-routine', routine);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateRoutine = async (id: string, updates: Partial<Routine>) => {
    try {
      setError(null);
      
      // Update local state immediately for better UX
      setRoutines(prev =>
        prev.map(routine =>
          routine.id === id ? { ...routine, ...updates } : routine
        )
      );
      
      // If online, update on server
      if (isOnline()) {
        await updateRoutineService(id, updates);
      } else {
        // If offline, queue the action for later sync
        await addPendingAction('update-routine', { id, ...updates });
        
        // Update in local storage
        const localRoutines = await getLocalRoutines();
        const updatedRoutines = localRoutines.map(routine => 
          routine.id === id ? { ...routine, ...updates } : routine
        );
        await saveRoutinesLocally(updatedRoutines);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteRoutine = async (id: string) => {
    try {
      setError(null);
      
      // Update local state immediately for better UX
      setRoutines(prev => prev.filter(routine => routine.id !== id));
      
      // If online, delete on server
      if (isOnline()) {
        await deleteRoutineService(id);
      } else {
        // If offline, queue the action for later sync
        await addPendingAction('delete-routine', { id });
        
        // Update in local storage
        const localRoutines = await getLocalRoutines();
        const filteredRoutines = localRoutines.filter(routine => routine.id !== id);
        await saveRoutinesLocally(filteredRoutines);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Implement offline-first pattern for slot operations too
  const addRoutineSlot = async (routineId: string, slot: Omit<RoutineSlot, 'id' | 'routineId' | 'createdAt'>) => {
    try {
      setError(null);
      
      if (isOnline()) {
        const newSlot = await addRoutineSlotService(routineId, slot);
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
      } else {
        // Create a temporary slot ID
        const tempSlot = {
          id: `temp-slot-${Date.now()}`,
          routineId,
          ...slot,
          createdAt: new Date().toISOString()
        };
        
        // Update local state
        setRoutines(prev =>
          prev.map(routine =>
            routine.id === routineId
              ? {
                  ...routine,
                  slots: [...(routine.slots || []), tempSlot]
                }
              : routine
          )
        );
        
        // Queue the action for later sync
        await addPendingAction('add-routine-slot', { 
          routineId, 
          slot 
        });
        
        // Update in local storage
        const localRoutines = await getLocalRoutines();
        const updatedRoutines = localRoutines.map(routine => 
          routine.id === routineId 
            ? { 
                ...routine, 
                slots: [...(routine.slots || []), tempSlot] 
              } 
            : routine
        );
        await saveRoutinesLocally(updatedRoutines);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateRoutineSlot = async (routineId: string, slotId: string, updates: Partial<RoutineSlot>) => {
    try {
      setError(null);
      await updateRoutineSlotService(routineId, slotId, updates);
      setRoutines(prev =>
        prev.map(routine =>
          routine.id === routineId
            ? {
                ...routine,
                slots: routine.slots?.map(slot =>
                  slot.id === slotId ? { ...slot, ...updates } : slot
                )
              }
            : routine
        )
      );
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteRoutineSlot = async (routineId: string, slotId: string) => {
    try {
      setError(null);
      await deleteRoutineSlotService(routineId, slotId);
      setRoutines(prev =>
        prev.map(routine =>
          routine.id === routineId
            ? {
                ...routine,
                slots: routine.slots?.filter(slot => slot.id !== slotId)
              }
            : routine
        )
      );
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

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
    deleteRoutineSlot
  };
}