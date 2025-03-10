'use client';

import { useLocalStorage } from '@/app/utils/localStorage';
import { clsx } from 'clsx/lite';
import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/themeProvider';
import { addEmployee, employeeExists, getEmployeeStatus, getEmployees } from '../utils/employeeUtils';
import FormActions from './formActions';
import { ToastMessage, ToastProps, ToastType } from './toastMessage';
import Tooltip from './tooltip';
import { Employee } from '../types/types';
import { generateSimpleId } from '../utils/id';

type EmployeeFormProps = {
  conciergerieNames: string[];
  onClose: () => void;
};

export default function EmployeeForm({ conciergerieNames, onClose }: EmployeeFormProps) {
  const { resetPrimaryColor } = useTheme();
  const [formData, setFormData] = useLocalStorage<Employee>('employee_data', {
    id: '',
    firstName: '',
    familyName: '',
    tel: '',
    email: '',
    conciergerieName: conciergerieNames[0] || '',
    message: '',
  });
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastProps>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update conciergerie if companies change and current selection is not in the list
  useEffect(() => {
    if (conciergerieNames.length > 0 && !conciergerieNames.includes(formData.conciergerieName ?? '')) {
      setFormData(prev => ({ ...prev, conciergerie: conciergerieNames[0] }));
    }
  }, [conciergerieNames, formData.conciergerieName, setFormData]);

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
    if (!formData.firstName || !formData.familyName || !formData.tel || !formData.email || !formData.conciergerieName) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez remplir tous les champs obligatoires',
      });
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
    formData.id = generateSimpleId();
    setFormData(prev => ({ ...prev, id: formData.id }));
    addEmployee(formData);

    // Redirect to waiting page
    window.location.href = '/waiting';
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Inscription Prestataire</h2>

      {toastMessage && (
        <ToastMessage
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => setToastMessage(undefined)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">
            Prénom*
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className={clsx(
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
              isFormSubmitted && !formData.firstName && 'border-red-500',
            )}
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="familyName" className="block text-sm font-medium text-foreground mb-1">
            Nom*
          </label>
          <input
            type="text"
            id="familyName"
            name="familyName"
            value={formData.familyName}
            onChange={handleChange}
            className={clsx(
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
              isFormSubmitted && !formData.familyName && 'border-red-500',
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
            value={formData.conciergerieName}
            onChange={handleChange}
            className={clsx(
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
              isFormSubmitted && !formData.conciergerieName && 'border-red-500',
            )}
            required
            disabled={isSubmitting}
          >
            {conciergerieNames.map(company => (
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
