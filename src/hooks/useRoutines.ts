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

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRoutines();

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
          loadRoutines();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadRoutines = async () => {
    try {
      setLoading(true);
      const data = await fetchRoutines();
      setRoutines(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createRoutine = async (routine: Omit<Routine, 'id' | 'createdAt'>) => {
    try {
      setError(null);
      const newRoutine = await createRoutineService(routine);
      setRoutines(prev => [newRoutine, ...prev]);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateRoutine = async (id: string, updates: Partial<Routine>) => {
    try {
      setError(null);
      await updateRoutineService(id, updates);
      setRoutines(prev =>
        prev.map(routine =>
          routine.id === id ? { ...routine, ...updates } : routine
        )
      );
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteRoutine = async (id: string) => {
    try {
      setError(null);
      await deleteRoutineService(id);
      setRoutines(prev => prev.filter(routine => routine.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const addRoutineSlot = async (routineId: string, slot: Omit<RoutineSlot, 'id' | 'routineId' | 'createdAt'>) => {
    try {
      setError(null);
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
    createRoutine,
    updateRoutine,
    deleteRoutine,
    addRoutineSlot,
    updateRoutineSlot,
    deleteRoutineSlot
  };
}