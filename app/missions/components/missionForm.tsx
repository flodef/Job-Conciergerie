'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import FormActions from '@/app/components/formActions';
import FullScreenModal from '@/app/components/fullScreenModal';
import MultiSelect from '@/app/components/multiSelect';
import Select from '@/app/components/select';
import { ToastMessage, ToastProps, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { Employee, Mission, Task } from '@/app/types/types';
import { getEmployees } from '@/app/utils/employee';
import { getTasksWithPoints } from '@/app/utils/task';
import { clsx } from 'clsx/lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type MissionFormProps = {
  mission?: Mission;
  onClose: () => void;
  onCancel?: () => void;
  mode: 'add' | 'edit';
};

export default function MissionForm({ mission, onClose, onCancel, mode }: MissionFormProps) {
  const { homes, addMission, updateMission, missionExists } = useMissions();
  const { conciergerieData } = useAuth();

  // Filter homes by the current conciergerie
  const filteredHomes = homes.filter(home => home.conciergerieName === conciergerieData?.name);

  const [homeId, setHomeId] = useState<string>(mission?.homeId || filteredHomes[0]?.id || '');
  const [tasksState, setTasks] = useState<Task[]>(mission?.tasks || []);
  const [selectedPrestataires, setSelectedPrestataires] = useState<string[]>(mission?.prestataires || []);
  const [initialFormValues, setInitialFormValues] = useState<{
    homeId: string;
    startDateTime: string;
    endDateTime: string;
    tasksState: Task[];
    selectedPrestataires: string[];
  }>();
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

  // Get prestataires (employees with accepted status) using useMemo
  // This avoids the infinite loop issue by not using state + useEffect
  const prestataires = useMemo(() => {
    // Get all employees from localStorage
    const allEmployees = getEmployees();

    // Filter to only include accepted employees for the current conciergerie
    return allEmployees.filter((emp: Employee) => emp.status === 'accepted');
  }, []);

  // Initialize start and end date/time
  const [startDateTime, setStartDateTime] = useState<string>(
    mission?.startDateTime ? localISOString(mission.startDateTime) : localISOString(now),
  );

  const [endDateTime, setEndDateTime] = useState<string>(
    mission?.endDateTime
      ? localISOString(mission.endDateTime)
      : localISOString(new Date(now.getTime() + 60 * 60 * 1000)), // For end date/time, add 1 hour to now when adding a new mission
  );

  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastProps>();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Refs for form elements
  const homeSelectRef = useRef<HTMLDivElement>(null);
  const taskRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

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
      selectedPrestataires,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isFormValid = homeId !== '' && tasksState.length > 0 && startDateTime !== '' && endDateTime !== '';

  // Check if form has been modified
  const checkFormChanged = useCallback(() => {
    if (!initialFormValues) return false;

    // Check if any field has been filled in compared to initial state
    const tasksChanged = JSON.stringify(tasksState) !== JSON.stringify(initialFormValues.tasksState);
    const homeIdChanged = homeId !== initialFormValues.homeId;
    const startDateChanged = startDateTime !== initialFormValues.startDateTime;
    const endDateChanged = endDateTime !== initialFormValues.endDateTime;
    const prestatairesChanged =
      JSON.stringify(selectedPrestataires.sort()) !== JSON.stringify(initialFormValues.selectedPrestataires.sort());

    return tasksChanged || homeIdChanged || startDateChanged || endDateChanged || prestatairesChanged;
  }, [homeId, tasksState, startDateTime, endDateTime, selectedPrestataires, initialFormValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

    // Check if home is selected
    if (!homeId) {
      setToastMessage({ type: ToastType.Error, message: 'Veuillez sélectionner un bien' });
      homeSelectRef.current?.querySelector('select')?.focus();
      return;
    }

    // Check if tasks are selected
    if (tasksState.length === 0) {
      setToastMessage({ type: ToastType.Error, message: 'Veuillez sélectionner au moins une tâche' });
      // Focus on the first task button
      const firstTaskButton = taskRef.current?.querySelector('button');
      if (firstTaskButton) {
        firstTaskButton.focus();
      }
      return;
    }

    // Check if start date is selected
    if (!startDateTime) {
      setToastMessage({ type: ToastType.Error, message: 'Veuillez sélectionner une date de début' });
      startDateRef.current?.focus();
      return;
    }

    // Check if end date is selected
    if (!endDateTime) {
      setToastMessage({ type: ToastType.Error, message: 'Veuillez sélectionner une date de fin' });
      endDateRef.current?.focus();
      return;
    }

    if (isFormValid) {
      const selectedHome = filteredHomes.find(h => h.id === homeId);

      if (!selectedHome) {
        setToastMessage({ type: ToastType.Error, message: 'Veuillez sélectionner un bien valide' });
        return;
      }

      // We'll just use the homeId now instead of embedding the full home object

      // Convert string dates to Date objects
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);

      // Check for duplicate missions

      if (mode === 'add') {
        // Check if a mission with the same criteria already exists
        if (missionExists(selectedHome.id, tasksState, startDate, endDate)) {
          setToastMessage({
            type: ToastType.Warning,
            message: 'Une mission identique existe déjà',
          });
          return;
        }

        const result = addMission({
          homeId: selectedHome.id,
          tasks: tasksState,
          startDateTime: startDate,
          endDateTime: endDate,
          prestataires: selectedPrestataires.length > 0 ? selectedPrestataires : undefined,
        });

        if (result === false) {
          setToastMessage({
            type: ToastType.Warning,
            message: 'Une mission identique existe déjà',
          });
          return;
        }

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
          conciergerieName: mission.conciergerieName,
          modifiedDate: new Date(),
          deleted: mission.deleted || false,
          prestataires: selectedPrestataires.length > 0 ? selectedPrestataires : undefined,
          status: mission.status,
          employeeId: mission.employeeId,
        };

        // Check if update would create a duplicate (excluding the current mission)
        if (missionExists(selectedHome.id, tasksState, startDate, endDate, mission.id)) {
          setToastMessage({
            type: ToastType.Warning,
            message: 'Une mission identique existe déjà',
          });
          return;
        }

        const result = updateMission(updatedMission);

        if (result === false) {
          setToastMessage({
            type: ToastType.Warning,
            message: 'Une mission identique existe déjà',
          });
          return;
        }

        setToastMessage({ type: ToastType.Success, message: 'Mission mise à jour avec succès !' });
      }
    }
  };

  const toggleTask = (task: Task) => {
    // Check if the task is already in the array by comparing labels
    const taskExists = tasksState.some(t => t.label === task.label);

    if (taskExists) {
      // Remove the task if it exists
      setTasks(tasksState.filter(t => t.label !== task.label));
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
    setStartDateTime(newStartDate);

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

  return (
    <FullScreenModal title={mode === 'add' ? 'Ajouter une mission' : 'Modifier la mission'} onClose={onClose}>
      <ToastMessage
        toast={toastMessage}
        onClose={() => {
          setToastMessage(undefined);
          if (toastMessage?.type === ToastType.Success) onClose();
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label className="block text-sm font-medium mb-2">Bien</label>
          <div ref={homeSelectRef}>
            <Select
              id="home-select"
              value={homeId}
              onChange={(value: string) => {
                setHomeId(value);
              }}
              options={filteredHomes.map(home => ({
                value: home.id,
                label: home.title,
              }))}
              placeholder="Sélectionner un bien"
              error={isFormSubmitted && !homeId}
            />
          </div>
          {isFormSubmitted && !homeId && <p className="text-red-500 text-sm mt-1">Veuillez sélectionner un bien</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tâches</label>
          <div ref={taskRef} className="grid grid-cols-2 gap-2">
            {getTasksWithPoints().map(task => (
              <button
                type="button"
                key={task.label}
                onClick={() => toggleTask(task)}
                className={clsx(
                  'p-2 border rounded-lg text-sm flex justify-between items-center',
                  'border-foreground/20 focus-visible:outline-primary',
                  tasksState.some(t => t.label === task.label)
                    ? 'bg-primary text-background border-primary'
                    : 'bg-background text-foreground border-secondary',
                )}
              >
                <span>{task.label}</span>
                <span
                  className={clsx(
                    'px-1.5 py-0.5 rounded-full text-xs',
                    tasksState.some(t => t.label === task.label)
                      ? 'bg-background/20 text-background'
                      : 'bg-primary/10 text-primary',
                  )}
                >
                  {task.points} pt{task.points !== 1 ? 's' : ''}
                </span>
              </button>
            ))}
          </div>
          {isFormSubmitted && tasksState.length === 0 && (
            <p className="text-red-500 text-sm mt-1">Veuillez sélectionner au moins une tâche</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Date et heure de début</label>
          <input
            type="datetime-local"
            lang="fr"
            ref={startDateRef}
            value={startDateTime}
            min={nowString}
            onChange={handleStartDateChange}
            className={clsx(
              'w-full p-2 border rounded-lg bg-background',
              'border-foreground/20 focus-visible:outline-primary',
              isFormSubmitted && !startDateTime ? 'border-red-500' : 'border-secondary',
            )}
          />
          {isFormSubmitted && !startDateTime && (
            <p className="text-red-500 text-sm mt-1">Veuillez sélectionner une date et heure de début</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Date et heure de fin</label>
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
            onChange={e => setEndDateTime(e.target.value)}
            className={clsx(
              'w-full p-2 border rounded-lg bg-background',
              'border-foreground/20 focus-visible:outline-primary',
              isFormSubmitted && !endDateTime ? 'border-red-500' : 'border-secondary',
            )}
          />
          {isFormSubmitted && !endDateTime && (
            <p className="text-red-500 text-sm mt-1">Veuillez sélectionner une date et heure de fin</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Prestataires</label>
          {/* Add debugging in useEffect instead of inline */}
          <MultiSelect
            id="prestataires-select"
            values={selectedPrestataires}
            onChange={setSelectedPrestataires}
            options={prestataires.map(emp => ({
              value: emp.id,
              label: `${emp.firstName} ${emp.familyName}`,
            }))}
            allOption={true}
          />
          <p className="text-sm text-foreground/70 mt-1">
            {selectedPrestataires.length === 0
              ? 'Tous les prestataires pourront voir cette mission'
              : 'Seuls les prestataires sélectionnés pourront voir cette mission'}
          </p>
        </div>

        <FormActions
          onCancel={() => {
            if (checkFormChanged()) {
              setShowConfirmDialog(true);
            } else {
              onClose();
              onCancel?.();
            }
          }}
          submitText={mode === 'add' ? 'Ajouter' : 'Enregistrer'}
          submitType="submit"
        />

        <ConfirmationModal
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={() => {
            onClose();
          }}
          title="Modifications non enregistrées"
          message="Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter sans enregistrer ?"
          confirmText="Quitter sans enregistrer"
          cancelText="Continuer l'édition"
        />
      </form>
    </FullScreenModal>
  );
}
