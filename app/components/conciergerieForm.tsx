'use client';

import { useLocalStorage } from '@/app/utils/localStorage';
import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/themeProvider';
import conciergeriesData from '../data/conciergeries.json';
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
  const [conciergerieData, setConciergerieData] = useLocalStorage<Conciergerie>('conciergerie_data', {
    name: '',
    email: '',
    tel: '',
    colorName: '',
    color: '',
  });
  const [toastMessage, setToastMessage] = useState<ToastProps>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update selected company data when name changes
  useEffect(() => {
    if (conciergerieData.name) {
      const selectedConciergerie = conciergeriesData.find(c => c.name === conciergerieData.name);
      if (selectedConciergerie) {
        // Get color value from colors.json based on colorName
        const colorValue = getColorValueByName(selectedConciergerie.colorName);

        setConciergerieData(prev => ({
          ...prev,
          email: selectedConciergerie.email,
          colorName: selectedConciergerie.colorName,
          color: colorValue || '',
          tel: selectedConciergerie.tel,
        }));

        // Set the primary color theme
        if (colorValue) {
          setPrimaryColor(colorValue);
        }
      }
    }
  }, [conciergerieData.name, setConciergerieData, setPrimaryColor]);

  // Clear employee data if it exists when this form is shown
  useEffect(() => {
    //TODO: restore when in prod
    // localStorage.removeItem('employee_data');
  }, []);

  const handleClose = () => {
    resetPrimaryColor();
    onClose();
  };

  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

    if (!conciergerieData.name) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez sélectionner une conciergerie',
      });
      return;
    }

    setIsSubmitting(true);

    // Apply the color theme
    setPrimaryColor(conciergerieData.color);

    // Redirect to missions page
    window.location.href = '/missions';
  };

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
            value={conciergerieData.name}
            onChange={(value: string) => {
              // Update conciergerie data when selection changes
              if (value) {
                const selectedConciergerie = conciergeriesData.find(c => c.name === value);
                if (selectedConciergerie) {
                  // Get color value from colors.json based on colorName
                  const colorValue = getColorValueByName(selectedConciergerie.colorName);
                  setConciergerieData(prev => ({
                    ...prev,
                    name: value,
                    email: selectedConciergerie.email,
                    colorName: selectedConciergerie.colorName,
                    color: colorValue || '',
                    tel: selectedConciergerie.tel,
                  }));
                }
              } else {
                setConciergerieData(prev => ({ ...prev, name: '' }));
              }
            }}
            options={conciergerieNames}
            placeholder="Sélectionner une conciergerie"
            error={isFormSubmitted && !conciergerieData.name}
            borderColor={conciergerieData.name && conciergerieData.color ? conciergerieData.color : undefined}
          />
          {isFormSubmitted && !conciergerieData.name && (
            <p className="text-red-500 text-sm mt-1">Veuillez sélectionner une conciergerie</p>
          )}
        </div>

        {conciergerieData.name && (
          <div className="space-y-4 mt-2">
            <div>
              <h3 className="text-sm font-medium text-light">Email</h3>
              <p className="text-foreground">{conciergerieData.email}</p>
            </div>

            {conciergerieData.tel && (
              <div>
                <h3 className="text-sm font-medium text-light">Téléphone</h3>
                <p className="text-foreground">{conciergerieData.tel}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-light">Couleur</h3>
              <div className="flex items-center mt-1">
                <div
                  className="w-6 h-6 rounded-full border border-secondary mr-2"
                  style={{ backgroundColor: conciergerieData.color }}
                />
                <span className="text-foreground">{conciergerieData.colorName}</span>
              </div>
            </div>

            <FormActions onCancel={handleClose} submitText="Valider" submitType="submit" isSubmitting={isSubmitting} />
          </div>
        )}
      </form>
    </div>
  );
}
