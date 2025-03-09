'use client';

import { clsx } from 'clsx/lite';
import { useEffect, useState } from 'react';
import { useMissions } from '../contexts/missionsProvider';
import { Mission, Objective } from '../types/types';
import { getObjectivesWithPoints } from '../utils/objectiveUtils';
import FormActions from './formActions';
import { ToastMessage, ToastType } from './toastMessage';

type MissionFormProps = {
  mission?: Mission;
  onClose: () => void;
  mode: 'add' | 'edit';
};

export default function MissionForm({ mission, onClose, mode }: MissionFormProps) {
  const { homes, addMission, updateMission, getCurrentConciergerie } = useMissions();

  // Filter homes by the current conciergerie
  const currentConciergerie = getCurrentConciergerie();
  const filteredHomes = homes.filter(home => !home.deleted && home.conciergerieName === currentConciergerie?.name);

  const [homeId, setHomeId] = useState<string>(mission?.homeId || filteredHomes[0]?.id || '');
  const [objectivesState, setObjectives] = useState<Objective[]>(mission?.objectives || []);

  // Get current date and time in local timezone
  const now = new Date();
  const localISOString = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
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
  const [toastMessage, setToastMessage] = useState<{ type: ToastType; message: string }>();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

    if (isFormValid) {
      const selectedHome = filteredHomes.find(h => h.id === homeId);

      if (!selectedHome) {
        setToastMessage({ type: ToastType.Error, message: 'Veuillez sélectionner un bien valide' });
        setTimeout(() => setToastMessage(undefined), 3000);
        return;
      }

      // We'll just use the homeId now instead of embedding the full home object

      // Convert string dates to Date objects
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);

      if (mode === 'add') {
        addMission({
          homeId: selectedHome.id,
          objectives: objectivesState,
          startDateTime: startDate,
          endDateTime: endDate,
        });
        setToastMessage({ type: ToastType.Success, message: 'Mission ajoutée avec succès !' });
      } else if (mission) {
        updateMission({
          ...mission,
          homeId: selectedHome.id,
          objectives: objectivesState,
          startDateTime: startDate,
          endDateTime: endDate,
        });
        setToastMessage({ type: ToastType.Success, message: 'Mission mise à jour avec succès !' });
      }

      setTimeout(() => {
        setToastMessage(undefined);
        onClose();
      }, 1500);
    }
  };

  const toggleObjective = (objective: Objective) => {
    if (objectivesState.includes(objective)) {
      setObjectives(objectivesState.filter(o => o !== objective));
    } else {
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
      {toastMessage && <ToastMessage type={toastMessage.type} message={toastMessage.message} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Bien</label>
          <select
            value={homeId}
            onChange={e => setHomeId(e.target.value)}
            className={clsx(
              'w-full p-2 border rounded-lg bg-background',
              'border-foreground/20 focus-visible:outline-primary',
              isFormSubmitted && !homeId ? 'border-red-500' : 'border-secondary',
            )}
          >
            {filteredHomes.map(home => (
              <option key={home.id} value={home.id}>
                {home.title}
              </option>
            ))}
          </select>
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
                  objectivesState.includes(objective)
                    ? 'bg-primary text-background border-primary'
                    : 'bg-background text-foreground border-secondary',
                )}
              >
                <span>{objective.label}</span>
                <span
                  className={clsx(
                    'px-1.5 py-0.5 rounded-full text-xs',
                    objectivesState.includes(objective)
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

        <FormActions onCancel={onClose} submitText={mode === 'add' ? 'Ajouter' : 'Enregistrer'} submitType="submit" />
      </form>
    </div>
  );
}
