'use client';

import ErrorPage from '@/app/components/error';
import FormActions from '@/app/components/formActions';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { cn } from '@/app/utils/className';
import { getColorValueByName, setPrimaryColor } from '@/app/utils/color';
import { EmailSender } from '@/app/utils/emailSender';
import { Page } from '@/app/utils/navigation';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import AppVersion from './appVersion';

type ConciergerieFormProps = {
  onClose: () => void;
};

export default function ConciergerieForm({ onClose }: ConciergerieFormProps) {
  const { onMenuChange } = useMenuContext();
  const { userId, setConciergerieName: setSelectedConciergerieName, conciergeries, findConciergerie } = useAuth();

  const conciergerieNameRef = useRef<HTMLDivElement>(null);
  const [conciergerieNameError, setConciergerieNameError] = useState('');
  const errorId = 'conciergerie-error';

  const [conciergerieName, setConciergerieName] = useState(conciergeries?.at(0)?.name || '');
  const [toast, setToast] = useState<Toast>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const selectedConciergerie = findConciergerie(conciergerieName);
    const color = getColorValueByName(selectedConciergerie?.colorName);
    setPrimaryColor(color);
  }, [conciergerieName, findConciergerie]);

  const handleClose = () => {
    setPrimaryColor(undefined);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      if (!conciergerieName?.trim()) {
        conciergerieNameRef.current?.focus();
        setConciergerieNameError('Veuillez sélectionner une conciergerie');
        throw new Error('Veuillez sélectionner une conciergerie');
      }

      if (!userId) throw new Error("L'identifiant n'est pas défini");

      setSelectedConciergerieName(conciergerieName);

      // Get the selected conciergerie data
      const selectedConciergerie = findConciergerie(conciergerieName);
      if (!selectedConciergerie) throw new Error('Conciergerie non trouvée');
      if (!selectedConciergerie.email) throw new Error('Email de la conciergerie non trouvé');

      EmailSender.sendVerificationEmail({ setToast, showSuccessToast: true }, selectedConciergerie, userId);

      onMenuChange(Page.Waiting);
    } catch (error) {
      setToast({
        type: ToastType.Error,
        message: String(error),
        error,
      });
      setIsSubmitting(false);
    }
  };

  if (!conciergeries?.length) return <ErrorPage message="Aucune conciergerie trouvée !" />;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-background">
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />

      <h2 className="text-2xl font-bold mb-4">Conciergerie</h2>

      <form onSubmit={handleSubmit} className="w-full max-w-sm px-4 space-y-4">
        <div ref={conciergerieNameRef} className="grid grid-cols-2 gap-3" role="group" aria-labelledby={errorId}>
          {conciergeries.map(c => {
            const color = getColorValueByName(c.colorName);
            const isSelected = conciergerieName === c.name;
            return (
              <button
                key={c.name}
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setConciergerieName(c.name);
                  setConciergerieNameError('');
                }}
                className={cn(
                  'relative flex flex-col items-center gap-2 p-3 border rounded-lg transition-all text-sm font-medium',
                  isSelected
                    ? 'ring-2 ring-(--btn-color) border-(--btn-color)'
                    : 'border-secondary hover:bg-secondary/10',
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                )}
                style={{ '--btn-color': color } as React.CSSProperties}
              >
                <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-center leading-tight">{c.name}</span>
              </button>
            );
          })}
        </div>
        {conciergerieNameError && (
          <p id={errorId} className="text-sm text-red-500">
            {conciergerieNameError}
          </p>
        )}

        <FormActions onCancel={handleClose} submitText="Valider" isSubmitting={isSubmitting} />
      </form>

      <AppVersion />
    </div>
  );
}
