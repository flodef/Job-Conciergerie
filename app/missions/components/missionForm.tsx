'use client';

import Combobox from '@/app/components/combobox';
import ConfirmationModal from '@/app/components/confirmationModal';
import DateTimeInput from '@/app/components/dateTimeInput';
import FormActions from '@/app/components/formActions';
import FullScreenModal from '@/app/components/fullScreenModal';
import MultiSelect from '@/app/components/multiSelect';
import TaskSelector from '@/app/components/taskSelector';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { Mission, Task } from '@/app/types/dataTypes';
import { ErrorField } from '@/app/types/types';
import { adjustMissionDateTime, getMissionDateTime, localISOString, minimumMissionTime } from '@/app/utils/date';
import { handleChange } from '@/app/utils/form';
import { calculateMissionHours, getAvailableTasks } from '@/app/utils/task';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type MissionFormProps = {
  mission?: Mission;
  onClose: () => void;
  onCancel?: () => void;
  mode: 'add' | 'edit';
};

export default function MissionForm({ mission, onClose, onCancel, mode }: MissionFormProps) {
  const { homes, addMission, updateMission, missionExists } = useMissions();
  const { conciergerieName, employees: allEmployees, getUserKey } = useAuth();

  // Filter homes by the current conciergerie
  const filteredHomes = homes.filter(home => home.conciergerieName === conciergerieName);

  // Initialize form values
  const [homeId, setHomeId] = useState<string>(mission?.homeId || filteredHomes[0]?.id || '');
  const [tasks, setTasks] = useState<Task[]>(mission?.tasks || []);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(mission?.allowedEmployees || []);
  const [initialFormValues, setInitialFormValues] = useState<{
    homeId: string;
    startDateTime: string;
    endDateTime: string;
    tasks: Task[];
    selectedEmployees: string[];
  }>();

  const [cannotEdit, setCannotEdit] = useState(false);

  // Get employees with accepted status using useMemo
  // This avoids the infinite loop issue by not using state + useEffect
  const employees = useMemo(() => {
    // Filter to only include accepted employees for the current conciergerie
    return allEmployees.filter(emp => emp.status === 'accepted');
  }, [allEmployees]);

  // Initialize start and end date/time
  const { startDateTime: start, endDateTime: end } = getMissionDateTime(mission);
  const [startDateTime, setStartDateTime] = useState<string>(start);
  const [endDateTime, setEndDateTime] = useState<string>(end);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast>();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Validation states
  const [homeIdError, setHomeIdError] = useState('');
  const [tasksError, setTasksError] = useState('');
  const [startDateTimeError, setStartDateTimeError] = useState('');
  const [endDateTimeError, setEndDateTimeError] = useState('');

  // Refs for form elements
  const homeSelectRef = useRef<HTMLInputElement>(null);
  const taskRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Check if mission can be edited
  useEffect(() => {
    if (mode === 'edit' && mission) {
      const currentTime = new Date();
      const missionEndTime = new Date(mission.endDateTime);

      // Cannot edit mission if end date is in the past AND mission status is not accepted or null
      const message =
        missionEndTime < currentTime
          ? 'Cette mission ne peut pas être modifiée car elle est déjà terminée'
          : mission.status === 'started' || mission.status === 'completed'
          ? 'Cette mission ne peut pas être modifiée car elle est déjà commencée ou terminée.'
          : '';

      if (message) {
        setCannotEdit(true);
        setToast({ type: ToastType.Warning, message });
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
      tasks,
      selectedEmployees,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if form has been modified
  const checkFormChanged = useCallback(() => {
    if (!initialFormValues) return false;

    // Check if any field has been filled in compared to initial state
    const tasksChanged = JSON.stringify(tasks) !== JSON.stringify(initialFormValues.tasks);
    const homeIdChanged = homeId !== initialFormValues.homeId;
    const startDateChanged = startDateTime !== initialFormValues.startDateTime;
    const endDateChanged = endDateTime !== initialFormValues.endDateTime;
    const employeesChanged =
      JSON.stringify(selectedEmployees.sort()) !== JSON.stringify(initialFormValues.selectedEmployees.sort());

    return tasksChanged || homeIdChanged || startDateChanged || endDateChanged || employeesChanged;
  }, [homeId, tasks, startDateTime, endDateTime, selectedEmployees, initialFormValues]);

  const closeAndCancel = () => {
    onClose();
    onCancel?.();
  };

  const handleCancel = () => {
    if (checkFormChanged()) setShowConfirmDialog(true);
    else closeAndCancel();
  };

  const handleClose = () => {
    if (checkFormChanged()) setShowConfirmDialog(true);
    else onClose();
  };

  const handleSubmit = async () => {
    let error: ErrorField | undefined;

    if (!homeId.trim())
      error = {
        message: 'Veuillez sélectionner un bien',
        fieldRef: homeSelectRef,
        func: setHomeIdError,
      };
    else if (tasks.length === 0)
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
      const { startDateTime: startDate, endDateTime: endDate } = adjustMissionDateTime(startDateTime, endDateTime);

      // Calculate the total hours and available tasks based on tasks and home specifications
      const totalHours = calculateMissionHours(selectedHome, tasks);
      const availableTasks = getAvailableTasks(selectedHome, tasks);

      if (mode === 'add') {
        // Check if a mission with the same criteria already exists
        if (
          missionExists({
            homeId: selectedHome.id,
            tasks: availableTasks,
            startDateTime: startDate,
            endDateTime: endDate,
          })
        )
          throw new Error('Une mission identique existe déjà');

        const result = await addMission({
          homeId: selectedHome.id,
          tasks: availableTasks,
          startDateTime: startDate,
          endDateTime: endDate,
          allowedEmployees: selectedEmployees.length > 0 ? selectedEmployees : null,
          hours: totalHours,
          employeeId: null,
          status: null,
        });
        if (!result) throw new Error("Impossible d'ajouter la mission");

        setToast({ type: ToastType.Success, message: 'Mission ajoutée avec succès !' });
      } else if (mission) {
        const updatedMission: Mission = {
          ...mission,
          homeId: selectedHome.id,
          tasks: availableTasks,
          startDateTime: startDate,
          endDateTime: endDate,
          modifiedDate: new Date(),
          allowedEmployees: selectedEmployees.length > 0 ? selectedEmployees : null,
          hours: totalHours,
        };

        // Check if update would create a duplicate
        if (missionExists(updatedMission, mission.id)) throw new Error('Une mission identique existe déjà');

        const result = await updateMission(updatedMission);
        if (!result) throw new Error('Impossible de mettre à jour la mission');

        setToast({ type: ToastType.Success, message: 'Mission mise à jour avec succès !' });
      }
    } catch (error) {
      setToast({ type: ToastType.Error, message: String(error), error });
      setIsSubmitting(false);
    }
  };

  // Get current date/time for min attribute
  const nowString = localISOString(new Date());

  // Handle start date change and update end date if needed
  const handleStartDateChange = (value: string) => {
    // Validate the selected date is not in the past
    const selectedDate = new Date(value);
    const currentDate = new Date();

    if (selectedDate < currentDate) {
      setStartDateTime(nowString);
      setStartDateTimeError('La date de début ne peut pas être antérieure à la date actuelle');
      const timeout = setTimeout(() => setStartDateTimeError(''), 3000);
      return () => clearTimeout(timeout);
    }

    setStartDateTime(value);
    setStartDateTimeError('');

    // Create a new Date object from the selected start date
    const startDate = new Date(value);

    // Add minimum mission time to the start date for the minimum end date
    const minEndDate = new Date(startDate);
    minEndDate.setHours(minEndDate.getHours() + minimumMissionTime);

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
    <>
      <ToastMessage
        toast={toast}
        onClose={() => {
          setToast(undefined);
          if (toast?.type === ToastType.Success) closeAndCancel();
        }}
      />

      <FullScreenModal
        title={mode === 'add' ? 'Ajouter une mission' : 'Modifier la mission'}
        onClose={handleClose}
        disabled={isSubmitting}
        footer={footer}
      >
        <form onSubmit={handleSubmit} className="space-y-2">
          <Combobox
            id="home-select"
            label="Bien"
            ref={homeSelectRef}
            value={homeId}
            onChange={value => handleChange(value, setHomeId, setHomeIdError)}
            options={filteredHomes.map(home => ({
              value: home.id,
              label: home.title,
            }))}
            disabled={isSubmitting || cannotEdit}
            placeholder="Sélectionner un bien"
            error={homeIdError}
            required
          />

          <TaskSelector
            id="task-select"
            label="Tâches"
            ref={taskRef}
            availableTasks={getAvailableTasks(filteredHomes.find(h => h.id === homeId)!, Object.values(Task))}
            selectedTasks={tasks}
            onTasksChange={setTasks}
            error={tasksError}
            setError={setTasksError}
            disabled={isSubmitting || cannotEdit}
            required
          />

          <DateTimeInput
            id="start-date"
            label="Date et heure de début"
            ref={startDateRef}
            value={startDateTime}
            onChange={handleStartDateChange}
            error={startDateTimeError}
            onError={setStartDateTimeError}
            min={nowString}
            disabled={isSubmitting || cannotEdit}
            required
          />

          <DateTimeInput
            id="end-date"
            label="Date et heure de fin"
            ref={endDateRef}
            value={endDateTime}
            onChange={setEndDateTime}
            error={endDateTimeError}
            onError={setEndDateTimeError}
            min={(() => {
              // Calculate minimum end date (start date + 1 hour)
              const startDate = new Date(startDateTime);
              const minEndDate = new Date(startDate);
              minEndDate.setHours(minEndDate.getHours() + 1);
              return localISOString(minEndDate);
            })()}
            disabled={isSubmitting || cannotEdit}
            required
          />

          <div>
            <MultiSelect
              id="prestataires-select"
              label="Prestataires"
              values={selectedEmployees}
              onChange={setSelectedEmployees}
              options={employees.map(emp => ({
                value: getUserKey(emp),
                label: getUserKey(emp),
              }))}
              disabled={isSubmitting || cannotEdit}
              required
              allOption
              tooltip={
                <>
                  {selectedEmployees.length === 0
                    ? 'Tous les prestataires pourront voir cette mission'
                    : 'Seuls les prestataires suivant pourront voir cette mission :'}
                  <ul className="list-disc pl-4">
                    {selectedEmployees.map(employeeId => (
                      <li key={employeeId}>{employeeId}</li>
                    ))}
                  </ul>
                </>
              }
            />
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
    </>
  );
}
