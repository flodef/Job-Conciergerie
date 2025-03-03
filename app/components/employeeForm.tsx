'use client';

import { useLocalStorage } from '@/app/utils/localStorage';
import { clsx } from 'clsx/lite';
import { useEffect, useState } from 'react';
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
  const [formData, setFormData] = useLocalStorage<EmployeeData>('employee_data', {
    nom: '',
    prenom: '',
    tel: '',
    email: '',
    conciergerie: companies[0] || '',
    message: '',
  });
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: ToastType; message: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update conciergerie if companies change and current selection is not in the list
  useEffect(() => {
    if (companies.length > 0 && !companies.includes(formData.conciergerie)) {
      setFormData(prev => ({ ...prev, conciergerie: companies[0] }));
    }
  }, [companies, formData.conciergerie, setFormData]);

  // Clear conciergerie data if it exists when this form is shown
  useEffect(() => {
    localStorage.removeItem('conciergerie_data');
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);
    setIsSubmitting(true);

    // Validation - check if required fields are filled
    if (!formData.nom || !formData.prenom || !formData.tel || !formData.email || !formData.conciergerie) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez remplir tous les champs obligatoires',
      });
      setIsSubmitting(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez entrer une adresse email valide',
      });
      setIsSubmitting(false);
      return;
    }

    // Phone validation (simple format check)
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(formData.tel)) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez entrer un numéro de téléphone valide',
      });
      setIsSubmitting(false);
      return;
    }

    // Here you would typically send the data to an API
    console.log('Form submitted:', formData);

    // Show success message
    setToastMessage({
      type: ToastType.Success,
      message: 'Votre demande a été envoyée avec succès!',
    });

    // Redirect to missions page after a delay
    setTimeout(() => {
      window.location.href = '/missions';
    }, 2000);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Inscription Prestataire</h2>

      {toastMessage && <ToastMessage type={toastMessage.type} message={toastMessage.message} />}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            rows={4}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-end space-x-2">
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
            className="px-4 py-2 bg-default text-foreground rounded-md hover:bg-default/80 flex items-center justify-center"
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
