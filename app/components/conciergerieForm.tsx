'use client';

import { useLocalStorage } from '@/app/utils/localStorage';
import { clsx } from 'clsx/lite';
import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/themeProvider';
import conciergeriesData from '../data/conciergeries.json';
import { getColorValueByName } from '../utils/welcomeParams';
import FormActions from './formActions';
import { ToastMessage, ToastProps, ToastType } from './toastMessage';
import { Conciergerie } from '../types/types';

type ConciergerieFormProps = {
  companies: string[];
  onClose: () => void;
};

export default function ConciergerieForm({ companies, onClose }: ConciergerieFormProps) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!conciergerieData.name) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez sélectionner une conciergerie',
      });
      setIsSubmitting(false);
      return;
    }

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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="conciergerie" className="block text-sm font-medium text-foreground mb-1">
            Conciergerie
          </label>
          <select
            id="conciergerie"
            value={conciergerieData.name}
            onChange={e => setConciergerieData({ ...conciergerieData, name: e.target.value })}
            className={clsx(
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
            )}
            required
          >
            <option value="" disabled>
              Sélectionnez une conciergerie
            </option>
            {companies.map(company => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        {conciergerieData.name && (
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email (non modifiable)
              </label>
              <input
                type="email"
                id="email"
                value={conciergerieData.email}
                readOnly
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg bg-background text-foreground/50',
                  'border-foreground/20 focus-visible:outline-primary cursor-not-allowed',
                )}
              />
            </div>

            {conciergerieData.tel && (
              <div>
                <label htmlFor="tel" className="block text-sm font-medium text-foreground mb-1">
                  Téléphone (non modifiable)
                </label>
                <input
                  type="tel"
                  id="tel"
                  value={conciergerieData.tel}
                  readOnly
                  className={clsx(
                    'w-full px-3 py-2 border rounded-lg bg-background text-foreground/50',
                    'border-foreground/20 focus-visible:outline-primary cursor-not-allowed',
                  )}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Couleur (non modifiable)</label>
              <div className="flex items-center space-x-2">
                <div
                  className="w-8 h-8 rounded-full border border-secondary"
                  style={{ backgroundColor: conciergerieData.color }}
                />
                <span className="text-foreground/70">{conciergerieData.colorName}</span>
              </div>
            </div>

            <FormActions onCancel={handleClose} submitText="Valider" submitType="submit" isSubmitting={isSubmitting} />
          </div>
        )}
      </form>
    </div>
  );
}
