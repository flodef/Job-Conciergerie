'use client';

import ErrorPage from '@/app/components/error';
import FormActions from '@/app/components/formActions';
import SearchInput from '@/app/components/searchInput';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { useToast } from '@/app/contexts/toastProvider';
import { cn, textClassName } from '@/app/utils/className';
import { getColorValueByName, setPrimaryColor } from '@/app/utils/color';
import { EmailSender } from '@/app/utils/emailSender';
import { Page } from '@/app/utils/navigation';
import { useEffect, useRef, useState } from 'react';
import AppVersion from './appVersion';

type ConciergerieFormProps = {
  onClose: () => void;
};

export default function ConciergerieForm({ onClose }: ConciergerieFormProps) {
  const { onMenuChange } = useMenuContext();
  const {
    setConciergerieName: setSelectedConciergerieName,
    conciergeries,
    findConciergerie,
    isLoading,
    generateId,
  } = useAuth();

  const conciergerieNameRef = useRef<HTMLDivElement>(null);
  const [conciergerieNameError, setConciergerieNameError] = useState('');
  const errorId = 'conciergerie-error';

  const [conciergerieName, setConciergerieName] = useState(conciergeries?.at(0)?.name || '');
  const [filter, setFilter] = useState('');

  const visibleConciergeries = filter
    ? conciergeries.filter(c => c.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : conciergeries;

  useEffect(() => {
    if (conciergerieName) return;

    const firstName = conciergeries.at(0)?.name;
    if (firstName) setConciergerieName(firstName);
  }, [conciergeries, conciergerieName]);

  const { showToast } = useToast();
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

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Generate userId if not available
      const currentUserId = generateId();

      setSelectedConciergerieName(conciergerieName);

      // Get the selected conciergerie data
      const selectedConciergerie = findConciergerie(conciergerieName);
      if (!selectedConciergerie) throw new Error('Conciergerie non trouvée');
      if (!selectedConciergerie.email) throw new Error('Email de la conciergerie non trouvé');

      EmailSender.sendVerificationEmail(selectedConciergerie, currentUserId).then(ok => {
        showToast({
          type: ok ? ToastType.Success : ToastType.Error,
          message: ok
            ? "L'email de vérification a été envoyé avec succès"
            : "L'email n'a pas pu être envoyé. Veuillez réessayer dans quelques minutes.",
        });
      });

      onMenuChange(Page.Waiting);
    } catch (error) {
      showToast({
        type: ToastType.Error,
        message: String(error),
        error,
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;
  if (!conciergeries?.length) return <ErrorPage message="Aucune conciergerie trouvée !" />;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-background">
      <h2 className="text-3xl font-black mb-4">
        <span className="text-gradient">Conciergerie</span>
      </h2>

      <form onSubmit={handleSubmit} className="w-full max-w-sm px-4 space-y-4">
        {conciergeries.length > 6 && (
          <SearchInput
            value={filter}
            onChange={setFilter}
            placeholder="Rechercher une conciergerie…"
            className="w-full"
          />
        )}
        <div ref={conciergerieNameRef} className="grid grid-cols-2 gap-3" role="group" aria-labelledby={errorId}>
          {visibleConciergeries.map(c => {
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
                  textClassName,
                  'relative flex flex-col items-center gap-2 p-3 border rounded-lg transition-all cursor-pointer',
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
        {filter && visibleConciergeries.length === 0 && (
          <p className="text-sm text-foreground/60 text-center">Aucune conciergerie ne correspond à « {filter} »</p>
        )}
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
