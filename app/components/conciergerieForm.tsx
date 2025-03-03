'use client';

import { useLocalStorage } from '@/app/utils/localStorage';
import { useEffect, useState } from 'react';
import { defaultPrimaryColor, useTheme } from '../contexts/themeProvider';
import conciergeriesData from '../data/conciergeries.json';
import { ToastMessage, ToastType } from './toastMessage';

type ConciergerieFormProps = {
  companies: string[];
  onClose: () => void;
};

export type ConciergerieData = {
  name: string;
  color: string;
  colorName: string;
  email: string;
  tel?: string;
};

export default function ConciergerieForm({ companies, onClose }: ConciergerieFormProps) {
  const { setPrimaryColor } = useTheme();
  const [conciergerieData, setConciergerieData] = useLocalStorage<ConciergerieData>('conciergerie_data', {
    name: '',
    color: defaultPrimaryColor,
    colorName: '',
    email: '',
  });
  const [toastMessage, setToastMessage] = useState<{ type: ToastType; message: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update selected company data when name changes
  useEffect(() => {
    if (conciergerieData.name) {
      const selectedConciergerie = conciergeriesData.find(c => c.name === conciergerieData.name);
      if (selectedConciergerie) {
        setConciergerieData(prev => ({
          ...prev,
          email: selectedConciergerie.email,
          color: selectedConciergerie.colorvalue,
          colorName: selectedConciergerie.colorname,
          tel: selectedConciergerie.tel,
        }));

        // Set the primary color theme
        setPrimaryColor(selectedConciergerie.colorvalue);
      }
    }
  }, [conciergerieData.name, setConciergerieData, setPrimaryColor]);

  // Clear employee data if it exists when this form is shown
  useEffect(() => {
    localStorage.removeItem('employee_data');
  }, []);

  const handleClose = () => {
    setPrimaryColor(defaultPrimaryColor);
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

    // Here you would handle the conciergerie selection
    console.log('Conciergerie data:', conciergerieData);

    // Apply the color theme
    setPrimaryColor(conciergerieData.color);

    // Show success message
    setToastMessage({
      type: ToastType.Success,
      message: 'Sélection enregistrée!',
    });

    // Redirect to missions page after a delay
    setTimeout(() => {
      window.location.href = '/missions';
    }, 1500);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Conciergerie</h2>

      {toastMessage && <ToastMessage type={toastMessage.type} message={toastMessage.message} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="conciergerie" className="block text-sm font-medium text-foreground mb-1">
            Conciergerie
          </label>
          <select
            id="conciergerie"
            value={conciergerieData.name}
            onChange={e => setConciergerieData({ ...conciergerieData, name: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="" disabled>Sélectionnez une conciergerie</option>
            {companies.map(company => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        {conciergerieData.name && (
          <>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email (non modifiable)
              </label>
              <input
                type="email"
                id="email"
                value={conciergerieData.email}
                readOnly
                className="w-full p-2 border border-secondary rounded-md bg-background/50 text-foreground/70 cursor-not-allowed"
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
                  className="w-full p-2 border border-secondary rounded-md bg-background/50 text-foreground/70 cursor-not-allowed"
                />
              </div>
            )}

            <div>
              <label htmlFor="color" className="block text-sm font-medium text-foreground mb-1">
                Couleur (non modifiable)
              </label>
              <div className="flex items-center space-x-2">
                <div
                  className="w-8 h-8 rounded-full border border-secondary"
                  style={{ backgroundColor: conciergerieData.color }}
                />
                <span className="text-foreground/70">{conciergerieData.colorName}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-foreground rounded-md hover:bg-primary/80 flex items-center justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                    Traitement...
                  </>
                ) : (
                  'Valider'
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
