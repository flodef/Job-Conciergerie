'use client';

import { sendEmployeeRegistrationEmail } from '@/app/actions/email';
import { createNewEmployee } from '@/app/actions/employee';
import Combobox from '@/app/components/combobox';
import ConfirmationModal from '@/app/components/confirmationModal';
import FormActions from '@/app/components/formActions';
import LoadingSpinner from '@/app/components/loadingSpinner';
import Select from '@/app/components/select';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import Tooltip from '@/app/components/tooltip';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import geographicZones from '@/app/data/geographicZone.json';
import { ChangeEventField, Employee, EmployeeNotificationSettings, ErrorField } from '@/app/types/types';
import { errorClassName, inputFieldClassName, labelClassName, textAreaCharCountClassName } from '@/app/utils/className';
import { handleChange } from '@/app/utils/form';
import { useLocalStorage } from '@/app/utils/localStorage';
import { Page } from '@/app/utils/navigation';
import { defaultEmployeeSettings } from '@/app/utils/notifications';
import { emailRegex, frenchPhoneRegex, inputLengthRegex } from '@/app/utils/regex';
import React, { useRef, useState } from 'react';

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
    geographicZone: '',
    conciergerieName: conciergeries?.[0]?.name || '',
    message: '',
    notificationSettings: defaultEmployeeSettings,
  });
  const [toastMessage, setToastMessage] = useState<Toast>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormChanged, setIsFormChanged] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Validation states
  const [firstNameError, setFirstNameError] = useState('');
  const [familyNameError, setFamilyNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [geographicZoneError, setGeographicZoneError] = useState('');
  const [conciergerieNameError, setConciergerieNameError] = useState('');
  const [messageError, setMessageError] = useState('');

  // References for form fields
  const firstNameRef = useRef<HTMLInputElement>(null);
  const familyNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const geographicZoneRef = useRef<HTMLInputElement>(null);
  const conciergerieNameRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Constants for validation
  const MAX_NAME_LENGTH = 30;
  const MAX_MESSAGE_LENGTH = 500;

  const handleFormChange = (e: ChangeEventField) => {
    const { name, value } = e.target;
    setIsFormChanged(true);
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData) return;

    let error: ErrorField | undefined;

    // Check if all required fields are filled
    if (!formData.firstName?.trim())
      error = {
        message: 'Veuillez entrer un prénom',
        fieldRef: firstNameRef,
        func: setFirstNameError,
      };
    else if (formData.firstName.length > MAX_NAME_LENGTH)
      error = {
        message: `Le prénom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères`,
        fieldRef: firstNameRef,
        func: setFirstNameError,
      };
    else if (!formData.familyName?.trim())
      error = {
        message: 'Veuillez entrer un nom',
        fieldRef: familyNameRef,
        func: setFamilyNameError,
      };
    else if (formData.familyName.length > MAX_NAME_LENGTH)
      error = {
        message: `Le nom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères`,
        fieldRef: familyNameRef,
        func: setFamilyNameError,
      };
    else if (!formData.email?.trim())
      error = {
        message: 'Veuillez entrer une adresse email',
        fieldRef: emailRef,
        func: setEmailError,
      };
    else if (!formData.tel?.trim())
      error = {
        message: 'Veuillez entrer un numéro de téléphone',
        fieldRef: phoneRef,
        func: setPhoneError,
      };
    else if (!emailRegex.test(formData.email))
      error = {
        message: "Veuillez corriger le format de l'email",
        fieldRef: emailRef,
        func: setEmailError,
      };
    else if (!frenchPhoneRegex.test(formData.tel))
      error = {
        message: 'Veuillez corriger le format du numéro de téléphone',
        fieldRef: phoneRef,
        func: setPhoneError,
      };
    else if (!formData.geographicZone?.trim())
      error = {
        message: 'Veuillez entrer un lieu de vie',
        fieldRef: geographicZoneRef,
        func: setGeographicZoneError,
      };
    else if (!formData.conciergerieName?.trim())
      error = {
        message: 'Veuillez sélectionner une conciergerie',
        fieldRef: conciergerieNameRef,
        func: setConciergerieNameError,
      };
    else if (formData.message && formData.message.length > MAX_MESSAGE_LENGTH)
      error = {
        message: `Le message ne peut pas dépasser ${MAX_MESSAGE_LENGTH} caractères`,
        fieldRef: messageRef,
        func: setMessageError,
      };

    try {
      setIsSubmitting(true);

      if (error) {
        error.fieldRef.current?.focus();
        error.func(error.message);
        throw new Error(error.message);
      }

      if (!userId) throw new Error("L'identifiant n'est pas défini");

      // Create a new employee in the database
      const { employee, alreadyExists } = await createNewEmployee({
        id: userId,
        firstName: formData.firstName || '',
        familyName: formData.familyName || '',
        tel: formData.tel || '',
        email: formData.email || '',
        geographicZone: formData.geographicZone || '',
        message: formData.message,
        conciergerieName: formData.conciergerieName,
        notificationSettings: formData.notificationSettings as EmployeeNotificationSettings,
      });

      if (alreadyExists) throw new Error('Un employé avec ce nom, ce numéro de téléphone ou cet email existe déjà.');
      if (!employee) throw new Error('Employé non créé dans la base de données');

      updateUserData(employee);

      // Send notification email to conciergerie
      const selectedConciergerie = conciergeries?.find(c => c.name === employee.conciergerieName);
      if (!selectedConciergerie) throw new Error('Conciergerie non trouvée');
      if (!selectedConciergerie.email) throw new Error('Email de la conciergerie non trouvé');

      const isEmailSent = await sendEmployeeRegistrationEmail(
        selectedConciergerie.email,
        selectedConciergerie.name,
        `${employee.firstName} ${employee.familyName}`,
        employee.email,
        employee.tel,
        employee.geographicZone,
        employee.message,
      );
      setSentEmailError(!isEmailSent || undefined);

      onMenuChange(Page.Waiting);
    } catch (error) {
      setToastMessage({
        type: ToastType.Error,
        message: String(error),
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
          <label htmlFor="firstName" className={labelClassName}>
            Prénom
          </label>
          <input
            type="text"
            id="firstName"
            name="Prénom"
            ref={firstNameRef}
            value={formData.firstName}
            onChange={e => handleChange(e, () => handleFormChange(e), setFirstNameError, inputLengthRegex)}
            className={inputFieldClassName(firstNameError)}
            disabled={isSubmitting}
            placeholder="Jean"
            required
          />
          {!!firstNameError && <p className={errorClassName}>{firstNameError}</p>}
        </div>

        <div>
          <label htmlFor="familyName" className={labelClassName}>
            Nom
          </label>
          <input
            type="text"
            id="familyName"
            name="Nom"
            ref={familyNameRef}
            value={formData.familyName}
            onChange={e => handleChange(e, () => handleFormChange(e), setFamilyNameError, inputLengthRegex)}
            className={inputFieldClassName(familyNameError)}
            disabled={isSubmitting}
            placeholder="Dupont"
            required
          />
          {!!familyNameError && <p className={errorClassName}>{familyNameError}</p>}
        </div>

        <div>
          <label htmlFor="tel" className={labelClassName}>
            Téléphone
          </label>
          <input
            type="tel"
            id="tel"
            name="Téléphone"
            ref={phoneRef}
            value={formData.tel}
            onChange={e => handleChange(e, () => handleFormChange(e), setPhoneError, frenchPhoneRegex)}
            className={inputFieldClassName(phoneError)}
            disabled={isSubmitting}
            placeholder="06 12 34 56 78"
            required
          />
          {!!phoneError && <p className={errorClassName}>{phoneError}</p>}
        </div>

        <div>
          <label htmlFor="email" className={labelClassName}>
            Email
          </label>
          <input
            type="email"
            id="email"
            name="Email"
            ref={emailRef}
            value={formData.email}
            onChange={e => handleChange(e, () => handleFormChange(e), setEmailError, emailRegex)}
            className={inputFieldClassName(emailError)}
            disabled={isSubmitting}
            placeholder="jean.dupont@example.com"
            required
          />
          {!!emailError && <p className={errorClassName}>{emailError}</p>}
        </div>

        <div>
          <label className={labelClassName}>Lieu de vie</label>
          <Combobox
            id="geographic-zone"
            ref={geographicZoneRef}
            options={geographicZones}
            value={formData.geographicZone || ''}
            onChange={e => handleFormChange({ target: { name: 'geographicZone', value: e } })}
            disabled={isSubmitting}
            placeholder="Sélectionnez un lieu de vie..."
            error={geographicZoneError}
          />
        </div>

        <div>
          <label htmlFor="conciergerie" className={labelClassName}>
            Conciergerie
            <Tooltip>
              C&apos;est la conciergerie par laquelle vous avez connu ce site, qui recevra votre candidature et qui
              validera votre inscription.
            </Tooltip>
          </label>
          <Select
            id="conciergerie"
            ref={conciergerieNameRef}
            options={conciergeries.map(c => c.name)}
            value={formData.conciergerieName || ''}
            onChange={e => handleFormChange({ target: { name: 'conciergerie', value: e } })}
            disabled={isSubmitting}
            placeholder="Sélectionner une conciergerie"
            error={conciergerieNameError}
          />
        </div>

        <div>
          <label htmlFor="message" className={labelClassName}>
            Message (facultatif)
          </label>
          <div className="relative">
            <textarea
              id="message"
              name="Message"
              ref={messageRef}
              value={formData.message}
              onChange={e => handleChange(e, () => handleFormChange(e), setMessageError)}
              className={inputFieldClassName(messageError)}
              rows={4}
              disabled={isSubmitting}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Exemple : Nous nous sommes rencontrés lors de l'événement Machin à Trucville."
            />
            {messageError ? (
              <p className={errorClassName}>{messageError}</p>
            ) : (
              <div className={textAreaCharCountClassName}>
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
