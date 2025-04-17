'use client';

import { sendEmployeeRegistrationEmail } from '@/app/actions/email';
import { createNewEmployee } from '@/app/actions/employee';
import Combobox from '@/app/components/combobox';
import ConfirmationModal from '@/app/components/confirmationModal';
import FormActions from '@/app/components/formActions';
import Input from '@/app/components/input';
import Select from '@/app/components/select';
import TextArea from '@/app/components/textArea';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import Tooltip from '@/app/components/tooltip';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import geographicZones from '@/app/data/geographicZone.json';
import { Employee } from '@/app/types/dataTypes';
import { ErrorField } from '@/app/types/types';
import { employeeExists } from '@/app/utils/employee';
import { useLocalStorage } from '@/app/utils/localStorage';
import { Page } from '@/app/utils/navigation';
import { emailRegex, frenchPhoneRegex, getMaxLength, inputLengthRegex, messageLengthRegex } from '@/app/utils/regex';
import React, { useRef, useState } from 'react';

type EmployeeFormProps = {
  onClose: () => void;
};

export default function EmployeeForm({ onClose }: EmployeeFormProps) {
  const { userId, conciergeries, updateUserData, employees } = useAuth();
  const { onMenuChange } = useMenuContext();

  // Using Partial<Employee> since we don't have status and createdAt yet
  const [formData, setFormData] = useLocalStorage<Omit<Employee, 'id' | 'status' | 'createdAt'>>('employee_data', {
    firstName: '',
    familyName: '',
    tel: '',
    email: '',
    geographicZone: '',
    conciergerieName: conciergeries?.[0]?.name || '',
    message: '',
  });
  const [toast, setToast] = useState<Toast>();
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

  const handleFormChange = (name: string, value: string) => {
    setIsFormChanged(true);
    setFormData(prev => ({
      ...prev!,
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
    else if (formData.firstName.length > getMaxLength(inputLengthRegex))
      error = {
        message: `Le prénom ne peut pas dépasser ${getMaxLength(inputLengthRegex)} caractères`,
        fieldRef: firstNameRef,
        func: setFirstNameError,
      };
    else if (!formData.familyName?.trim())
      error = {
        message: 'Veuillez entrer un nom',
        fieldRef: familyNameRef,
        func: setFamilyNameError,
      };
    else if (formData.familyName.length > getMaxLength(inputLengthRegex))
      error = {
        message: `Le nom ne peut pas dépasser ${getMaxLength(inputLengthRegex)} caractères`,
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
    else if (formData.message && formData.message.length > getMaxLength(messageLengthRegex))
      error = {
        message: `Le message ne peut pas dépasser ${getMaxLength(messageLengthRegex)} caractères`,
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

      // Check if employee already exists with the same name, phone, or email
      if (
        employeeExists(
          employees,
          formData.firstName || '',
          formData.familyName || '',
          formData.tel || '',
          formData.email || '',
        )
      )
        throw new Error('Un employé avec ce nom, ce numéro de téléphone ou cet email existe déjà.');

      // Create a new employee in the database
      const employee = await createNewEmployee({
        ...formData,
        id: userId,
      });
      if (!employee) throw new Error('Employé non créé dans la base de données');

      updateUserData(employee);

      // Send notification email to conciergerie
      const selectedConciergerie = conciergeries.find(c => c.name === employee.conciergerieName);
      if (!selectedConciergerie) throw new Error('Conciergerie non trouvée');
      if (!selectedConciergerie.email) throw new Error('Email de la conciergerie non trouvé');

      sendEmployeeRegistrationEmail(selectedConciergerie, employee);

      onMenuChange(Page.Waiting);
    } catch (error) {
      setToast({
        type: ToastType.Error,
        message: String(error),
        error,
      });
      setIsSubmitting(false);
    }
  };

  if (!formData) return null;

  if (!conciergeries?.length)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <h2 className="text-2xl font-bold mb-2">Conciergerie</h2>
        <p className="text-foreground">Aucune conciergerie trouvée !</p>
      </div>
    );

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center bg-background">
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />

      <h2 className="text-2xl font-bold mb-2">Inscription Prestataire</h2>

      <form onSubmit={handleSubmit} className="w-full px-4 space-y-2">
        <Input
          id="firstName"
          label="Prénom"
          ref={firstNameRef}
          value={formData.firstName}
          onChange={e => handleFormChange('firstName', e)}
          error={firstNameError}
          onError={setFirstNameError}
          disabled={isSubmitting}
          placeholder="Jean"
          required
        />

        <Input
          id="familyName"
          label="Nom"
          ref={familyNameRef}
          value={formData.familyName}
          onChange={e => handleFormChange('familyName', e)}
          error={familyNameError}
          onError={setFamilyNameError}
          disabled={isSubmitting}
          placeholder="Dupont"
          required
        />

        <Input
          id="tel"
          label="Téléphone"
          ref={phoneRef}
          value={formData.tel}
          onChange={e => handleFormChange('tel', e)}
          error={phoneError}
          onError={setPhoneError}
          disabled={isSubmitting}
          placeholder="06 12 34 56 78"
          required
        />

        <Input
          id="email"
          label="Email"
          ref={emailRef}
          value={formData.email}
          onChange={e => handleFormChange('email', e)}
          error={emailError}
          onError={setEmailError}
          disabled={isSubmitting}
          placeholder="jean.dupont@example.com"
          required
        />

        <Combobox
          id="geographic-zone"
          label="Lieu de vie"
          ref={geographicZoneRef}
          options={geographicZones}
          value={formData.geographicZone || ''}
          onChange={e => handleFormChange('geographicZone', e)}
          disabled={isSubmitting}
          placeholder="Sélectionnez un lieu de vie..."
          error={geographicZoneError}
          required
        />

        <Select
          id="conciergerie"
          label={
            <div className="flex items-center">
              Conciergerie
              <Tooltip>
                C&apos;est la conciergerie par laquelle vous avez connu ce site, qui recevra votre candidature et qui
                validera votre inscription.
              </Tooltip>
            </div>
          }
          ref={conciergerieNameRef}
          options={conciergeries.map(c => c.name)}
          value={formData.conciergerieName || ''}
          onChange={e => handleFormChange('conciergerieName', e)}
          disabled={isSubmitting}
          placeholder="Sélectionner une conciergerie"
          error={conciergerieNameError}
          required
        />

        <TextArea
          id="message"
          label="Message"
          ref={messageRef}
          value={formData.message}
          onChange={value => handleFormChange('message', value)}
          error={messageError}
          onError={setMessageError}
          disabled={isSubmitting}
          placeholder="Exemple : Nous nous sommes rencontrés lors de l'événement Machin à Trucville."
          regex={messageLengthRegex}
        />

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
