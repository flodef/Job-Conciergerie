'use client';

import { useEffect, useState } from 'react';
import { ToastMessage, ToastType } from './toastMessage';
import { useLocalStorage } from '@/app/utils/localStorage';
import { useRouter } from 'next/navigation';
import conciergeriesData from '../data/conciergeries.json';
import { useTheme } from '../contexts/themeProvider';

type ConciergerieFormProps = {
  companies: string[];
  onClose: () => void;
};

export type ConciergerieData = {
  name: string;
  color: string;
  colorName?: string;
  email: string;
  tel?: string;
};

export default function ConciergerieForm({ companies, onClose }: ConciergerieFormProps) {
  const router = useRouter();
  const { setPrimaryColor } = useTheme();
  const [conciergerieData, setConciergerieData] = useLocalStorage<ConciergerieData>('conciergerie_data', {
    name: companies[0] || '',
    color: '#a4bcde', // Default to primary color
    email: '',
  });
  const [toastMessage, setToastMessage] = useState<{ type: ToastType; message: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update selected company data when name changes
  useEffect(() => {
    if (conciergerieData.name) {
      const selectedConciergerie = conciergeriesData.find(c => c.name === conciergerieData.name);
      if (selectedConciergerie) {
        // Convert color name (like 'blue-300') to a hex value
        const colorValue = getColorFromName(selectedConciergerie.color);
        setConciergerieData(prev => ({
          ...prev,
          email: selectedConciergerie.email,
          color: colorValue,
          colorName: selectedConciergerie.color,
          tel: selectedConciergerie.tel
        }));
        
        // Set the primary color theme
        setPrimaryColor(colorValue);
      }
    }
  }, [conciergerieData.name, setConciergerieData, setPrimaryColor]);

  // Clear employee data if it exists when this form is shown
  useEffect(() => {
    localStorage.removeItem('employee_data');
  }, []);

  // Helper function to convert color names to hex values
  const getColorFromName = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      'blue-300': '#93c5fd',
      'amber-400': '#fbbf24',
      'emerald-700': '#047857',
      // Add more colors as needed
    };
    
    return colorMap[colorName] || '#a4bcde'; // Default to primary color if not found
  };

  // Helper function to format color name for display
  const formatColorName = (colorName?: string): string => {
    if (!colorName) return '';
    
    // Split by hyphen (e.g., 'blue-300' becomes ['blue', '300'])
    const parts = colorName.split('-');
    if (parts.length !== 2) return colorName;
    
    // Capitalize the color name and add the number
    return `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} ${parts[1]}`;
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-foreground mb-1">
            Sélectionnez votre conciergerie:
          </label>
          <select
            id="company"
            className="w-full p-2 border border-secondary rounded-md focus:ring-primary focus:border-primary"
            value={conciergerieData.name}
            onChange={e => setConciergerieData(prev => ({ ...prev, name: e.target.value }))}
            required
          >
            {companies.map(company => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="color" className="block text-sm font-medium text-foreground mb-1">
            Couleur (non modifiable):
          </label>
          <div className="flex items-center space-x-2">
            <div 
              className="w-8 h-8 rounded-full border border-secondary"
              style={{ backgroundColor: conciergerieData.color }}
            />
            <span className="text-foreground/70">
              {formatColorName(conciergerieData.colorName) || conciergerieData.color}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email (non modifiable):
          </label>
          <div className="w-full p-2 border border-secondary rounded-md bg-secondary/20 text-foreground/70">
            {conciergerieData.email || `contact@${conciergerieData.name.toLowerCase().replace(/\s+/g, '-')}.fr`}
          </div>
        </div>

        {conciergerieData.tel && (
          <div>
            <label htmlFor="tel" className="block text-sm font-medium text-foreground mb-1">
              Téléphone (non modifiable):
            </label>
            <div className="w-full p-2 border border-secondary rounded-md bg-secondary/20 text-foreground/70">
              {conciergerieData.tel}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80"
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button 
            type="submit" 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80 flex items-center justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Traitement...
              </>
            ) : (
              'Continuer'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
