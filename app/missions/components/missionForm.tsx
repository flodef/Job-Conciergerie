'use client';

import Combobox from '@/app/components/combobox';
import CustomDateTimeInput from '@/app/components/customDateTimeInput';
import FormActions from '@/app/components/formActions';
import FullScreenModal from '@/app/components/fullScreenModal';
import MultiSelect from '@/app/components/multiSelect';
import Select from '@/app/components/select';
import TaskSelector from '@/app/components/taskSelector';
import TextArea from '@/app/components/textArea';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useToast } from '@/app/contexts/toastProvider';
import { MAX_TRAVELLERS } from '@/app/homes/components/homeForm';
import { useUnsavedChangesConfirmation } from '@/app/hooks/useUnsavedChangesConfirmation';
import type { Mission } from '@/app/types/dataTypes';
import { Task } from '@/app/types/dataTypes';
import type { ErrorField, UpdateMode } from '@/app/types/types';
import { containerClassName } from '@/app/utils/className';
import {
  adjustMissionDateTime,
  getMinEndDate,
  getMinStartDate,
  getMissionDateTime,
  handleMissionEndDateChange,
  handleMissionStartDateChange,
  localISOString,
} from '@/app/utils/date';
import { messageLengthRegex } from '@/app/utils/regex';
import { range } from '@/app/utils/select';
import { calculateMissionHours, getAvailableTasks } from '@/app/utils/task';
import { getUserKey } from '@/app/utils/user';
import { IconUsers } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type MissionFormProps = {
  mission?: Mission;
  onClose: () => void;
  onCancel?: () => void;
  onSuccess?: (updatedMission: Mission) => void;
  mode: UpdateMode;
  skipAnimation?: boolean;
  forceRecalc?: boolean;
  onBeforeSubmit?: (isSafeChange: boolean) => Promise<boolean>;
};

