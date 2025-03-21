'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { fetchConciergerieByName, updateConciergerieWithUserId } from '@/app/actions/conciergerie';
import LoadingSpinner from '@/app/components/loadingSpinner';
import { useAuth } from '@/app/contexts/authProvider';

export default function IdPage({ params }: { params: Promise<{ id: string }> }) {
  // Use React.use to unwrap the params promise
  const { userId, refreshUserData, selectedConciergerieName } = useAuth();
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const router = useRouter();

  const [error, setError] = useState('');

  useEffect(() => {
    const validateAndUpdateConciergerie = async () => {
      try {
        // Check if the ID in the URL matches the ID in localStorage AND that there is a selected conciergerie in localStorage
        if (!userId || userId !== id || !selectedConciergerieName) {
          router.push('/');
          return;
        }

        // Fetch from the database the ID of the conciergerie whose name is stored in localStorage
        const conciergerie = await fetchConciergerieByName(selectedConciergerieName);
        if (!conciergerie) {
          console.error('Conciergerie not found');
          setError('Conciergerie non trouvée');
          router.push('/');
          return;
        }

        // If the ID fetched is the one in the localStorage, do nothing
        if (conciergerie.id === userId) {
          router.push('/missions');
          return;
        }

        // If the ID fetched is not the one in the localStorage, update it in the database
        const result = await updateConciergerieWithUserId(id, selectedConciergerieName);
        if (result.success) {
          // Refresh user data to update the auth context
          await refreshUserData();

          // Redirect to missions page
          router.push('/missions');
        } else {
          setError(result.message || 'Une erreur est survenue lors de la mise à jour de la conciergerie');
        }
      } catch (error) {
        console.error('Error validating or updating conciergerie:', error);
        setError('Une erreur est survenue lors de la validation ou de la mise à jour de la conciergerie');
      }
    };

    validateAndUpdateConciergerie();
  }, [id, router, refreshUserData, userId, selectedConciergerieName]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {error ? (
        <>
          <div className="text-red-500 mb-4">{error}</div>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-primary text-white rounded-md">
            Retour à l&apos;accueil
          </button>
        </>
      ) : (
        <LoadingSpinner size="large" text="Authentification ..." />
      )}
    </div>
  );
}
