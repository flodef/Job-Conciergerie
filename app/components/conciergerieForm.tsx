'use client';

import ErrorPage from '@/app/components/error';
import FormActions from '@/app/components/formActions';
import LoadingSpinner from '@/app/components/loadingSpinner';
import Select from '@/app/components/select';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { Conciergerie, ErrorField } from '@/app/types/types';
import { errorClassName } from '@/app/utils/className';
import { getColorValueByName, setPrimaryColor } from '@/app/utils/color';
import { sendConciergerieVerificationEmail } from '@/app/utils/email';
import { Page } from '@/app/utils/navigation';
import { useEffect, useRef, useState } from 'react';

type ConciergerieFormProps = {
  onClose: () => void;
};

export default function ConciergerieForm({ onClose }: ConciergerieFormProps) {
  const { onMenuChange } = useMenuContext();
  const {
    isLoading: authLoading,
    userId,
    setSentEmailError,
    setConciergerieName: setSelectedConciergerieName,
    conciergeries,
  } = useAuth();

  const conciergerieNameRef = useRef<HTMLDivElement>(null);
  const [conciergerieNameError, setConciergerieNameError] = useState('');

  const [conciergerieName, setConciergerieName] = useState(conciergeries?.at(0)?.name || '');
  const [toastMessage, setToastMessage] = useState<Toast>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const selectedConciergerie = conciergeries?.find((c: Conciergerie) => c.name === conciergerieName);
    const color = getColorValueByName(selectedConciergerie?.colorName);
    setPrimaryColor(color);
  }, [conciergeries, conciergerieName]);

  const handleClose = () => {
    setPrimaryColor(undefined);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let error: ErrorField | undefined;

    if (!conciergerieName?.trim())
      error = {
        message: 'Veuillez sélectionner une conciergerie',
        fieldRef: conciergerieNameRef,
        func: setConciergerieNameError,
      };

    try {
      setIsSubmitting(true);

      if (error) {
        error.fieldRef.current?.focus();
        error.func(error.message);
        throw new Error(error.message);
      }

      if (!userId) throw new Error("L'identifiant n'est pas défini");

      setSelectedConciergerieName(conciergerieName);

      // Get the selected conciergerie data
      const selectedConciergerie = conciergeries?.find(c => c.name === conciergerieName);
      if (!selectedConciergerie) throw new Error('Conciergerie non trouvée');
      if (!selectedConciergerie.email) throw new Error('Email de la conciergerie non trouvé');

      const isEmailSent = await sendConciergerieVerificationEmail(
        selectedConciergerie.email,
        selectedConciergerie.name,
        userId,
        window.location.origin,
      );
      setSentEmailError(isEmailSent || undefined);

      onMenuChange(Page.Waiting);
    } catch (error) {
      setToastMessage({
        type: ToastType.Error,
        message: String(error),
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
            ref={conciergerieNameRef}
            value={conciergerieName}
            onChange={setConciergerieName}
            options={conciergeries.map(c => c.name)}
            disabled={isSubmitting}
            placeholder="Sélectionnez une conciergerie"
            error={conciergerieNameError}
          />
          {!!conciergerieNameError && <p className={errorClassName}>{conciergerieNameError}</p>}
        </div>

        <FormActions onCancel={handleClose} submitText="Valider" isSubmitting={isSubmitting} />
      </form>
    </div>
  );
}
