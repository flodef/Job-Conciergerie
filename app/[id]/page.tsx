'use client';

import { updateConciergerieWithUserId } from '@/app/actions/conciergerie';
import ErrorPage from '@/app/components/error';
import LoadingSpinner from '@/app/components/loadingSpinner';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { Page } from '@/app/utils/navigation';
import { use, useEffect, useState } from 'react';

export default function IdPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId, conciergerieName, conciergeries, isLoading, updateUserData } = useAuth();
  const { onMenuChange } = useMenuContext();

  // Use React.use to unwrap the params promise
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const [error, setError] = useState('');

  useEffect(() => {
    const validateAndUpdateConciergerie = async () => {
      try {
        // Check if the ID in the URL matches the ID in localStorage AND that there is a conciergerie name in localStorage
        if (!userId || userId !== id || !conciergerieName)
          throw new Error('Identifiant non trouvée ou incorrect. Veuillez vous reconnecter.');

        // Check if the conciergerie whose name is stored in localStorage exists in the database
        const conciergerie = conciergeries.find(c => c.name === conciergerieName);
        if (!conciergerie) throw new Error('Conciergerie non trouvée. Veuillez vous reconnecter.');

        // If the ID fetched is not the one in the localStorage, update it in the database
        if (conciergerie.id !== userId) {
          const result = await updateConciergerieWithUserId(id, conciergerie.id);
          if (!result) throw new Error('Erreur lors de la mise à jour dans la base de données');
          updateUserData({
            ...conciergerie,
            id: userId,
          });
        }

        onMenuChange(Page.Missions);
      } catch (error) {
        console.error('Error validating conciergerie:', error);
        setError('Une erreur est survenue lors de la validation de la conciergerie');
      }
    };

    if (!isLoading) validateAndUpdateConciergerie();
  }, [id, conciergerieName, conciergeries, isLoading, userId, updateUserData, onMenuChange]);

  if (isLoading) return <LoadingSpinner />;

  return error && <ErrorPage message={error} />;
}
