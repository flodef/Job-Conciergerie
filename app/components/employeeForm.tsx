'use client';

import { useLocalStorage } from '@/app/utils/localStorage';
import { clsx } from 'clsx/lite';
import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/themeProvider';
import { addEmployee, employeeExists, getEmployeeStatus, getEmployees } from '../utils/employeeUtils';
import FormActions from './formActions';
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
  const { resetPrimaryColor } = useTheme();
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
    resetPrimaryColor();

    //TODO: restore when in prod
    // localStorage.removeItem('conciergerie_data');
  }, [resetPrimaryColor]);

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
      <h2 className="text-2xl font-bold mb-2">Inscription Prestataire</h2>

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
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
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
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
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
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
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
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
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
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
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
            className={clsx(
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
            )}
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <FormActions onCancel={onClose} submitText="Valider" submitType="submit" isSubmitting={isSubmitting} />
      </form>
    </div>
  );
}
