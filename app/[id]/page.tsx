'use client';

import { updateConciergerieWithUserId } from '@/app/actions/conciergerie';
import LoadingSpinner from '@/app/components/loadingSpinner';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { Page } from '@/app/utils/navigation';
import { use, useEffect, useState, useTransition } from 'react';

export default function IdPage({ params }: { params: Promise<{ id: string }> }) {
  // Use React.use to unwrap the params promise
  const [isPending, startTransition] = useTransition();
  const { userId, refreshData, conciergerieName, isLoading } = useAuth();
  const { getConciergerieByName } = useMissions();
  const { onMenuChange } = useMenuContext();

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

        // If the ID fetched is the one in the localStorage, do nothing
        if (conciergerie.id === userId) {
          onMenuChange(Page.Missions);
          return;
        }

        // If the ID fetched is not the one in the localStorage, update it in the database
        const result = await updateConciergerieWithUserId(id, conciergerieName);
        if (result?.success) {
          // Refresh user data to update the auth context and redirect to missions page
          refreshData(Page.Missions);
        } else {
          throw new Error(result?.message);
        }
      } catch (error) {
        console.error('Error validating or updating conciergerie:', error);
        setError('Une erreur est survenue lors de la validation ou de la mise à jour de la conciergerie');
      }
    };

    startTransition(() => {
      validateAndUpdateConciergerie();
    });
  }, [id, refreshData, userId, conciergerieName, onMenuChange, getConciergerieByName]);

  if (isLoading || isPending) return <LoadingSpinner />;

  return (
    error && (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-red-500 text-2xl text-center mb-4">{error}</div>
        <button onClick={() => onMenuChange()} className="px-4 py-2 bg-primary text-white rounded-md">
          Retour à l&apos;accueil
        </button>
      </div>
    )
  );
}
