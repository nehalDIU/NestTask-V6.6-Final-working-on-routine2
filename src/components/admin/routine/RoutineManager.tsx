import { useState } from 'react';
import { RoutineForm } from './RoutineForm';
import { RoutineList } from './RoutineList';
import type { Routine, RoutineSlot } from '../../../types/routine';
import type { Course } from '../../../types/course';
import type { Teacher } from '../../../types/teacher';

interface RoutineManagerProps {
  routines: Routine[];
  courses: Course[];
  teachers: Teacher[];
  onCreateRoutine: (routine: Omit<Routine, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateRoutine: (id: string, updates: Partial<Routine>) => Promise<void>;
  onDeleteRoutine: (id: string) => Promise<void>;
  onAddSlot: (routineId: string, slot: Omit<RoutineSlot, 'id' | 'routineId' | 'createdAt'>) => Promise<void>;
  onUpdateSlot: (routineId: string, slotId: string, updates: Partial<RoutineSlot>) => Promise<void>;
  onDeleteSlot: (routineId: string, slotId: string) => Promise<void>;
}

export function RoutineManager({
  routines,
  courses,
  teachers,
  onCreateRoutine,
  onUpdateRoutine,
  onDeleteRoutine,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot
}: RoutineManagerProps) {
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

  return (
    <div className="space-y-6">
      <RoutineForm onSubmit={onCreateRoutine} />
      <RoutineList 
        routines={routines}
        courses={courses}
        teachers={teachers}
        selectedRoutine={selectedRoutine}
        onSelectRoutine={setSelectedRoutine}
        onUpdateRoutine={onUpdateRoutine}
        onDeleteRoutine={onDeleteRoutine}
        onAddSlot={onAddSlot}
        onUpdateSlot={onUpdateSlot}
        onDeleteSlot={onDeleteSlot}
      />
    </div>
  );
}