'use client';

import { enrollConciergerieDevice } from '@/app/actions/conciergerie';
import { enrollEmployeeDevice } from '@/app/actions/employee';
import ConfirmationModal from '@/app/components/confirmationModal';
import ErrorPage from '@/app/components/error';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import type { Conciergerie, Employee } from '@/app/types/dataTypes';
import { Page } from '@/app/utils/navigation';
import AppVersion from '@/app/components/appVersion';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { formatId, MAX_DEVICES, MaxDevicesError } from '../utils/id';

type PendingUpdate =
  | { kind: 'employee'; entity: Employee; oldestId: string }
  | { kind: 'conciergerie'; entity: Conciergerie; oldestId: string };

export default function IdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const {
    userId,
    userIdHash,
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
  const unwrappedSearchParams = use(searchParams);
  const { id } = unwrappedParams;
  const token = unwrappedSearchParams.t;
  const [error, setError] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null);

  const applyUpdate = useCallback(
    async (entity: Employee | Conciergerie, evictOldest: boolean) => {
      if (!userId) throw new Error('Identifiant non trouvé');
      const result = isEmployee
        ? await enrollEmployeeDevice(
            (entity as Employee).firstName,
            (entity as Employee).familyName,
            evictOldest,
            token,
          )
        : await enrollConciergerieDevice((entity as Conciergerie).name, evictOldest, token);
      if (!result.ok) {
        if (result.reason === 'max_devices') throw new MaxDevicesError(result.oldestDevice ?? '');
        if (result.reason === 'rate_limited')
          throw new Error('Trop de tentatives. Veuillez réessayer dans quelques minutes.');
        throw new Error('Erreur lors de la mise à jour dans la base de données');
      }
      updateUserData({ ...entity, id: result.ids });
      return result.pending;
    },
    [userId, updateUserData, isEmployee, token],
  );

  const isFetching = useRef(false);
  useEffect(() => {
    const validateAndUpdateConciergerie = async () => {
      try {
        isFetching.current = true;

        // Check if the ID in the URL matches the ID in localStorage AND that there is a conciergerie name in localStorage
        if (!userId || userId !== id)
          throw new Error('Identifiant non trouvée ou incorrect. Veuillez vous reconnecter.');

        // Wait for the async sha256 of userId to resolve — comparing before
        // would spuriously trigger applyUpdate (double enroll per mount, and
        // each call consumes the per-device enrollment rate limit). '' means
        // "hash unavailable (non-secure context)" — proceed on raw compare.
        if (userIdHash === undefined) {
          isFetching.current = false;
          return;
        }

        let pending = false;

        // Check if the conciergerie or employee whose name is stored in localStorage exists in the database
        if (isEmployee) {
          const employee = findEmployee(employeeName);
          if (!employee) throw new Error('Prestataire non trouvée. Veuillez vous reconnecter.');

          // If the ID fetched is not the one in the localStorage, update it in the database
          // (stored ids are hashed at rest — match raw or hash, transition-safe)
          if (!employee.id.includes(userId) && !(userIdHash && employee.id.includes(userIdHash))) {
            try {
              pending = (await applyUpdate(employee, false)) ?? false;
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
          if (!conciergerie.id.includes(userId) && !(userIdHash && conciergerie.id.includes(userIdHash))) {
            try {
              pending = (await applyUpdate(conciergerie, false)) ?? false;
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

        // A pending device waits for approval; a connected one goes to the app
        onMenuChange(pending ? Page.Waiting : Page.Missions);
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
    userIdHash,
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
      .then(pending => onMenuChange(pending ? Page.Waiting : Page.Missions))
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
