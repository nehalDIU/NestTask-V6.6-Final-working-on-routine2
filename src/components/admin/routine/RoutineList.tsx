import { useState } from 'react';
import { Search, Trash2, Edit2, Plus, Clock, MapPin, Filter, Download, Printer,
  ChevronLeft,
  ChevronRight,
  Users,
  BookOpen,
  GraduationCap,
  Building } from 'lucide-react';
import { RoutineSlotModal } from './RoutineSlotModal';
import type { Routine, RoutineSlot } from '../../../types/routine';
import type { Course } from '../../../types/course';
import type { Teacher } from '../../../types/teacher';

interface RoutineListProps {
  routines: Routine[];
  courses: Course[];
  teachers: Teacher[];
  selectedRoutine: Routine | null;
  onSelectRoutine: (routine: Routine | null) => void;
  onUpdateRoutine: (id: string, updates: Partial<Routine>) => Promise<void>;
  onDeleteRoutine: (id: string) => Promise<void>;
  onAddSlot: (routineId: string, slot: Omit<RoutineSlot, 'id' | 'routineId' | 'createdAt'>) => Promise<void>;
  onUpdateSlot: (routineId: string, slotId: string, updates: Partial<RoutineSlot>) => Promise<void>;
  onDeleteSlot: (routineId: string, slotId: string) => Promise<void>;
}

export function RoutineList({
  routines,
  courses,
  teachers,
  selectedRoutine,
  onSelectRoutine,
  onUpdateRoutine,
  onDeleteRoutine,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot
}: RoutineListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<RoutineSlot | null>(null);

  const filteredRoutines = routines.filter(routine =>
    routine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    routine.semester.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSlot = () => {
    if (!selectedRoutine) return;
    setSelectedSlot(null);
    setShowSlotModal(true);
  };

  const handleEditSlot = (slot: RoutineSlot) => {
    setSelectedSlot(slot);
    setShowSlotModal(true);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden mt-6">
        <div className="p-6">
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Search routines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>

          <div className="space-y-4">
            {filteredRoutines.map((routine) => (
              <div
                key={routine.id}
                className={`
                  bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700
                  hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-200
                  ${selectedRoutine?.id === routine.id ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {routine.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Semester: {routine.semester}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectRoutine(routine)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteRoutine(routine.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {routine.slots && routine.slots.length > 0 ? (
                    <div className="space-y-2">
                      {routine.slots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {slot.dayOfWeek} {slot.startTime}-{slot.endTime}
                              </span>
                            </div>
                            {slot.roomNumber && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Room {slot.roomNumber}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditSlot(slot)}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteSlot(routine.id, slot.id)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No slots added yet
                    </p>
                  )}

                  <button
                    onClick={handleAddSlot}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Time Slot
                  </button>
                </div>
              </div>
            ))}

            {filteredRoutines.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No routines found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {searchTerm ? 'Try a different search term' : 'Create your first routine above'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSlotModal && selectedRoutine && (
        <RoutineSlotModal
          routineId={selectedRoutine.id}
          slot={selectedSlot}
          courses={courses}
          teachers={teachers}
          onClose={() => setShowSlotModal(false)}
          onSubmit={selectedSlot ? onUpdateSlot : onAddSlot}
        />
      )}
    </>
  );
}