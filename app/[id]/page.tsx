'use client';

import { updateConciergerieWithUserId } from '@/app/actions/conciergerie';
import { updateEmployeeWithUserId } from '@/app/actions/employee';
import ErrorPage from '@/app/components/error';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { Page } from '@/app/utils/navigation';
import { use, useEffect, useRef, useState } from 'react';
import { getDevices } from '../utils/id';

export default function IdPage({ params }: { params: Promise<{ id: string }> }) {
  const {
    userId,
    userType,
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

  const isFetching = useRef(false);
  useEffect(() => {
    const validateAndUpdateConciergerie = async () => {
      try {
        isFetching.current = true;

        // Check if the ID in the URL matches the ID in localStorage AND that there is a conciergerie name in localStorage
        if (!userId || userId !== id)
          throw new Error('Identifiant non trouvée ou incorrect. Veuillez vous reconnecter.');

        // Check if the conciergerie or employee whose name is stored in localStorage exists in the database
        if (userType === 'employee') {
          const employee = findEmployee(employeeName);
          if (!employee) throw new Error('Prestataire non trouvée. Veuillez vous reconnecter.');

          // If the ID fetched is not the one in the localStorage, update it in the database
          if (!employee.id.includes(userId)) {
            const newIds = getDevices(employee.id, userId);
            const result = await updateEmployeeWithUserId(employee, newIds);
            if (!result) throw new Error('Erreur lors de la mise à jour dans la base de données');
            updateUserData({
              ...employee,
              id: result,
            });
          }
        } else if (userType === 'conciergerie') {
          const conciergerie = findConciergerie(conciergerieName);
          if (!conciergerie) throw new Error('Conciergerie non trouvée. Veuillez vous reconnecter.');

          // If the ID fetched is not the one in the localStorage, update it in the database
          if (!conciergerie.id.includes(userId)) {
            const newIds = getDevices(conciergerie.id, userId);
            const result = await updateConciergerieWithUserId(conciergerie, newIds);
            if (!result) throw new Error('Erreur lors de la mise à jour dans la base de données');
            updateUserData({
              ...conciergerie,
              id: result,
            });
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
    userType,
    employeeName,
    conciergerieName,
    isLoading,
    updateUserData,
    onMenuChange,
    findEmployee,
    findConciergerie,
  ]);

  return error && <ErrorPage message={error} />;
}
