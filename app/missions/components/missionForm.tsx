'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import FormActions from '@/app/components/formActions';
import FullScreenModal from '@/app/components/fullScreenModal';
import MultiSelect from '@/app/components/multiSelect';
import Select from '@/app/components/select';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { ErrorField, HomeData, Mission, Task } from '@/app/types/types';
import { errorClassName, inputFieldClassName, labelClassName } from '@/app/utils/className';
import { getTaskPoints } from '@/app/utils/task';
import { clsx } from 'clsx/lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type MissionFormProps = {
  mission?: Mission;
  onClose: () => void;
  onCancel?: () => void;
  mode: 'add' | 'edit';
};

// Calculate total hours for a mission based on selected tasks and home specifications
const calculateMissionHours = (home: HomeData, tasks: Task[]): number => {
  return tasks.reduce((acc, task) => {
    const hours = {
      [Task.Cleaning]: home.hoursOfCleaning,
      [Task.Gardening]: home.hoursOfGardening,
      [Task.Arrival]: 0.5,
      [Task.Departure]: 0.5,
    }[task];

    return acc + hours;
  }, 0);
};

export default function MissionForm({ mission, onClose, onCancel, mode }: MissionFormProps) {
  const { homes, addMission, updateMission, missionExists } = useMissions();
  const { conciergerieName, employees: allEmployees } = useAuth();

  // Filter homes by the current conciergerie
  const filteredHomes = homes.filter(home => home.conciergerieName === conciergerieName);

  // Initialize form values
  const [homeId, setHomeId] = useState<string>(mission?.homeId || filteredHomes[0]?.id || '');
  const [tasksState, setTasks] = useState<Task[]>(mission?.tasks || []);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(mission?.allowedEmployees || []);
  const [initialFormValues, setInitialFormValues] = useState<{
    homeId: string;
    startDateTime: string;
    endDateTime: string;
    tasksState: Task[];
    selectedEmployees: string[];
  }>();

  const [cannotEdit, setCannotEdit] = useState(false);

  // Get current date and time in local timezone
  const now = new Date();
  const localISOString = useCallback((date: Date) => {
    try {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  }, []);

  // Get employees with accepted status using useMemo
  // This avoids the infinite loop issue by not using state + useEffect
  const employees = useMemo(() => {
    // Filter to only include accepted employees for the current conciergerie
    return allEmployees.filter(emp => emp.status === 'accepted');
  }, [allEmployees]);

  // Initialize start and end date/time
  const [startDateTime, setStartDateTime] = useState<string>(
    mission?.startDateTime ? localISOString(mission.startDateTime) : localISOString(now),
  );

  const [endDateTime, setEndDateTime] = useState<string>(
    mission?.endDateTime
      ? localISOString(mission.endDateTime)
      : localISOString(new Date(now.getTime() + 60 * 60 * 1000)), // For end date/time, add 1 hour to now when adding a new mission
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<Toast>();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Validation states
  const [homeIdError, setHomeIdError] = useState('');
  const [tasksError, setTasksError] = useState('');
  const [startDateTimeError, setStartDateTimeError] = useState('');
  const [endDateTimeError, setEndDateTimeError] = useState('');

  // Refs for form elements
  const homeSelectRef = useRef<HTMLDivElement>(null);
  const taskRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Check if mission can be edited
  useEffect(() => {
    if (mode === 'edit' && mission) {
      const currentTime = new Date();
      const missionEndTime = new Date(mission.endDateTime);

      // Cannot edit mission if end date is in the past AND mission status is not pending or null
      const message =
        missionEndTime < currentTime
          ? 'Cette mission ne peut pas être modifiée car elle est déjà terminée'
          : mission.status === 'started' || mission.status === 'completed'
          ? 'Cette mission ne peut pas être modifiée car elle est déjà commencée ou terminée.'
          : '';

      if (message) {
        setCannotEdit(true);
        setToastMessage({ type: ToastType.Warning, message });
      }
    }
  }, [mission, mode]);

  // Set up French locale for date inputs
  useEffect(() => {
    // Try to set the locale for date inputs
    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    dateInputs.forEach(input => {
      input.setAttribute('lang', 'fr');
    });

    // Set document language to French
    document.documentElement.lang = 'fr';

    setInitialFormValues({
      homeId,
      startDateTime,
      endDateTime,
      tasksState,
      selectedEmployees,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if form has been modified
  const checkFormChanged = useCallback(() => {
    if (!initialFormValues) return false;

    // Check if any field has been filled in compared to initial state
    const tasksChanged = JSON.stringify(tasksState) !== JSON.stringify(initialFormValues.tasksState);
    const homeIdChanged = homeId !== initialFormValues.homeId;
    const startDateChanged = startDateTime !== initialFormValues.startDateTime;
    const endDateChanged = endDateTime !== initialFormValues.endDateTime;
    const employeesChanged =
      JSON.stringify(selectedEmployees.sort()) !== JSON.stringify(initialFormValues.selectedEmployees.sort());

    return tasksChanged || homeIdChanged || startDateChanged || endDateChanged || employeesChanged;
  }, [homeId, tasksState, startDateTime, endDateTime, selectedEmployees, initialFormValues]);

  const handleCancel = () => {
    if (checkFormChanged()) {
      setShowConfirmDialog(true);
    } else {
      onClose();
      onCancel?.();
    }
  };

  const handleSubmit = () => {
    let error: ErrorField | undefined;

    if (!homeId.trim())
      error = {
        message: 'Veuillez sélectionner un bien',
        fieldRef: homeSelectRef,
        func: setHomeIdError,
      };
    else if (tasksState.length === 0)
      error = {
        message: 'Veuillez sélectionner au moins une tâche',
        fieldRef: taskRef,
        func: setTasksError,
      };
    else if (!startDateTime)
      error = {
        message: 'Veuillez sélectionner une date de début',
        fieldRef: startDateRef,
        func: setStartDateTimeError,
      };
    else if (!endDateTime)
      error = {
        message: 'Veuillez sélectionner une date de fin',
        fieldRef: endDateRef,
        func: setEndDateTimeError,
      };

    try {
      setIsSubmitting(true);

      if (error) {
        error.fieldRef.current?.focus();
        error.func(error.message);
        throw new Error(error.message);
      }

      const selectedHome = filteredHomes.find(h => h.id === homeId);
      if (!selectedHome) throw new Error('Veuillez sélectionner un bien valide');

      // Convert string dates to Date objects
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);

      // Calculate the total hours based on tasks and home specifications
      const totalHours = calculateMissionHours(selectedHome, tasksState);

      if (mode === 'add') {
        // Check if a mission with the same criteria already exists
        if (
          missionExists({
            homeId: selectedHome.id,
            tasks: tasksState,
            startDateTime: startDate,
            endDateTime: endDate,
          })
        )
          throw new Error('Une mission identique existe déjà');

        const result = addMission({
          homeId: selectedHome.id,
          tasks: tasksState,
          startDateTime: startDate,
          endDateTime: endDate,
          allowedEmployees: selectedEmployees.length > 0 ? selectedEmployees : undefined,
          hours: totalHours,
        });
        if (!result) throw new Error("Impossible d'ajouter la mission");

        setToastMessage({ type: ToastType.Success, message: 'Mission ajoutée avec succès !' });
      } else if (mission) {
        // Create a new mission object with only the necessary fields
        // This ensures we don't preserve any fields that should be reset by updateMission

        const updatedMission: Mission = {
          id: mission.id,
          homeId: selectedHome.id,
          tasks: tasksState,
          startDateTime: startDate,
          endDateTime: endDate,
          modifiedDate: new Date(),
          conciergerieName: mission.conciergerieName,
          allowedEmployees: selectedEmployees.length > 0 ? selectedEmployees : undefined,
          status: mission.status,
          employeeId: mission.employeeId,
          hours: totalHours,
        };

        // Check if update would create a duplicate (excluding the current mission)
        if (missionExists(updatedMission, mission.id)) throw new Error('Une mission identique existe déjà');

        const result = updateMission(updatedMission);
        if (!result) throw new Error('Impossible de mettre à jour la mission');

        setToastMessage({ type: ToastType.Success, message: 'Mission mise à jour avec succès !' });
      }
    } catch (error) {
      setToastMessage({ type: ToastType.Error, message: String(error), error });
      setIsSubmitting(false);
    }
  };

  const toggleTask = (task: Task) => {
    // Check if the task is already in the array
    const taskExists = tasksState.includes(task);

    if (taskExists) {
      // Remove the task if it exists
      setTasks(tasksState.filter(t => t !== task));
    } else {
      // Add the task if it doesn't exist
      setTasks([...tasksState, task]);
    }
  };

  // Get current date/time for min attribute
  const nowString = localISOString(now);

  // Handle start date change and update end date if needed
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;

    // Validate the selected date is not in the past
    const selectedDate = new Date(newStartDate);
    const currentDate = new Date();

    if (selectedDate < currentDate) {
      setStartDateTimeError('La date de début ne peut pas être antérieure à la date actuelle');
      return;
    }

    setStartDateTime(newStartDate);
    setStartDateTimeError('');

    // Create a new Date object from the selected start date
    const startDate = new Date(newStartDate);

    // Add 1 hour to the start date for the minimum end date
    const minEndDate = new Date(startDate);
    minEndDate.setHours(minEndDate.getHours() + 1);

    // Format the minimum end date as an ISO string for the input
    const minEndDateString = localISOString(minEndDate);

    // If end date is before the minimum end date or empty, set it to the minimum end date
    if (endDateTime < minEndDateString || !endDateTime) {
      setEndDateTime(minEndDateString);
    }
  };

  const footer = (
    <FormActions
      submitText={mode === 'add' ? 'Ajouter' : 'Enregistrer'}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
      disabled={!checkFormChanged()}
    />
  );

  return (
    <FullScreenModal
      title={mode === 'add' ? 'Ajouter une mission' : 'Modifier la mission'}
      onClose={onClose}
      footer={footer}
    >
      <ToastMessage
        toast={toastMessage}
        onClose={() => {
          setToastMessage(undefined);
          if (toastMessage?.type === ToastType.Success) {
            onClose();
            onCancel?.();
          }
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label htmlFor="home-select" className={labelClassName}>
            Bien
          </label>
          <Select
            id="home-select"
            ref={homeSelectRef}
            value={homeId}
            onChange={(value: string) => {
              setHomeId(value);
              setHomeIdError('');
            }}
            options={filteredHomes.map(home => ({
              value: home.id,
              label: home.title,
            }))}
            disabled={isSubmitting || cannotEdit}
            placeholder="Sélectionner un bien"
            error={homeIdError}
          />
          {!!homeIdError && <p className={errorClassName}>{homeIdError}</p>}
        </div>

        <div>
          <label htmlFor="task-select" className={labelClassName}>
            Tâches
          </label>
          <div ref={taskRef} className="grid grid-cols-2 gap-2">
            {Object.values(Task).map(task => {
              const points = getTaskPoints(task);
              return (
                <button
                  type="button"
                  key={task}
                  onClick={() => toggleTask(task)}
                  disabled={isSubmitting || cannotEdit}
                  className={clsx(
                    'p-2 border rounded-lg text-sm flex justify-between items-center',
                    'border-foreground/20 focus-visible:outline-primary',
                    tasksState.includes(task)
                      ? 'bg-primary text-background border-primary'
                      : 'bg-background text-foreground border-secondary',
                  )}
                >
                  <span>{task}</span>
                  <span
                    className={clsx(
                      'px-1.5 py-0.5 rounded-full text-xs',
                      tasksState.includes(task) ? 'bg-background/20 text-background' : 'bg-primary/10 text-primary',
                    )}
                  >
                    {points} pt{points !== 1 ? 's' : ''}
                  </span>
                </button>
              );
            })}
          </div>
          {!!tasksError && <p className={errorClassName}>{tasksError}</p>}
        </div>

        <div>
          <label htmlFor="start-date" className={labelClassName}>
            Date et heure de début
          </label>
          <input
            type="datetime-local"
            lang="fr"
            ref={startDateRef}
            value={startDateTime}
            min={nowString}
            onChange={handleStartDateChange}
            className={inputFieldClassName(startDateTimeError)}
            disabled={isSubmitting || cannotEdit}
          />
          {!!startDateTimeError && <p className={errorClassName}>{startDateTimeError}</p>}
        </div>

        <div>
          <label htmlFor="end-date" className={labelClassName}>
            Date et heure de fin
          </label>
          <input
            type="datetime-local"
            lang="fr"
            ref={endDateRef}
            value={endDateTime}
            min={(() => {
              // Calculate minimum end date (start date + 1 hour)
              const startDate = new Date(startDateTime);
              const minEndDate = new Date(startDate);
              minEndDate.setHours(minEndDate.getHours() + 1);
              return localISOString(minEndDate);
            })()}
            onChange={e => {
              setEndDateTime(e.target.value);
              setEndDateTimeError('');
            }}
            className={inputFieldClassName(endDateTimeError)}
            disabled={isSubmitting || cannotEdit}
          />
          {!!endDateTimeError && <p className={errorClassName}>{endDateTimeError}</p>}
        </div>

        <div>
          <label htmlFor="prestataires-select" className={labelClassName}>
            Prestataires
          </label>
          {/* Add debugging in useEffect instead of inline */}
          <MultiSelect
            id="prestataires-select"
            values={selectedEmployees}
            onChange={setSelectedEmployees}
            options={employees.map(emp => ({
              value: emp.id,
              label: `${emp.firstName} ${emp.familyName}`,
            }))}
            allOption={true}
            disabled={isSubmitting || cannotEdit}
          />
          <p className="text-sm text-foreground/70 mt-1">
            {selectedEmployees.length === 0
              ? 'Tous les prestataires pourront voir cette mission'
              : 'Seuls les prestataires sélectionnés pourront voir cette mission'}
          </p>
        </div>

        <ConfirmationModal
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={onClose}
          title="Modifications non enregistrées"
          message="Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter sans enregistrer ?"
          confirmText="Quitter sans enregistrer"
          cancelText="Continuer l'édition"
        />
      </form>
    </FullScreenModal>
  );
}
