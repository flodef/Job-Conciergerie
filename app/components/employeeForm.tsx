'use client';

import { useLocalStorage } from '@/app/utils/localStorage';
import { clsx } from 'clsx/lite';
import { useEffect, useState } from 'react';
import { defaultPrimaryColor, useTheme } from '../contexts/themeProvider';
import { addEmployee, employeeExists, getEmployeeStatus, getEmployees } from '../utils/employeeUtils';
import { ToastMessage, ToastType } from './toastMessage';
import Tooltip from './tooltip';

type EmployeeFormProps = {
  companies: string[];
  onClose: () => void;
};

export type EmployeeData = {
  nom: string;
  prenom: string;
  tel: string;
  email: string;
  conciergerie: string;
  message: string;
};

export default function EmployeeForm({ companies, onClose }: EmployeeFormProps) {
  const { setPrimaryColor } = useTheme();
  const [formData, setFormData] = useLocalStorage<EmployeeData>('employee_data', {
    nom: '',
    prenom: '',
    tel: '',
    email: '',
    conciergerie: companies[0] || '',
    message: '',
  });
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>();
  const [toastType, setToastType] = useState<ToastType>();
  const [showToast, setShowToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update conciergerie if companies change and current selection is not in the list
  useEffect(() => {
    if (companies.length > 0 && !companies.includes(formData.conciergerie)) {
      setFormData(prev => ({ ...prev, conciergerie: companies[0] }));
    }
  }, [companies, formData.conciergerie, setFormData]);

  // Clear conciergerie data if it exists when this form is shown
  useEffect(() => {
    setPrimaryColor(defaultPrimaryColor);

    //TODO: restore when in prod
    // localStorage.removeItem('conciergerie_data');
  }, [setPrimaryColor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

    // Check if all required fields are filled
    if (!formData.nom || !formData.prenom || !formData.tel || !formData.email || !formData.conciergerie) {
      setToastMessage('Veuillez remplir tous les champs obligatoires');
      setToastType(ToastType.Error);
      setShowToast(true);
      return;
    }

    setIsSubmitting(true);

    // Check if employee already exists
    const employees = getEmployees();
    const existingEmployee = employeeExists(formData, employees);

    if (existingEmployee) {
      // Get the employee's status
      const status = getEmployeeStatus(formData);

      // Redirect based on status
      if (status === 'accepted') {
        // If accepted, go to missions page
        window.location.href = '/missions';
      } else {
        // If pending or rejected, go to waiting page
        window.location.href = '/waiting';
      }
      return;
    }

    // Add the employee to the employees list
    addEmployee(formData);

    // Redirect to waiting page
    window.location.href = '/waiting';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Inscription Prestataire</h2>
        <button
          className="text-foreground text-4xl hover:scale-110 transition-transform"
          onClick={onClose}
          aria-label="Fermer"
        >
          &times;
        </button>
      </div>

      {showToast && toastMessage && toastType && (
        <ToastMessage type={toastType} message={toastMessage} onClose={() => setShowToast(false)} />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prenom" className="block text-sm font-medium text-foreground mb-1">
            Prénom*
          </label>
          <input
            type="text"
            id="prenom"
            name="prenom"
            value={formData.prenom}
            onChange={handleChange}
            className={clsx(
              'w-full p-2 border border-secondary rounded-md focus:ring-primary focus:border-primary',
              isFormSubmitted && !formData.prenom && 'border-red-500',
            )}
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="nom" className="block text-sm font-medium text-foreground mb-1">
            Nom*
          </label>
          <input
            type="text"
            id="nom"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            className={clsx(
              'w-full p-2 border border-secondary rounded-md focus:ring-primary focus:border-primary',
              isFormSubmitted && !formData.nom && 'border-red-500',
            )}
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="tel" className="block text-sm font-medium text-foreground mb-1">
            Téléphone*
          </label>
          <input
            type="tel"
            id="tel"
            name="tel"
            value={formData.tel}
            onChange={handleChange}
            className={clsx(
              'w-full p-2 border border-secondary rounded-md focus:ring-primary focus:border-primary',
              isFormSubmitted && !formData.tel && 'border-red-500',
            )}
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email*
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={clsx(
              'w-full p-2 border border-secondary rounded-md focus:ring-primary focus:border-primary',
              isFormSubmitted && !formData.email && 'border-red-500',
            )}
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="conciergerie" className="flex items-center text-sm font-medium text-foreground mb-1">
            <span>Conciergerie*</span>
            <Tooltip text="C'est la conciergerie par laquelle vous avez connu ce site, qui recevra votre candidature et qui validera votre inscription." />
          </label>
          <select
            id="conciergerie"
            name="conciergerie"
            value={formData.conciergerie}
            onChange={handleChange}
            className={clsx(
              'w-full p-2 border border-secondary rounded-md focus:ring-primary focus:border-primary',
              isFormSubmitted && !formData.conciergerie && 'border-red-500',
            )}
            required
            disabled={isSubmitting}
          >
            {companies.map(company => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            className="w-full p-2 border border-secondary rounded-md focus:ring-primary focus:border-primary"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-end space-x-3">
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
            className="px-4 py-2 bg-primary text-foreground rounded-md hover:bg-default/80 flex items-center justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                Traitement...
              </>
            ) : (
              'Envoyer'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
