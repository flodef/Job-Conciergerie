'use client';

import { sendConciergerieVerificationEmail } from '@/app/actions/email';
import FormActions from '@/app/components/formActions';
import LoadingSpinner from '@/app/components/loadingSpinner';
import Select from '@/app/components/select';
import { ToastMessage, ToastProps, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useTheme } from '@/app/contexts/themeProvider';
import { Conciergerie } from '@/app/types/types';
import { getColorValueByName } from '@/app/utils/colorUtil';
import { useCallback, useEffect, useState } from 'react';

type ConciergerieFormProps = {
  conciergeries: Conciergerie[];
  onClose: () => void;
};

export default function ConciergerieForm({ conciergeries, onClose }: ConciergerieFormProps) {
  const { setPrimaryColor, resetPrimaryColor } = useTheme();
  const { selectedConciergerieName, setSelectedConciergerieName, isLoading: authLoading, userId } = useAuth();

  const [toastMessage, setToastMessage] = useState<ToastProps>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const selectedConciergerie = conciergeries.find((c: Conciergerie) => c.name === selectedConciergerieName);
    const color = getColorValueByName(selectedConciergerie?.colorName);
    setPrimaryColor(color);
  }, [selectedConciergerieName, setPrimaryColor, conciergeries]);

  const selectConciergerie = useCallback(
    (conciergerieName?: string) => {
      if (!conciergeries.length) return;

      const selectedConciergerie =
        conciergeries.find((c: Conciergerie) => c.name === conciergerieName) || conciergeries[0];
      setSelectedConciergerieName(selectedConciergerie.name);
    },
    [conciergeries, setSelectedConciergerieName],
  );

  const handleClose = () => {
    setSelectedConciergerieName(undefined);
    resetPrimaryColor();
    onClose();
  };

  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

    if (!selectedConciergerieName) {
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
      const selectedConciergerie = conciergeries.find(c => c.name === selectedConciergerieName);
      if (!selectedConciergerie) throw new Error('Conciergerie not found');
      if (!selectedConciergerie.email) throw new Error('Conciergerie email not found');

      try {
        const result = await sendConciergerieVerificationEmail(
          selectedConciergerie.email,
          selectedConciergerie.name,
          userId!,
        );
        if (result && !result.success) {
          console.error('Failed to send notification email to conciergerie:', result.error);
        }
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
      }

      // Redirect to waiting page
      window.location.href = '/waiting';
    } catch (error) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Une erreur est survenue lors de la mise à jour de la conciergerie',
        error,
      });
    } finally {
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
      <h2 className="text-2xl font-bold mb-4">Conciergerie</h2>

      <ToastMessage toast={toastMessage} onClose={() => setToastMessage(undefined)} />

      <form onSubmit={handleSubmit} className="max-w-64 w-full space-y-4">
        <div>
          <Select
            id="conciergerie"
            value={selectedConciergerieName || ''}
            onChange={selectConciergerie}
            options={conciergeries.map(c => c.name)}
            placeholder="Sélectionnez une conciergerie"
            error={isFormSubmitted && !selectedConciergerieName}
          />
          {isFormSubmitted && !selectedConciergerieName && (
            <p className="text-red-500 text-sm mt-1">Veuillez sélectionner une conciergerie</p>
          )}
        </div>

        <FormActions onCancel={handleClose} submitText="Valider" submitType="submit" isSubmitting={isSubmitting} />
      </form>
    </div>
  );
}
