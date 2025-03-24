'use client';

import { sendConciergerieVerificationEmail } from '@/app/actions/email';
import FormActions from '@/app/components/formActions';
import LoadingSpinner from '@/app/components/loadingSpinner';
import Select from '@/app/components/select';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { useTheme } from '@/app/contexts/themeProvider';
import ErrorPage from '@/app/components/error';
import { Conciergerie } from '@/app/types/types';
import { getColorValueByName } from '@/app/utils/color';
import { useEffect, useState } from 'react';
import { Page } from '../utils/navigation';

type ConciergerieFormProps = {
  onClose: () => void;
};

export default function ConciergerieForm({ onClose }: ConciergerieFormProps) {
  const { setPrimaryColor } = useTheme();
  const { onMenuChange } = useMenuContext();
  const {
    isLoading: authLoading,
    userId,
    setSentEmailError,
    setConciergerieName: setSelectedConciergerieName,
    conciergeries,
  } = useAuth();

  const [conciergerieName, setConciergerieName] = useState(conciergeries?.at(0)?.name || '');
  const [toastMessage, setToastMessage] = useState<Toast>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const selectedConciergerie = conciergeries?.find((c: Conciergerie) => c.name === conciergerieName);
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

      if (!userId) throw new Error('User ID not found');

      setSelectedConciergerieName(conciergerieName);

      // Get the selected conciergerie data
      const selectedConciergerie = conciergeries?.find(c => c.name === conciergerieName);
      if (!selectedConciergerie) throw new Error('Conciergerie not found');
      if (!selectedConciergerie.email) throw new Error('Conciergerie email not found');

      const result = await sendConciergerieVerificationEmail(
        selectedConciergerie.email,
        selectedConciergerie.name,
        userId!,
        window.location.origin,
      );
      setSentEmailError(result?.success !== true);

      onMenuChange(Page.Waiting);
    } catch (error) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Une erreur est survenue lors de la mise à jour de la conciergerie',
        error,
      });
      setIsSubmitting(false);
    }
  };

  if (authLoading) return <LoadingSpinner />;

  if (!conciergeries?.length) return <ErrorPage message="Aucune conciergerie trouvée !" />;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
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
            disabled={isSubmitting}
            error={isFormSubmitted && !conciergerieName}
          />
          {isFormSubmitted && !conciergerieName && (
            <p className="text-red-500 text-sm mt-1">Veuillez sélectionner une conciergerie</p>
          )}
        </div>

        <FormActions onCancel={handleClose} submitText="Valider" isSubmitting={isSubmitting} />
      </form>
    </div>
  );
}