export default function MissionForm({
  mission,
  onClose,
  onCancel,
  onSuccess,
  mode,
  skipAnimation = false,
  forceRecalc = false,
  onBeforeSubmit,
}: MissionFormProps) {
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
  const [travellers, setTravellers] = useState<number>(() => {
    if (mode === 'edit' && mission) {
      return mission.travellers;
    }
    // In add mode, use maxTravellers of the first available home
    const firstHome = filteredHomes[0];
    return firstHome?.maxTravellers ?? 1;
  });
  const [conciergerieComment, setConciergerieComment] = useState(mission?.conciergerieComment || '');
  const [initialFormValues, setInitialFormValues] = useState<{
    homeId: string;
    startDateTime: string;
    endDateTime: string;
    tasks: Task[];
    selectedEmployees: string[];
    travellers: number;
    conciergerieComment: string;
  }>();

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
  const [conciergerieCommentError, setConciergerieCommentError] = useState('');

  // Refs for form elements
  const homeSelectRef = useRef<HTMLInputElement>(null);
  const taskRef = useRef<HTMLDivElement>(null);
  const travellersRef = useRef<HTMLInputElement>(null);
  const conciergerieCommentRef = useRef<HTMLTextAreaElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Helper function to reset form to initial values
  const resetFormToInitialValues = useCallback(() => {
    setIsSubmitting(false);
    setIsSuccess(false);
    setHomeIdError('');
    setTasksError('');
    setStartDateTimeError('');
    setEndDateTimeError('');
    setConciergerieCommentError('');
    const { startDateTime: start, endDateTime: end } = getMissionDateTime(mission);
    const initialHomeId = mission?.homeId || filteredHomes[0]?.id || '';
    const initialTasks = mission?.tasks || (mode === 'add' ? [Task.Cleaning] : []);
    const initialSelectedEmployees = mission?.allowedEmployees || [];
    const initialTravellers = mode === 'edit' && mission ? mission.travellers : (filteredHomes[0]?.maxTravellers ?? 1);
    const initialConciergerieComment = mission?.conciergerieComment || '';
    setHomeId(initialHomeId);
    setStartDateTime(start);
    setEndDateTime(end);
    setTasks(initialTasks);
    setSelectedEmployees(initialSelectedEmployees);
    setTravellers(initialTravellers);
    setConciergerieComment(initialConciergerieComment);
    setInitialFormValues({
      homeId: initialHomeId,
      startDateTime: start,
      endDateTime: end,
      tasks: initialTasks,
      selectedEmployees: initialSelectedEmployees,
      travellers: initialTravellers,
      conciergerieComment: initialConciergerieComment,
    });
    const ref = mode === 'add' ? homeSelectRef : taskRef;
    ref?.current?.focus();
  }, [mission, mode, filteredHomes]);

  // Initialize form values on mount
  useEffect(() => {
    resetFormToInitialValues();
  }, [resetFormToInitialValues]);

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

  // Set travellers to max travellers of selected home when home changes (only in add mode)
  useEffect(() => {
    if (mode === 'add') {
      const home = filteredHomes.find(h => h.id === homeId);
      if (home) setTravellers(home.maxTravellers);
    }
  }, [homeId, filteredHomes, mode]);

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
    const conciergerieCommentChanged = conciergerieComment !== initialFormValues.conciergerieComment;

    return (
      tasksChanged ||
      homeIdChanged ||
      startDateChanged ||
      endDateChanged ||
      employeesChanged ||
      travellersChanged ||
      conciergerieCommentChanged
    );
  }, [
    homeId,
    tasks,
    startDateTime,
    endDateTime,
    selectedEmployees,
    travellers,
    conciergerieComment,
    initialFormValues,
  ]);

  const { handleCancel, handleClose } = useUnsavedChangesConfirmation({
    checkFormChanged,
    onClose: () => {
      resetFormToInitialValues();
      onClose();
    },
    onCancel: () => {
      resetFormToInitialValues();
      onCancel?.();
    },
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
      const home = filteredHomes.find(h => h.id === homeId);
      const taskHours = home ? calculateMissionHours(home, tasks) : 1;
      const duration = home?.allowDuo ? taskHours / 2 : taskHours;
      const { startDateTime: startDate, endDateTime: endDate } =
        mode === 'edit'
          ? adjustMissionDateTime(startDateTime, endDateTime, duration)
          : { startDateTime: new Date(startDateTime), endDateTime: new Date(endDateTime) };

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
          conciergerieComment: conciergerieComment || undefined,
        });
        if (!result) throw new Error("Impossible d'ajouter la mission");

        setIsSuccess(true);
        showToast({ type: ToastType.Success, message: 'Mission ajoutée avec succès !' });
        resetFormToInitialValues();
        onClose();
      } else if (mission) {
        const selectedHome = filteredHomes.find(h => h.id === homeId);
        if (!selectedHome) throw new Error('Bien introuvable');

        // Determine if changes are safe (don't require employee removal)
        // Safe changes: date extension (adding hours), travellers change, conciergerie comment change
        const tasksChanged = JSON.stringify(tasks) !== JSON.stringify(mission.tasks);
        const homeIdChanged = homeId !== mission.homeId;
        const startDateChanged = startDateTime !== initialFormValues?.startDateTime;
        const endDateChanged = endDateTime !== initialFormValues?.endDateTime;
        const employeesChanged =
          JSON.stringify(selectedEmployees.sort()) !== JSON.stringify((mission.allowedEmployees || []).sort());
        const travellersChanged = travellers !== mission.travellers;
        const conciergerieCommentChanged = conciergerieComment !== (mission.conciergerieComment || '');

        // Check if date change is an extension (adding time) or reduction
        let isDateExtension = false;
        let isDateReduction = false;
        if (startDateChanged || endDateChanged) {
          const originalStart = new Date(mission.startDateTime);
          const originalEnd = new Date(mission.endDateTime);
          const newStart = startDate;
          const newEnd = endDate;
          const originalDuration = originalEnd.getTime() - originalStart.getTime();
          const newDuration = newEnd.getTime() - newStart.getTime();
          isDateExtension = newDuration > originalDuration;
          isDateReduction = newDuration < originalDuration;
        }

        // Safe changes: only date extension, travellers, or conciergerie comment
        const isSafeChange =
          !tasksChanged &&
          !homeIdChanged &&
          !employeesChanged &&
          (isDateExtension || travellersChanged || conciergerieCommentChanged) &&
          !isDateReduction;

        // Notify parent about safety of changes and wait for confirmation if needed
        if (onBeforeSubmit) {
          const shouldContinue = await onBeforeSubmit(isSafeChange);
          if (!shouldContinue) {
            setIsSubmitting(false);
            return;
          }
        }

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
          conciergerieComment: conciergerieComment || undefined,
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
        if (onSuccess) onSuccess(updatedMission);
        resetFormToInitialValues();
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
    const home = filteredHomes.find(h => h.id === homeId);
    const taskHours = home ? calculateMissionHours(home, tasks) : 1;
    const duration = home?.allowDuo ? taskHours / 2 : taskHours;
    const { startDateTime: newStart, endDateTime: newEnd } = handleMissionStartDateChange(
      value,
      startDateTime,
      endDateTime,
      duration,
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
    const home = filteredHomes.find(h => h.id === homeId);
    const taskHours = home ? calculateMissionHours(home, tasks) : 1;
    const duration = home?.allowDuo ? taskHours / 2 : taskHours;
    const { startDateTime: newStart, endDateTime: newEnd } = handleMissionEndDateChange(
      newEndDate,
      startDateTime,
      endDateTime,
      duration,
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
        {mode === 'add' && (
          <Combobox
            id="home-select"
            label="Bien"
            ref={homeSelectRef}
            value={homeId}
            onChange={setHomeId}
            options={filteredHomes.map(home => ({
              value: home.id,
              label: home.title,
            }))}
            disabled={isSubmitting}
            placeholder="Sélectionner un bien"
            error={homeIdError}
            onError={setHomeIdError}
            required
          />
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
          disabled={isSubmitting}
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

        <Select
          id="travellers"
          label="Nombre de voyageurs"
          className="max-w-20"
          ref={travellersRef}
          value={travellers}
          onChange={value => setTravellers(Number(value))}
          options={range(0, filteredHomes.find(h => h.id === homeId)?.maxTravellers || MAX_TRAVELLERS)}
          disabled={isSubmitting}
          placeholder="Nombre de voyageurs"
          required
          row
          tooltip={
            travellers === 0
              ? '0 signifie que le nombre de voyageurs est inconnu et ne sera pas précisé dans la mission'
              : undefined
          }
        />

        <CustomDateTimeInput
          id="start-date"
          label="Début"
          className="w-60"
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
          disabled={isSubmitting}
          required
          row
        />

        <CustomDateTimeInput
          id="end-date"
          label="Fin"
          className="w-60"
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
          disabled={isSubmitting}
          required
          row
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
          disabled={isSubmitting}
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

        <TextArea
          id="conciergerie-comment"
          label="Commentaire conciergerie"
          ref={conciergerieCommentRef}
          value={conciergerieComment}
          onChange={setConciergerieComment}
          error={conciergerieCommentError}
          onError={setConciergerieCommentError}
          disabled={isSubmitting}
          placeholder="Exemples : informations spécifiques, consignes particulières..."
          forceRecalc={forceRecalc}
          regex={messageLengthRegex}
        />
      </form>
    </FullScreenModal>
  );
}
