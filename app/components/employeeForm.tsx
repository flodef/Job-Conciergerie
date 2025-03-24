'use client';

import { sendEmployeeRegistrationEmail } from '@/app/actions/email';
import { createNewEmployee } from '@/app/actions/employee';
import ConfirmationModal from '@/app/components/confirmationModal';
import FormActions from '@/app/components/formActions';
import LoadingSpinner from '@/app/components/loadingSpinner';
import Select from '@/app/components/select';
import { ToastMessage, Toast, ToastType } from '@/app/components/toastMessage';
import Tooltip from '@/app/components/tooltip';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { Employee, EmployeeNotificationSettings } from '@/app/types/types';
import { useLocalStorage } from '@/app/utils/localStorage';
import { Page } from '@/app/utils/navigation';
import { emailRegex, frenchPhoneRegex } from '@/app/utils/regex';
import { clsx } from 'clsx/lite';
import React, { useState } from 'react';

type EmployeeFormProps = {
  onClose: () => void;
};

export default function EmployeeForm({ onClose }: EmployeeFormProps) {
  const { userId, isLoading: authLoading, setSentEmailError, conciergeries, updateUserData } = useAuth();
  const { onMenuChange } = useMenuContext();

  // Using Partial<Employee> since we don't have status and createdAt yet
  const [formData, setFormData] = useLocalStorage<Partial<Employee>>('employee_data', {
    id: '',
    firstName: '',
    familyName: '',
    tel: '',
    email: '',
    conciergerieName: conciergeries?.[0]?.name || '',
    message: '',
    notificationSettings: {
      acceptedMissions: true,
      missionChanged: true,
      missionDeleted: true,
      missionsCanceled: true,
    },
  });
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState<Toast>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormChanged, setIsFormChanged] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Validation states
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [familyNameError, setFamilyNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  // References for form fields
  const firstNameRef = React.useRef<HTMLInputElement>(null);
  const familyNameRef = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const phoneRef = React.useRef<HTMLInputElement>(null);
  const messageRef = React.useRef<HTMLTextAreaElement>(null);

  // Constants for validation
  const MAX_NAME_LENGTH = 30;
  const MAX_MESSAGE_LENGTH = 500;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Validate as user types
    if (name === 'firstName') {
      if (value.length > MAX_NAME_LENGTH) {
        setFirstNameError(`Le prénom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères`);
      } else {
        setFirstNameError(null);
      }
    } else if (name === 'familyName') {
      if (value.length > MAX_NAME_LENGTH) {
        setFamilyNameError(`Le nom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères`);
      } else {
        setFamilyNameError(null);
      }
    } else if (name === 'email') {
      if (value && !emailRegex.test(value)) {
        setEmailError('Format d&apos;email invalide');
      } else {
        setEmailError(null);
      }
    } else if (name === 'tel') {
      if (value && !frenchPhoneRegex.test(value)) {
        setPhoneError('Format de numéro de téléphone invalide');
      } else {
        setPhoneError(null);
      }
    } else if (name === 'message') {
      if (value.length > MAX_MESSAGE_LENGTH) {
        setMessageError(`Le message ne peut pas dépasser ${MAX_MESSAGE_LENGTH} caractères`);
      } else {
        setMessageError(null);
      }
    }

    // Mark form as changed
    setIsFormChanged(true);

    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: name === 'message' ? value.slice(0, MAX_MESSAGE_LENGTH) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

    if (!formData) return;

    // Check if all required fields are filled
    if (!formData.firstName) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez remplir tous les champs obligatoires',
      });
      firstNameRef.current?.focus();
      return;
    }

    // Validate first name length
    if (formData.firstName.length > MAX_NAME_LENGTH) {
      setFirstNameError(`Le prénom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères`);
      setToastMessage({
        type: ToastType.Error,
        message: `Le prénom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères`,
      });
      firstNameRef.current?.focus();
      return;
    }

    if (!formData.familyName) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez remplir tous les champs obligatoires',
      });
      familyNameRef.current?.focus();
      return;
    }

    // Validate family name length
    if (formData.familyName.length > MAX_NAME_LENGTH) {
      setFamilyNameError(`Le nom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères`);
      setToastMessage({
        type: ToastType.Error,
        message: `Le nom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères`,
      });
      familyNameRef.current?.focus();
      return;
    }

    if (!formData.email) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez remplir tous les champs obligatoires',
      });
      emailRef.current?.focus();
      return;
    }

    if (!formData.tel) {
      setPhoneError('Veuillez entrer un numéro de téléphone');
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez remplir tous les champs obligatoires',
      });
      phoneRef.current?.focus();
      return;
    }

    if (!formData.conciergerieName) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez sélectionner une conciergerie',
      });
      return;
    }

    // Validate email format
    if (!emailRegex.test(formData.email)) {
      setEmailError("Format d'email invalide");
      setToastMessage({
        type: ToastType.Error,
        message: "Veuillez corriger le format de l'email",
      });
      emailRef.current?.focus();
      return;
    }

    // Validate phone format
    if (!frenchPhoneRegex.test(formData.tel)) {
      setPhoneError('Format de numéro de téléphone invalide');
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez corriger le format du numéro de téléphone',
      });
      phoneRef.current?.focus();
      return;
    }

    // Validate message length
    if (formData.message && formData.message.length > MAX_MESSAGE_LENGTH) {
      setMessageError(`Le message ne peut pas dépasser ${MAX_MESSAGE_LENGTH} caractères`);
      setToastMessage({
        type: ToastType.Error,
        message: `Le message ne peut pas dépasser ${MAX_MESSAGE_LENGTH} caractères`,
      });
      messageRef.current?.focus();
      return;
    }

    if (!userId) {
      setToastMessage({
        type: ToastType.Error,
        message: "Une erreur est survenue lors de la création de l'employé",
        error: 'No User ID',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (!userId) throw new Error('User ID not found');

      // Create a new employee in the database
      const { employee, alreadyExists } = await createNewEmployee({
        id: userId,
        firstName: formData.firstName || '',
        familyName: formData.familyName || '',
        tel: formData.tel || '',
        email: formData.email || '',
        message: formData.message,
        conciergerieName: formData.conciergerieName,
        notificationSettings: formData.notificationSettings as EmployeeNotificationSettings,
      });

      if (alreadyExists) {
        setToastMessage({
          type: ToastType.Error,
          message: 'Un employé avec ce nom, ce numéro de téléphone ou cet email existe déjà.',
        });
        setIsSubmitting(false);
        return;
      }

      if (!employee) throw new Error('Employee not created in database');

      updateUserData(employee);

      // Send notification email to conciergerie
      const selectedConciergerie = conciergeries?.find(c => c.name === employee.conciergerieName);
      if (!selectedConciergerie) throw new Error('Conciergerie not found');
      if (!selectedConciergerie.email) throw new Error('Conciergerie email not found');

      const result = await sendEmployeeRegistrationEmail(
        selectedConciergerie.email,
        selectedConciergerie.name,
        `${employee.firstName} ${employee.familyName}`,
        employee.email,
        employee.tel,
      );
      setSentEmailError(result?.success !== true);

      onMenuChange(Page.Waiting);
    } catch (error) {
      setToastMessage({
        type: ToastType.Error,
        message: "Erreur lors de l'enregistrement. Veuillez réessayer.",
        error,
      });
      setIsSubmitting(false);
    }
  };

  if (!formData) return null;

  if (authLoading) return <LoadingSpinner />;

  if (!conciergeries?.length)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <h2 className="text-2xl font-bold mb-2">Conciergerie</h2>
        <p className="text-foreground">Aucune conciergerie trouvée !</p>
      </div>
    );

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center bg-background">
      <ToastMessage toast={toastMessage} onClose={() => setToastMessage(undefined)} />

      <h2 className="text-2xl font-bold mb-2">Inscription Prestataire</h2>

      <form onSubmit={handleSubmit} className="w-full px-4 space-y-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">
            Prénom
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            ref={firstNameRef}
            value={formData.firstName}
            onChange={handleChange}
            className={clsx(
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
              (isFormSubmitted && !formData.firstName) || firstNameError ? 'border-red-500' : '',
            )}
            disabled={isSubmitting}
            placeholder="Jean"
          />
          {isFormSubmitted && !formData.firstName ? (
            <p className="text-red-500 text-sm mt-1">Veuillez entrer votre prénom</p>
          ) : firstNameError ? (
            <p className="text-red-500 text-sm mt-1">{firstNameError}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="familyName" className="block text-sm font-medium text-foreground mb-1">
            Nom
          </label>
          <input
            type="text"
            id="familyName"
            name="familyName"
            ref={familyNameRef}
            value={formData.familyName}
            onChange={handleChange}
            className={clsx(
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
              (isFormSubmitted && !formData.familyName) || familyNameError ? 'border-red-500' : '',
            )}
            disabled={isSubmitting}
            placeholder="Dupont"
          />
          {isFormSubmitted && !formData.familyName ? (
            <p className="text-red-500 text-sm mt-1">Veuillez entrer votre nom</p>
          ) : familyNameError ? (
            <p className="text-red-500 text-sm mt-1">{familyNameError}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="tel" className="block text-sm font-medium text-foreground mb-1">
            Téléphone
          </label>
          <input
            type="tel"
            id="tel"
            name="tel"
            ref={phoneRef}
            value={formData.tel}
            onChange={handleChange}
            className={clsx(
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
              (isFormSubmitted && !formData.tel) || phoneError ? 'border-red-500' : '',
            )}
            disabled={isSubmitting}
            placeholder="06 12 34 56 78"
          />
          {isFormSubmitted && !formData.tel ? (
            <p className="text-red-500 text-sm mt-1">Veuillez entrer votre numéro de téléphone</p>
          ) : phoneError ? (
            <p className="text-red-500 text-sm mt-1">{phoneError}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            ref={emailRef}
            value={formData.email}
            onChange={handleChange}
            className={clsx(
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
              (isFormSubmitted && !formData.email) || emailError ? 'border-red-500' : '',
            )}
            disabled={isSubmitting}
            placeholder="jean.dupont@example.com"
          />
          {isFormSubmitted && !formData.email ? (
            <p className="text-red-500 text-sm mt-1">Veuillez entrer votre adresse email</p>
          ) : emailError ? (
            <p className="text-red-500 text-sm mt-1">{emailError}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="conciergerie" className="flex items-center text-sm font-medium text-foreground mb-1">
            <span>Conciergerie</span>
            <Tooltip text="C'est la conciergerie par laquelle vous avez connu ce site, qui recevra votre candidature et qui validera votre inscription." />
          </label>
          <Select
            id="conciergerie"
            value={formData.conciergerieName || ''}
            onChange={(value: string) => {
              setFormData({
                ...formData,
                conciergerieName: value,
              });
            }}
            options={conciergeries.map(c => c.name)}
            placeholder="Sélectionner une conciergerie"
            disabled={isSubmitting}
            error={isFormSubmitted && !formData.conciergerieName}
          />
          {isFormSubmitted && !formData.conciergerieName && (
            <p className="text-red-500 text-sm mt-1">Veuillez sélectionner une conciergerie</p>
          )}
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1">
            Message (facultatif)
          </label>
          <div className="relative">
            <textarea
              id="message"
              name="message"
              ref={messageRef}
              value={formData.message}
              onChange={handleChange}
              className={clsx(
                'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
                'border-foreground/20 focus-visible:outline-primary',
                messageError && 'border-red-500',
              )}
              rows={4}
              disabled={isSubmitting}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Exemple : Nous nous sommes rencontrés lors de l'événement Machin à Trucville."
            />
            {messageError ? (
              <p className="text-red-500 text-sm mt-1">{messageError}</p>
            ) : (
              <div className="text-right text-sm text-foreground/50 -mt-1.5">
                {formData.message?.length || 0}/{MAX_MESSAGE_LENGTH}
              </div>
            )}
          </div>
        </div>

        <FormActions
          onCancel={() => {
            if (isFormChanged) {
              setShowConfirmDialog(true);
            } else {
              onClose();
            }
          }}
          submitText="Valider"
          isSubmitting={isSubmitting}
        />

        <ConfirmationModal
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={() => {
            // Restore original form data by directly modifying localStorage
            setFormData(undefined);

            // Close the form after a short delay to ensure state is updated
            setTimeout(() => {
              onClose();
            }, 50);
          }}
          title="Modifications non enregistrées"
          message="Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter sans enregistrer ?"
          confirmText="Quitter sans enregistrer"
          cancelText="Continuer l'édition"
        />
      </form>
    </div>
  );
}
