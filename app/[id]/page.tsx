'use client';

import { updateConciergerieWithUserId } from '@/app/actions/conciergerie';
import LoadingSpinner from '@/app/components/loadingSpinner';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import ErrorPage from '@/app/components/error';
import { Page } from '@/app/utils/navigation';
import { use, useEffect, useState } from 'react';

export default function IdPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId, conciergerieName, isLoading, updateUserData } = useAuth();
  const { getConciergerieByName } = useMissions();
  const { onMenuChange } = useMenuContext();

  // Use React.use to unwrap the params promise
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const [error, setError] = useState('');

  useEffect(() => {
    const validateAndUpdateConciergerie = async () => {
      try {
        // Check if the ID in the URL matches the ID in localStorage AND that there is a conciergerie name in localStorage
        if (!userId || userId !== id || !conciergerieName) {
          setError('Identifiant non trouvée ou incorrect. Veuillez vous reconnecter.');
          return;
        }

        // Check if the conciergerie whose name is stored in localStorage exists in the database
        const conciergerie = getConciergerieByName(conciergerieName);
        if (!conciergerie) {
          setError('Conciergerie non trouvée. Veuillez vous reconnecter.');
          return;
        }

        // If the ID fetched is not the one in the localStorage, update it in the database
        if (conciergerie.id !== userId) {
          const result = await updateConciergerieWithUserId(id, conciergerie.id);
          if (!result?.success) throw new Error(result?.message);
          updateUserData({
            ...conciergerie,
            id: userId,
          });
        }

        onMenuChange(Page.Missions);
      } catch (error) {
        console.error('Error validating or updating conciergerie:', error);
        setError('Une erreur est survenue lors de la validation ou de la mise à jour de la conciergerie');
      }
    };

    validateAndUpdateConciergerie();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingSpinner />;

  return error && <ErrorPage message={error} />;
}
