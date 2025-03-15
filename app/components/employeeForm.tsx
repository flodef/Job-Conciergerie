'use client';

import { setLocalStorageItem, useLocalStorage } from '@/app/utils/localStorage';
import { clsx } from 'clsx/lite';
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/themeProvider';
import { Employee } from '../types/types';
import { addEmployee, getEmployeeStatus } from '../utils/employeeUtils';
import { generateSimpleId } from '../utils/id';
import { emailRegex, frenchPhoneRegex } from '../utils/regex';
import ConfirmationModal from './confirmationModal';
import FormActions from './formActions';
import Select from './select';
import { ToastMessage, ToastProps, ToastType } from './toastMessage';
import Tooltip from './tooltip';

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
  const [isFormChanged, setIsFormChanged] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<Employee | null>(null);

  // Validation states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  // References for form fields
  const firstNameRef = React.useRef<HTMLInputElement>(null);
  const familyNameRef = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const phoneRef = React.useRef<HTMLInputElement>(null);
  const messageRef = React.useRef<HTMLTextAreaElement>(null);

  // Regular expressions for validation
  const MAX_MESSAGE_LENGTH = 500;

  // Update conciergerie if companies change and current selection is not in the list
  useEffect(() => {
    if (conciergerieNames.length > 0 && !conciergerieNames.includes(formData.conciergerieName ?? '')) {
      setFormData(prev => ({ ...prev, conciergerie: conciergerieNames[0] }));
    }
  }, [conciergerieNames, formData.conciergerieName, setFormData]);

  // Save original form data when the form is first opened
  const initialRenderRef = useRef(true);
  useEffect(() => {
    resetPrimaryColor();

    // Only save the initial data on first render
    if (initialRenderRef.current) {
      setOriginalFormData({ ...formData });
      initialRenderRef.current = false;
    }

    //TODO: restore when in prod
    // localStorage.removeItem('conciergerie_data');
  }, [resetPrimaryColor, formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Validate as user types
    if (name === 'email') {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

    // Check if all required fields are filled
    if (!formData.firstName) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez remplir tous les champs obligatoires',
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

    setIsSubmitting(true);

    // Redirect based on status
    const status = getEmployeeStatus(formData);
    if (status === 'accepted') {
      // If accepted, go to missions page
      window.location.href = '/missions';
    } else if (status === 'pending' || status === 'rejected') {
      // If pending or rejected, go to waiting page
      window.location.href = '/waiting';
    } else {
      // Add the employee to the employees list
      formData.id = generateSimpleId();
      setFormData(prev => ({ ...prev, id: formData.id }));
      addEmployee(formData);

      // Redirect to waiting page
      window.location.href = '/waiting';
    }
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

      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">
            Prénom*
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
              isFormSubmitted && !formData.firstName && 'border-red-500',
            )}
            disabled={isSubmitting}
          />
          {isFormSubmitted && !formData.firstName && (
            <p className="text-red-500 text-sm mt-1">Veuillez entrer votre prénom</p>
          )}
        </div>

        <div>
          <label htmlFor="familyName" className="block text-sm font-medium text-foreground mb-1">
            Nom*
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
              isFormSubmitted && !formData.familyName && 'border-red-500',
            )}
            disabled={isSubmitting}
          />
          {isFormSubmitted && !formData.familyName && (
            <p className="text-red-500 text-sm mt-1">Veuillez entrer votre nom</p>
          )}
        </div>

        <div>
          <label htmlFor="tel" className="block text-sm font-medium text-foreground mb-1">
            Téléphone*
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
            placeholder="Ex: 06 12 34 56 78"
          />
          {isFormSubmitted && !formData.tel ? (
            <p className="text-red-500 text-sm mt-1">Veuillez entrer votre numéro de téléphone</p>
          ) : phoneError ? (
            <p className="text-red-500 text-sm mt-1">{phoneError}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email*
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
          />
          {isFormSubmitted && !formData.email ? (
            <p className="text-red-500 text-sm mt-1">Veuillez entrer votre adresse email</p>
          ) : emailError ? (
            <p className="text-red-500 text-sm mt-1">{emailError}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="conciergerie" className="flex items-center text-sm font-medium text-foreground mb-1">
            <span>Conciergerie*</span>
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
            options={conciergerieNames}
            placeholder="Sélectionner une conciergerie"
            error={isFormSubmitted && !formData.conciergerieName}
            disabled={isSubmitting}
            borderColor={formData.conciergerieName ? 'var(--color-default)' : undefined}
          />
          {isFormSubmitted && !formData.conciergerieName && (
            <p className="text-red-500 text-sm mt-1">Veuillez sélectionner une conciergerie</p>
          )}
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1">
            Message
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
          submitType="submit"
          isSubmitting={isSubmitting}
        />

        <ConfirmationModal
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={() => {
            // Restore original form data by directly modifying localStorage
            if (originalFormData) {
              // Update localStorage directly
              setLocalStorageItem('employee_data', originalFormData);
              // Also update the state to ensure UI is consistent
              setFormData(originalFormData);
            }
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
