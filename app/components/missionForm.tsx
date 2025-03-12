'use client';

import { clsx } from 'clsx/lite';
import { useCallback, useEffect, useState } from 'react';
import { useMissions } from '../contexts/missionsProvider';
import { Mission, Objective } from '../types/types';
import { getObjectivesWithPoints } from '../utils/objectiveUtils';
import FormActions from './formActions';
import Select from './select';
import { ToastMessage, ToastProps, ToastType } from './toastMessage';

type MissionFormProps = {
  mission?: Mission;
  onClose: () => void;
  mode: 'add' | 'edit';
};

export default function MissionForm({ mission, onClose, mode }: MissionFormProps) {
  const { homes, addMission, updateMission, getCurrentConciergerie, missionExists } = useMissions();

  // Filter homes by the current conciergerie
  const currentConciergerie = getCurrentConciergerie();
  const filteredHomes = homes.filter(home => home.conciergerieName === currentConciergerie?.name);

  const [homeId, setHomeId] = useState<string>(mission?.homeId || filteredHomes[0]?.id || '');
  const [objectivesState, setObjectives] = useState<Objective[]>(mission?.objectives || []);
  const [isFormChanged, setIsFormChanged] = useState(false);

  // Get current date and time in local timezone
  const now = new Date();
  const localISOString = (date: Date) => {
    try {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

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

  // Set up French locale for date inputs
  useEffect(() => {
    // Try to set the locale for date inputs
    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    dateInputs.forEach(input => {
      input.setAttribute('lang', 'fr');
    });

    // Set document language to French
    document.documentElement.lang = 'fr';
  }, []);

  const isFormValid = homeId !== '' && objectivesState.length > 0 && startDateTime !== '' && endDateTime !== '';

  // Check if form has been modified
  const checkFormChanged = useCallback(() => {
    if (mode === 'add' || !mission) return true; // Always enable save button for new missions

    // For edit mode, check if any field has changed
    const objectivesChanged = JSON.stringify(objectivesState) !== JSON.stringify(mission.objectives);
    const homeIdChanged = homeId !== mission.homeId;
    const startDateChanged = startDateTime !== localISOString(mission.startDateTime);
    const endDateChanged = endDateTime !== localISOString(mission.endDateTime);

    return objectivesChanged || homeIdChanged || startDateChanged || endDateChanged;
  }, [homeId, objectivesState, startDateTime, endDateTime, mode, mission]);

  // Update isFormChanged whenever form fields change
  useEffect(() => {
    setIsFormChanged(checkFormChanged());
  }, [checkFormChanged]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

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
        if (missionExists(selectedHome.id, objectivesState, startDate, endDate)) {
          setToastMessage({
            type: ToastType.Warning,
            message: 'Une mission identique existe déjà',
          });
          return;
        }

        const result = addMission({
          homeId: selectedHome.id,
          objectives: objectivesState,
          startDateTime: startDate,
          endDateTime: endDate,
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
          objectives: objectivesState,
          startDateTime: startDate,
          endDateTime: endDate,
          conciergerieName: mission.conciergerieName,
          modifiedDate: new Date(),
          deleted: mission.deleted || false,
        };

        // Check if update would create a duplicate (excluding the current mission)
        if (missionExists(selectedHome.id, objectivesState, startDate, endDate, mission.id)) {
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

  const toggleObjective = (objective: Objective) => {
    // Check if the objective is already in the array by comparing labels
    const objectiveExists = objectivesState.some(o => o.label === objective.label);

    if (objectiveExists) {
      // Remove the objective if it exists
      setObjectives(objectivesState.filter(o => o.label !== objective.label));
    } else {
      // Add the objective if it doesn't exist
      setObjectives([...objectivesState, objective]);
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
    <div className="w-full">
      {toastMessage && (
        <ToastMessage
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => {
            setToastMessage(undefined);
            if (toastMessage.type === ToastType.Success) onClose();
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Bien</label>
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
            borderColor={homeId && currentConciergerie?.color ? currentConciergerie.color : undefined}
          />
          {isFormSubmitted && !homeId && <p className="text-red-500 text-sm mt-1">Veuillez sélectionner un bien</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Objectifs</label>
          <div className="grid grid-cols-2 gap-2">
            {getObjectivesWithPoints().map(objective => (
              <button
                type="button"
                key={objective.label}
                onClick={() => toggleObjective(objective)}
                className={clsx(
                  'p-2 border rounded-lg text-sm flex justify-between items-center',
                  'border-foreground/20 focus-visible:outline-primary',
                  objectivesState.some(o => o.label === objective.label)
                    ? 'bg-primary text-background border-primary'
                    : 'bg-background text-foreground border-secondary',
                )}
              >
                <span>{objective.label}</span>
                <span
                  className={clsx(
                    'px-1.5 py-0.5 rounded-full text-xs',
                    objectivesState.some(o => o.label === objective.label)
                      ? 'bg-background/20 text-background'
                      : 'bg-primary/10 text-primary',
                  )}
                >
                  {objective.points} pt{objective.points !== 1 ? 's' : ''}
                </span>
              </button>
            ))}
          </div>
          {isFormSubmitted && objectivesState.length === 0 && (
            <p className="text-red-500 text-sm mt-1">Veuillez sélectionner au moins un objectif</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Date et heure de début</label>
          <input
            type="datetime-local"
            lang="fr"
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

        <FormActions
          onCancel={onClose}
          submitText={mode === 'add' ? 'Ajouter' : 'Enregistrer'}
          submitType="submit"
          disabled={mode === 'edit' && !isFormChanged}
        />
      </form>
    </div>
  );
}
