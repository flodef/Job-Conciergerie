'use client';

import Combobox from '@/app/components/combobox';
import FormActions from '@/app/components/formActions';
import FullScreenModal from '@/app/components/fullScreenModal';
import Label from '@/app/components/label';
import MultiSelect from '@/app/components/multiSelect';
import ResponsiveDateTimeInput from '@/app/components/responsiveDateTimeInput';
import Select from '@/app/components/select';
import { useUnsavedChangesConfirmation } from '@/app/hooks/useUnsavedChangesConfirmation';
import TaskSelector from '@/app/components/taskSelector';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useToast } from '@/app/contexts/toastProvider';
import { MAX_TRAVELLERS } from '@/app/homes/components/homeForm';
import { IconUsers } from '@tabler/icons-react';
import type { Mission } from '@/app/types/dataTypes';
import { Task } from '@/app/types/dataTypes';
import type { ErrorField } from '@/app/types/types';
import {
  adjustMissionDateTime,
  getMinEndDate,
  getMinStartDate,
  getMissionDateTime,
  handleMissionEndDateChange,
  handleMissionStartDateChange,
  localISOString,
} from '@/app/utils/date';
import { handleChange } from '@/app/utils/form';
import { range } from '@/app/utils/select';
import { calculateMissionHours, getAvailableTasks } from '@/app/utils/task';
import { getUserKey } from '@/app/utils/user';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn, containerClassName } from '@/app/utils/className';

type MissionFormProps = {
  mission?: Mission;
  onClose: () => void;
  onCancel?: () => void;
  mode: 'add' | 'edit';
  skipAnimation?: boolean;
};

