'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchConciergeries } from '../actions/conciergerie';
import { useAuth } from '../contexts/authProvider';
import { useTheme } from '../contexts/themeProvider';
import { Conciergerie } from '../types/types';
import { getColorValueByName } from '../utils/welcomeParams';
import FormActions from './formActions';
import Select from './select';
import { ToastMessage, ToastProps, ToastType } from './toastMessage';

type ConciergerieFormProps = {
  conciergerieNames: string[];
  onClose: () => void;
};

export default function ConciergerieForm({ conciergerieNames, onClose }: ConciergerieFormProps) {
  const { setPrimaryColor, resetPrimaryColor } = useTheme();
  const { refreshUserData, conciergerieData, selectedConciergerieName, setSelectedConciergerieName } = useAuth();

  const [toastMessage, setToastMessage] = useState<ToastProps>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allConciergeries, setAllConciergeries] = useState<Conciergerie[]>([]);

  // Fetch all conciergeries on component mount
  useEffect(() => {
    const loadConciergeries = async () => {
      try {
        const conciergeries = await fetchConciergeries();
        setAllConciergeries(conciergeries);
      } catch (error) {
        console.error('Error fetching conciergeries:', error);
      }
    };

    loadConciergeries();
  }, []);

  const selectConciergerie = useCallback(
    (conciergerieName?: string) => {
      if (!allConciergeries.length) return;

      const selectedConciergerie =
        allConciergeries.find((c: Conciergerie) => c.name === conciergerieName) || allConciergeries[0];
      setSelectedConciergerieName(selectedConciergerie.name);

      // Get color value based on colorName
      const colorValue = getColorValueByName(selectedConciergerie.colorName);

      // Set the primary color theme
      if (colorValue) {
        setPrimaryColor(colorValue);
      }
    },
    [allConciergeries, setPrimaryColor, setSelectedConciergerieName],
  );

  // Update selected company data when name changes
  useEffect(() => {
    selectConciergerie(conciergerieData?.name);
  }, [selectConciergerie, conciergerieData]);

  const handleClose = () => {
    resetPrimaryColor();
    onClose();
  };

  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

    if (!conciergerieData?.name) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez sélectionner une conciergerie',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: send request email to conciergerie

      // Refresh user data to update the auth context
      refreshUserData();

      window.location.href = '/waiting';
    } catch (error) {
      console.error('Error updating conciergerie:', error);
      setToastMessage({
        type: ToastType.Error,
        message: 'Une erreur est survenue lors de la mise à jour de la conciergerie',
      });
      setIsSubmitting(false);
    }
  };

  if (!allConciergeries.length)
    return (
      <div>
        <h2 className="text-2xl font-bold mb-2">Conciergerie</h2>
        <p className="text-foreground">Aucune conciergerie trouvée !</p>
      </div>
    );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Conciergerie</h2>

      {toastMessage && (
        <ToastMessage
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => setToastMessage(undefined)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="conciergerie" className="block text-sm font-medium text-foreground mb-1">
            Conciergerie
          </label>
          <Select
            id="conciergerie"
            value={selectedConciergerieName || ''}
            onChange={selectConciergerie}
            options={conciergerieNames}
            placeholder="Sélectionner une conciergerie"
            error={isFormSubmitted && !conciergerieData?.name}
            borderColor={conciergerieData?.name && conciergerieData?.color ? conciergerieData?.color : undefined}
          />
          {isFormSubmitted && !conciergerieData?.name && (
            <p className="text-red-500 text-sm mt-1">Veuillez sélectionner une conciergerie</p>
          )}
        </div>

        {conciergerieData?.name && (
          <FormActions onCancel={handleClose} submitText="Valider" submitType="submit" isSubmitting={isSubmitting} />
        )}
      </form>
    </div>
  );
}
