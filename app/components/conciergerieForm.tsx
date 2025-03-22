'use client';

import { sendConciergerieVerificationEmail } from '@/app/actions/email';
import FormActions from '@/app/components/formActions';
import LoadingSpinner from '@/app/components/loadingSpinner';
import Select from '@/app/components/select';
import { ToastMessage, ToastProps, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useTheme } from '@/app/contexts/themeProvider';
import { Conciergerie } from '@/app/types/types';
import { getColorValueByName } from '@/app/utils/color';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type ConciergerieFormProps = {
  conciergeries: Conciergerie[];
  onClose: () => void;
};

export default function ConciergerieForm({ conciergeries, onClose }: ConciergerieFormProps) {
  const { setPrimaryColor } = useTheme();
  const {
    isLoading: authLoading,
    userId,
    setSentEmailError,
    setConciergerieName: setSelectedConciergerieName,
  } = useAuth();
  const router = useRouter();

  const [conciergerieName, setConciergerieName] = useState(conciergeries.at(0)?.name || '');
  const [toastMessage, setToastMessage] = useState<ToastProps>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const selectedConciergerie = conciergeries.find((c: Conciergerie) => c.name === conciergerieName);
    const color = getColorValueByName(selectedConciergerie?.colorName);
    setPrimaryColor(color);
  }, [setPrimaryColor, conciergeries, conciergerieName]);

  const handleClose = () => {
    setPrimaryColor(undefined);
    onClose();
  };

  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

    if (!conciergerieName) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez sélectionner une conciergerie',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (!userId) throw new Error('User ID not found, cannot send verification email');

      // Get the selected conciergerie data
      const selectedConciergerie = conciergeries.find(c => c.name === conciergerieName);
      if (!selectedConciergerie) throw new Error('Conciergerie not found');
      if (!selectedConciergerie.email) throw new Error('Conciergerie email not found');

      const result = await sendConciergerieVerificationEmail(
        selectedConciergerie.email,
        selectedConciergerie.name,
        userId!,
        window.location.origin,
      );
      setSentEmailError(result?.success !== true);

      setSelectedConciergerieName(conciergerieName);

      // Redirect to waiting page
      router.push('/waiting');
    } catch (error) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Une erreur est survenue lors de la mise à jour de la conciergerie',
        error,
      });
      setIsSubmitting(false);
    }
  };

  // Show loading spinner while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Chargement..." />
      </div>
    );
  }

  if (!conciergeries.length)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <h2 className="text-2xl font-bold mb-2">Conciergerie</h2>
        <p className="text-foreground">Aucune conciergerie trouvée !</p>
      </div>
    );

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
      <ToastMessage toast={toastMessage} onClose={() => setToastMessage(undefined)} />

      <h2 className="text-2xl font-bold mb-4">Conciergerie</h2>

      <form onSubmit={handleSubmit} className="max-w-64 w-full space-y-4">
        <div>
          <Select
            id="conciergerie"
            value={conciergerieName}
            onChange={setConciergerieName}
            options={conciergeries.map(c => c.name)}
            placeholder="Sélectionnez une conciergerie"
            error={isFormSubmitted && !conciergerieName}
          />
          {isFormSubmitted && !conciergerieName && (
            <p className="text-red-500 text-sm mt-1">Veuillez sélectionner une conciergerie</p>
          )}
        </div>

        <FormActions onCancel={handleClose} submitText="Valider" submitType="submit" isSubmitting={isSubmitting} />
      </form>
    </main>
  );
}