export default function MissionForm({ mission, onClose, onCancel, mode, skipAnimation = false }: MissionFormProps) {
  const { homes, addMission, updateMission, missionExists } = useMissions();
  const { conciergerieName, employees: allEmployees } = useAuth();
  const { showToast } = useToast();

  // Filter homes by the current conciergerie
  const filteredHomes = useMemo(
    () => homes.filter(home => home.conciergerieName === conciergerieName),
    [homes, conciergerieName],
  );

  // Initialize form values
  const [homeId, setHomeId] = useState<string>(mission?.homeId || filteredHomes[0]?.id || '');
  const [missionHours, setMissionHours] = useState(mission?.hours || 0);
  const [tasks, setTasks] = useState<Task[]>(mission?.tasks || (mode === 'add' ? [Task.Cleaning] : []));
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(mission?.allowedEmployees || []);
  const [travellers, setTravellers] = useState(mission?.travellers ?? 1);
  const [initialFormValues, setInitialFormValues] = useState<{
    homeId: string;
    startDateTime: string;
    endDateTime: string;
    tasks: Task[];
    selectedEmployees: string[];
    travellers: number;
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
  const [lastCommittedStart, setLastCommittedStart] = useState<string>(start);
  const [lastCommittedEnd, setLastCommittedEnd] = useState<string>(end);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
        showToast({ type: ToastType.Warning, message });
      }
    }
  }, [mission, mode, showToast]);

  // Calculate mission hours when dependencies change
  useEffect(() => {
    if (homeId && tasks.length > 0) {
      const selectedHome = filteredHomes.find(h => h.id === homeId);
      if (selectedHome) {
        const hours = calculateMissionHours(selectedHome, tasks);
        setMissionHours(hours);
      }
    } else {
      setMissionHours(0);
    }
  }, [homeId, tasks, filteredHomes]);

  // Set up French locale for date inputs
  useEffect(() => {
    setInitialFormValues({
      homeId,
      startDateTime,
      endDateTime,
      tasks,
      selectedEmployees,
      travellers,
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
    const travellersChanged = travellers !== initialFormValues.travellers;

    return tasksChanged || homeIdChanged || startDateChanged || endDateChanged || employeesChanged || travellersChanged;
  }, [homeId, tasks, startDateTime, endDateTime, selectedEmployees, travellers, initialFormValues]);

  const { handleCancel, handleClose } = useUnsavedChangesConfirmation({
    checkFormChanged,
    onClose,
    onCancel,
  });

  const handleSubmit = async () => {
    if (!checkFormChanged()) return;
    let error: ErrorField | undefined;

    if (!homeId.trim())
      error = {
        message: 'Veuillez sélectionner un bien',
        fieldRef: homeSelectRef,
        func: setHomeIdError,
      };
    else if (tasks.length === 0 || missionHours === 0)
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

      // Convert string dates to Date objects
      const { startDateTime: startDate, endDateTime: endDate } = adjustMissionDateTime(startDateTime, endDateTime);

      if (mode === 'add') {
        // Check if a mission with the same criteria already exists
        if (
          missionExists({
            homeId,
            tasks,
            startDateTime: startDate,
            endDateTime: endDate,
          })
        )
          throw new Error('Une mission identique existe déjà');

        const selectedHome = filteredHomes.find(h => h.id === homeId);
        if (!selectedHome) throw new Error('Bien introuvable');

        const result = await addMission({
          homeId,
          tasks,
          startDateTime: startDate,
          endDateTime: endDate,
          allowedEmployees: selectedEmployees.length > 0 ? selectedEmployees : null,
          hours: missionHours,
          employeeId: null,
          status: null,
          allowDuo: selectedHome.allowDuo,
          travellers,
        });
        if (!result) throw new Error("Impossible d'ajouter la mission");

        setIsSuccess(true);
        showToast({ type: ToastType.Success, message: 'Mission ajoutée avec succès !' });
        onClose();
      } else if (mission) {
        const selectedHome = filteredHomes.find(h => h.id === homeId);
        if (!selectedHome) throw new Error('Bien introuvable');

        const updatedMission: Mission = {
          ...mission,
          homeId,
          tasks,
          startDateTime: startDate,
          endDateTime: endDate,
          modifiedDate: new Date(),
          allowedEmployees: selectedEmployees.length > 0 ? selectedEmployees : null,
          hours: missionHours,
          travellers,
        };

        // Check if update would create a duplicate
        if (missionExists(updatedMission, mission.id)) throw new Error('Une mission identique existe déjà');

        const { success, employeeNotified } = await updateMission(updatedMission);
        if (!success) throw new Error('Impossible de mettre à jour la mission');

        setIsSuccess(true);
        showToast({
          type: ToastType.Success,
          message: employeeNotified
            ? 'Mission mise à jour ! Le prestataire a été notifié.'
            : 'Mission mise à jour avec succès !',
        });
        onClose();
      }
    } catch (error) {
      setIsSubmitting(false);
      showToast({ type: ToastType.Error, message: String(error), error });
    }
  };

  // Get current date/time for min attribute
  const nowString = localISOString(new Date());

  // Handle start date change - just update value and end date, no validation
  const handleStartDateChange = (value: string) => {
    const { startDateTime: newStart, endDateTime: newEnd } = handleMissionStartDateChange(
      value,
      startDateTime,
      endDateTime,
    );
    setStartDateTime(newStart);
    setLastCommittedStart(newStart);
    if (newEnd !== endDateTime) {
      setEndDateTime(newEnd);
      setLastCommittedEnd(newEnd);
    }
    if (startDateTimeError) setStartDateTimeError('');
  };

  // Handle start date blur - validate only when leaving the field
  const handleStartDateBlur = (value: string) => {
    // Validate the selected date is not in the past
    const selectedDate = new Date(value);
    const currentDate = new Date();
    currentDate.setSeconds(currentDate.getSeconds() - 59);

    if (selectedDate < currentDate) {
      setStartDateTime(nowString);
      setStartDateTimeError('La date de début ne peut pas être antérieure à la date actuelle');
    } else {
      setStartDateTimeError('');
    }
  };

  // Handle end date change with auto-adjustment of start date
  const handleEndDateChange = (newEndDate: string) => {
    const { startDateTime: newStart, endDateTime: newEnd } = handleMissionEndDateChange(
      newEndDate,
      startDateTime,
      endDateTime,
    );
    setEndDateTime(newEnd);
    setLastCommittedEnd(newEnd);
    if (newStart !== startDateTime) {
      setStartDateTime(newStart);
      setLastCommittedStart(newStart);
    }
    if (endDateTimeError) setEndDateTimeError('');
  };

  const footer = (
    <FormActions
      submitText={mode === 'add' ? 'Ajouter' : 'Enregistrer'}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
      disabled={!checkFormChanged() || !!homeIdError || !!tasksError || !!startDateTimeError || !!endDateTimeError}
      submitType="button"
    />
  );

  return (
    <FullScreenModal
      title={mode === 'add' ? 'Ajouter une mission' : 'Modifier la mission'}
      onClose={handleClose}
      disabled={isSubmitting || isSuccess}
      skipAnimation={skipAnimation}
      footer={!isSuccess ? footer : undefined}
    >
      <form className="space-y-2">
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

        {missionHours > 0 && (
          <div className="mt-2 flex justify-between">
            <div className={containerClassName}>
              Durée estimée :
              <span className="font-bold">
                {missionHours} heure{missionHours > 1 ? 's' : ''}
              </span>
            </div>
            {filteredHomes.find(h => h.id === homeId)?.allowDuo && (
              <div className={containerClassName}>
                <IconUsers size={16} />
                <span className="font-bold">Binôme</span>
              </div>
            )}
          </div>
        )}

        <TaskSelector
          id="task-select"
          label="Tâches"
          ref={taskRef}
          availableTasks={getAvailableTasks(filteredHomes.find(h => h.id === homeId) || undefined, Object.values(Task))}
          selectedTasks={tasks}
          onTasksChange={setTasks}
          error={tasksError}
          setError={setTasksError}
          disabled={isSubmitting || cannotEdit}
          required
        />

        <Select
          id="travellers"
          label="Nombre de voyageurs"
          value={travellers}
          onChange={value => setTravellers(Number(value))}
          options={range(1, filteredHomes.find(h => h.id === homeId)?.maxTravellers || MAX_TRAVELLERS)}
          disabled={isSubmitting || cannotEdit}
          placeholder="Nombre de voyageurs"
          required
        />

        <ResponsiveDateTimeInput
          id="start-date"
          label="Date et heure de début"
          ref={startDateRef}
          value={startDateTime}
          onChange={handleStartDateChange}
          onBlur={handleStartDateBlur}
          onEscape={() => {
            setStartDateTime(lastCommittedStart);
            setEndDateTime(lastCommittedEnd);
          }}
          error={startDateTimeError}
          onError={setStartDateTimeError}
          min={localISOString(getMinStartDate())}
          disabled={isSubmitting || cannotEdit}
          required
        />

        <ResponsiveDateTimeInput
          id="end-date"
          label="Date et heure de fin"
          ref={endDateRef}
          value={endDateTime}
          onChange={handleEndDateChange}
          onEscape={() => {
            setStartDateTime(lastCommittedStart);
            setEndDateTime(lastCommittedEnd);
          }}
          error={endDateTimeError}
          onError={setEndDateTimeError}
          min={localISOString(getMinEndDate())}
          disabled={isSubmitting || cannotEdit}
          required
        />

        <MultiSelect
          id="prestataires-select"
          label="Prestataires autorisés"
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
      </form>
    </FullScreenModal>
  );
}
