'use client';

import { updateConciergerieWithUserId } from '@/app/actions/conciergerie';
import { updateEmployeeWithUserId } from '@/app/actions/employee';
import ConfirmationModal from '@/app/components/confirmationModal';
import ErrorPage from '@/app/components/error';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import type { Conciergerie, Employee } from '@/app/types/dataTypes';
import { Page } from '@/app/utils/navigation';
import AppVersion from '@/app/components/appVersion';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { formatId, getDevices, MAX_DEVICES, MaxDevicesError } from '../utils/id';

type PendingUpdate =
  | { kind: 'employee'; entity: Employee; oldestId: string }
  | { kind: 'conciergerie'; entity: Conciergerie; oldestId: string };

export default function IdPage({ params }: { params: Promise<{ id: string }> }) {
  const {
    userId,
    isEmployee,
    isConciergerie,
    employeeName,
    conciergerieName,
    isLoading,
    updateUserData,
    findEmployee,
    findConciergerie,
  } = useAuth();
  const { onMenuChange } = useMenuContext();

  // Use React.use to unwrap the params promise
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const [error, setError] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null);

  const applyUpdate = useCallback(
    async (entity: Employee | Conciergerie, evictOldest: boolean) => {
      if (!userId) throw new Error('Identifiant non trouvé');
      const newIds = getDevices(entity.id, userId, false, evictOldest);
      const result = isEmployee
        ? await updateEmployeeWithUserId(entity as Employee, newIds)
        : await updateConciergerieWithUserId(entity as Conciergerie, newIds);
      if (!result) throw new Error('Erreur lors de la mise à jour dans la base de données');
      updateUserData({ ...entity, id: result });
    },
    [userId, updateUserData, isEmployee],
  );

  const isFetching = useRef(false);
  useEffect(() => {
    const validateAndUpdateConciergerie = async () => {
      try {
        isFetching.current = true;

        // Check if the ID in the URL matches the ID in localStorage AND that there is a conciergerie name in localStorage
        if (!userId || userId !== id)
          throw new Error('Identifiant non trouvée ou incorrect. Veuillez vous reconnecter.');

        // Check if the conciergerie or employee whose name is stored in localStorage exists in the database
        if (isEmployee) {
          const employee = findEmployee(employeeName);
          if (!employee) throw new Error('Prestataire non trouvée. Veuillez vous reconnecter.');

          // If the ID fetched is not the one in the localStorage, update it in the database
          if (!employee.id.includes(userId)) {
            try {
              await applyUpdate(employee, false);
            } catch (err) {
              if (err instanceof MaxDevicesError) {
                setPendingUpdate({ kind: 'employee', entity: employee, oldestId: err.oldestDevice });
                return;
              }
              throw err;
            }
          }
        } else if (isConciergerie) {
          const conciergerie = findConciergerie(conciergerieName);
          if (!conciergerie) throw new Error('Conciergerie non trouvée. Veuillez vous reconnecter.');

          // If the ID fetched is not the one in the localStorage, update it in the database
          if (!conciergerie.id.includes(userId)) {
            try {
              await applyUpdate(conciergerie, false);
            } catch (err) {
              if (err instanceof MaxDevicesError) {
                setPendingUpdate({ kind: 'conciergerie', entity: conciergerie, oldestId: err.oldestDevice });
                return;
              }
              throw err;
            }
          }
        } else {
          throw new Error("Type d'utilisateur non reconnu");
        }

        onMenuChange(Page.Missions);
      } catch (error) {
        console.error('Error validating conciergerie:', error);
        setError(
          error instanceof Error ? error.message : 'Une erreur est survenue lors de la validation de la conciergerie',
        );
      }
    };

    if (!isLoading && !isFetching.current) validateAndUpdateConciergerie();
  }, [
    id,
    userId,
    isEmployee,
    isConciergerie,
    employeeName,
    conciergerieName,
    isLoading,
    onMenuChange,
    findEmployee,
    findConciergerie,
    applyUpdate,
  ]);

  const handleConfirmEviction = () => {
    if (!pendingUpdate) return;
    const update = pendingUpdate;
    setPendingUpdate(null);
    const promise = applyUpdate(update.entity, true);
    promise
      .then(() => onMenuChange(Page.Missions))
      .catch(err => setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour'));
  };

  const handleCancelEviction = () => {
    setPendingUpdate(null);
    setError("Connexion annulée. L'appareil n'a pas été enregistré.");
  };

  return (
    <div className="min-h-full flex flex-col">
      {error && <ErrorPage message={error} />}
      <ConfirmationModal
        isOpen={!!pendingUpdate}
        onConfirm={handleConfirmEviction}
        onCancel={handleCancelEviction}
        title="Limite d'appareils atteinte"
        message={`Vous avez déjà ${MAX_DEVICES} appareils connectés. Si vous continuez, le plus ancien (${
          pendingUpdate ? formatId(pendingUpdate.oldestId) : ''
        }) sera déconnecté pour permettre l'enregistrement de cet appareil.`}
        confirmText="Continuer"
        cancelText="Annuler"
        isDangerous
      />
      <AppVersion />
    </div>
  );
}
