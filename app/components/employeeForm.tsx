'use client';

import { createNewEmployee, updateEmployeeWithUserId } from '@/app/actions/employee';
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
import { EmailSender } from '@/app/utils/emailSender';
import { formatId, getDevices, MaxDevicesError, MAX_DEVICES } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import { Page } from '@/app/utils/navigation';
import { emailRegex, frenchPhoneRegex, getMaxLength, inputLengthRegex, messageLengthRegex } from '@/app/utils/regex';
import { useRateLimiter } from '@/app/hooks/useRateLimiter';
import React, { useRef, useState } from 'react';

type EmployeeFormProps = {
  onClose: () => void;
};

export default function EmployeeForm({ onClose }: EmployeeFormProps) {
  const { userId, conciergeries, updateUserData, employees, findConciergerie, refreshData } = useAuth();
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
  const [maxDevicesPrompt, setMaxDevicesPrompt] = useState<{ oldestId: string; employee: Employee } | null>(null);

  // Contact error handling for phone/email conflict
  const [showContactButton, setShowContactButton] = useState(false);

  // Rate limiting for contact button (3 attempts, 5 min cooldown)
  const { canAttempt, remainingCooldown, attemptsRemaining, attempt } = useRateLimiter('employee_conflict', 3, 5);

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

  // Send conflict report to conciergerie using rate limiter
  const sendConflictReport = async () => {
    if (!canAttempt || !formData || !userId) return;

    if (!attempt()) {
      setToast({ type: ToastType.Error, message: 'Veuillez patienter avant de réessayer' });
      return;
    }

    const selectedConciergerie = findConciergerie(formData.conciergerieName ?? null);
    if (!selectedConciergerie?.email) {
      setToast({ type: ToastType.Error, message: 'Email de la conciergerie non disponible' });
      return;
    }

    const { sendEmployeeConflictReport } = await import('@/app/actions/email');

    sendEmployeeConflictReport(selectedConciergerie.email, {
      firstName: formData.firstName,
      familyName: formData.familyName,
      tel: formData.tel,
      email: formData.email,
      geographicZone: formData.geographicZone || '',
      conciergerieName: formData.conciergerieName || '',
      userId,
    })
      .then((success: boolean) => {
        if (success) {
          setToast({ type: ToastType.Success, message: 'Message envoyé à votre conciergerie' });
          setShowContactButton(false);
        } else {
          setToast({ type: ToastType.Error, message: "Échec de l'envoi. Veuillez réessayer." });
        }
      })
      .catch(() => {
        setToast({ type: ToastType.Error, message: "Erreur lors de l'envoi" });
      });
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

      // Find the employee that matches the criteria (trim values for comparison)
      const trimmedFirstName = formData.firstName.trim();
      const trimmedFamilyName = formData.familyName.trim();
      const trimmedTel = formData.tel.trim();
      const trimmedEmail = formData.email.trim();

      const employee = employees.find(
        employee =>
          employee.firstName.toLowerCase() === trimmedFirstName.toLowerCase() &&
          employee.familyName.toLowerCase() === trimmedFamilyName.toLowerCase(),
      );

      if (employee) {
        try {
          await proceedWithDeviceUpdate(employee, false);
        } catch (err) {
          if (err instanceof MaxDevicesError) {
            setMaxDevicesPrompt({ oldestId: err.oldestDevice, employee });
            setIsSubmitting(false);
            return;
          }
          throw err;
        }
      } else {
        // Check for existing employee by phone/email (using trimmed values)
        const existingByContact = employees.find(
          employee => employee.tel === trimmedTel || employee.email === trimmedEmail,
        );

        if (existingByContact) {
          // Phone/email exists but name doesn't match - show contact button instead of revealing name
          setShowContactButton(true);
          setIsSubmitting(false);
          return;
        }

        // Create a new employee in the database (with trimmed values)
        const newEmployee = await createNewEmployee({
          ...formData,
          firstName: trimmedFirstName,
          familyName: trimmedFamilyName,
          tel: trimmedTel,
          email: trimmedEmail,
          id: userId,
        });
        if (!newEmployee) throw new Error('Employé non créé dans la base de données');

        updateUserData(newEmployee);

        // Send notification email to conciergerie
        const selectedConciergerie = findConciergerie(newEmployee.conciergerieName ?? null);
        if (!selectedConciergerie) throw new Error('Conciergerie non trouvée');
        if (!selectedConciergerie.email) throw new Error('Email de la conciergerie non trouvé');

        // Use EmailSender for consistent retry mechanism
        await EmailSender.sendRegistrationEmail(
          { setToast, showSuccessToast: true },
          selectedConciergerie,
          newEmployee,
        );

        // Wait a bit before redirecting to allow the email to be sent and a toast to be displayed
        setTimeout(() => onMenuChange(Page.Waiting), 1500);
      }
    } catch (error) {
      setToast({
        type: ToastType.Error,
        message: String(error),
        error,
      });
      setIsSubmitting(false);
    }
  };

  const proceedWithDeviceUpdate = async (employee: Employee, evictOldest: boolean) => {
    if (!userId) throw new Error("L'identifiant n'est pas défini");

    const newIds = getDevices(employee.id, userId, true, evictOldest);
    if (employee.status === 'accepted' && JSON.stringify(newIds) !== JSON.stringify(employee.id)) {
      const updatedIds = await updateEmployeeWithUserId(employee, newIds);

      if (!updatedIds) throw new Error('Employé non mis à jour dans la base de données');

      // Update the employee object with the new ID array
      const updatedEmployee = {
        ...employee,
        id: updatedIds,
      };

      // Update local user data and redirect based on status
      updateUserData(updatedEmployee);

      // Send notification email to employee about the new device
      await EmailSender.sendNewDeviceEmail({ setToast, showSuccessToast: true }, updatedEmployee, userId);

      // Wait a bit before refreshing to allow the email to be sent and a toast to be displayed
      setTimeout(refreshData, 1500);
    } else {
      onMenuChange(Page.Waiting);
    }
  };

  const handleConfirmEviction = () => {
    if (!maxDevicesPrompt) return;
    const { employee } = maxDevicesPrompt;
    setMaxDevicesPrompt(null);
    setIsSubmitting(true);
    proceedWithDeviceUpdate(employee, true).catch(error => {
      setToast({
        type: ToastType.Error,
        message: String(error),
        error,
      });
      setIsSubmitting(false);
    });
  };

  if (!formData) return null;

  if (!conciergeries?.length)
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background">
        <h2 className="text-2xl font-bold mb-2">Conciergerie</h2>
        <p className="text-foreground">Aucune conciergerie trouvée !</p>
      </div>
    );

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-start bg-background pt-2">
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

        {/* Contact conciergerie button for phone/email conflict */}
        {showContactButton && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-yellow-800 mb-3">
              Ce numéro de téléphone ou email est déjà associé à un compte. Si vous pensez qu&apos;il s&apos;agit
              d&apos;une erreur, vous pouvez contacter votre conciergerie.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={sendConflictReport}
                disabled={!canAttempt || isSubmitting}
                className="w-full py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {remainingCooldown > 0
                  ? `Réessayez dans ${Math.ceil(remainingCooldown / 60)} min`
                  : attemptsRemaining <= 1
                    ? 'Envoyer un message (dernier essai)'
                    : 'Envoyer un message à ma conciergerie'}
              </button>
              <button
                type="button"
                onClick={() => setShowContactButton(false)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Retour au formulaire
              </button>
            </div>
          </div>
        )}

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

        <ConfirmationModal
          isOpen={!!maxDevicesPrompt}
          onClose={() => setMaxDevicesPrompt(null)}
          onConfirm={handleConfirmEviction}
          title="Limite d'appareils atteinte"
          message={`Vous avez déjà ${MAX_DEVICES} appareils connectés. Si vous continuez, le plus ancien (${
            maxDevicesPrompt ? formatId(maxDevicesPrompt.oldestId) : ''
          }) sera déconnecté et un email vous sera envoyé pour valider ce nouvel appareil.`}
          confirmText="Continuer"
          cancelText="Annuler"
          isDangerous
        />
      </form>
    </div>
  );
}
