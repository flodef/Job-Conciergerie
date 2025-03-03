'use client';

import { clsx } from 'clsx/lite';
import { useEffect, useState } from 'react';
import { useMissions } from '../contexts/missionsProvider';
import { Mission, Objective, objectives } from '../types/mission';
import { ToastMessage, ToastType } from './toastMessage';

type MissionFormProps = {
  mission?: Mission;
  onClose: () => void;
  mode: 'add' | 'edit';
};

export default function MissionForm({ mission, onClose, mode }: MissionFormProps) {
  const { homes, addMission, updateMission, getCurrentConciergerie } = useMissions();

  // Default mockup image path
  const mockupImagePath = '/home.webp';

  // Filter homes by the current conciergerie
  const currentConciergerie = getCurrentConciergerie();
  const filteredHomes = homes.filter(home => !home.deleted && home.conciergerie?.name === currentConciergerie?.name);

  const [homeId, setHomeId] = useState<string>(mission?.homeId || filteredHomes[0]?.id || '');
  const [objectivesState, setObjectives] = useState<Objective[]>(mission?.objectives || []);
  const [date, setDate] = useState<string>(
    mission?.date
      ? new Date(mission.date.getTime() - mission.date.getTimezoneOffset() * 60000).toISOString().split('T')[0]
      : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
  );
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: ToastType; message: string }>();

  // Set up French locale for date inputs
  useEffect(() => {
    // Try to set the locale for date inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
      input.setAttribute('lang', 'fr');
    });

    // Set document language to French
    document.documentElement.lang = 'fr';
  }, []);

  const isFormValid = homeId !== '' && objectivesState.length > 0 && date !== '';

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

      // Create a copy of the selected home but replace images with mockup
      const homeWithMockupImage = {
        ...selectedHome,
        images: [mockupImagePath],
      };

      if (mode === 'add') {
        addMission({
          homeId,
          home: homeWithMockupImage,
          objectives: objectivesState,
          date: new Date(date),
        });
        setToastMessage({ type: ToastType.Success, message: 'Mission ajoutée avec succès !' });
      } else if (mission) {
        updateMission({
          ...mission,
          homeId,
          home: homeWithMockupImage,
          objectives: objectivesState,
          date: new Date(date),
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

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  return (
    <div className="bg-background p-6 rounded-lg w-full max-w-md">
      {toastMessage && <ToastMessage type={toastMessage.type} message={toastMessage.message} />}

      <h2 className="text-xl font-bold mb-6">{mode === 'add' ? 'Ajouter une mission' : 'Modifier la mission'}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Bien</label>
          <select
            value={homeId}
            onChange={e => setHomeId(e.target.value)}
            className={clsx(
              'w-full p-2 border rounded-lg bg-background',
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
            {objectives.map(objective => (
              <button
                type="button"
                key={objective}
                onClick={() => toggleObjective(objective)}
                className={clsx(
                  'p-2 border rounded-lg text-sm',
                  objectivesState.includes(objective)
                    ? 'bg-primary text-foreground border-primary'
                    : 'bg-background text-foreground border-secondary',
                )}
              >
                {objective}
              </button>
            ))}
          </div>
          {isFormSubmitted && objectivesState.length === 0 && (
            <p className="text-red-500 text-sm mt-1">Veuillez sélectionner au moins un objectif</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Date</label>
          <input
            type="date"
            lang="fr"
            value={date}
            min={today}
            onChange={e => setDate(e.target.value)}
            className={clsx(
              'w-full p-2 border rounded-lg bg-background',
              isFormSubmitted && !date ? 'border-red-500' : 'border-secondary',
            )}
          />
          {isFormSubmitted && !date && <p className="text-red-500 text-sm mt-1">Veuillez sélectionner une date</p>}
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-secondary rounded-lg hover:bg-gray-100">
            Annuler
          </button>
          <button type="submit" className="px-4 py-2 bg-primary text-foreground rounded-lg hover:bg-primary/90">
            {mode === 'add' ? 'Ajouter' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
