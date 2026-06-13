'use client';

import { createNewEmployee, lookupEmployeeByContact, updateEmployeeWithUserId } from '@/app/actions/employee';
import AppVersion from '@/app/components/appVersion';
import Combobox from '@/app/components/combobox';
import ConfirmationModal from '@/app/components/confirmationModal';
import FormActions from '@/app/components/formActions';
import Input from '@/app/components/input';
import Select from '@/app/components/select';
import TextArea from '@/app/components/textArea';
import { ToastType } from '@/app/components/toastMessage';
import Tooltip from '@/app/components/tooltip';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { useToast } from '@/app/contexts/toastProvider';
import geographicZones from '@/app/data/geographicZone.json';
import { useRateLimiter } from '@/app/hooks/useRateLimiter';
import type { Employee } from '@/app/types/dataTypes';
import { EmailSender } from '@/app/utils/emailSender';
import { normalizeFamilyName, normalizeFirstName } from '@/app/utils/employee';
import { formatId, getDevices, MAX_DEVICES, MaxDevicesError } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import { Page } from '@/app/utils/navigation';
import { messageLengthRegex } from '@/app/utils/regex';
import { useRef, useState } from 'react';
import { buttonClassName, cn } from '../utils/className';

type EmployeeFormProps = {
  onClose: () => void;
};

export default function EmployeeForm({ onClose }: EmployeeFormProps) {
  const { userId, conciergeries, updateUserData, updateUserType, findConciergerie, isLoading, generateId } = useAuth();
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
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [maxDevicesPrompt, setMaxDevicesPrompt] = useState<{ oldestId: string; employee: Employee } | null>(null);

  // Contact error handling for phone/email conflict
  const [showContactButton, setShowContactButton] = useState(false);
  const [conflictEmployee, setConflictEmployee] = useState<{ firstName: string; familyName: string } | null>(null);

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

  // Send conflict report to conciergerie using rate limiter
  const sendConflictReport = async () => {
    if (!canAttempt || !formData || !userId) return;

    if (!attempt()) {
      showToast({ type: ToastType.Error, message: 'Veuillez patienter avant de réessayer' });
      return;
    }

    const selectedConciergerie = findConciergerie(formData.conciergerieName ?? null);
    if (!selectedConciergerie?.email) {
      showToast({ type: ToastType.Error, message: 'Email de la conciergerie non disponible' });
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
      existingName: conflictEmployee ? `${conflictEmployee.firstName} ${conflictEmployee.familyName}` : undefined,
    })
      .then((success: boolean) => {
        if (success) {
          showToast({ type: ToastType.Success, message: 'Message envoyé à votre conciergerie' });
          setShowContactButton(false);
        } else {
          showToast({ type: ToastType.Error, message: "Échec de l'envoi. Veuillez réessayer." });
        }
      })
      .catch(() => {
        showToast({ type: ToastType.Error, message: "Erreur lors de l'envoi" });
      });
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault();

    if (!formData) return;

    // Normalize name fields
    const normalizedFormData = {
      ...formData,
      firstName: normalizeFirstName(formData.firstName),
      familyName: normalizeFamilyName(formData.familyName),
    };

    // Validate special required fields
    if (!normalizedFormData.geographicZone?.trim()) {
      geographicZoneRef.current?.focus();
      geographicZoneRef.current?.blur();
      return;
    }

    try {
      setIsSubmitting(true);

      // Generate userId if not available
      const currentUserId = generateId();

      // Find the employee that matches the criteria (trim values for comparison)
      const lookup = await lookupEmployeeByContact(
        normalizedFormData.firstName,
        normalizedFormData.familyName,
        normalizedFormData.tel,
        normalizedFormData.email,
      );

      if (lookup) {
        if (!lookup.nameMatches) {
          setConflictEmployee({ firstName: lookup.employee.firstName, familyName: lookup.employee.familyName });
          setShowContactButton(true);
          setIsSubmitting(false);
          return;
        }
        try {
          await proceedWithDeviceUpdate(lookup.employee, false);
        } catch (err) {
          if (err instanceof MaxDevicesError) {
            setMaxDevicesPrompt({ oldestId: err.oldestDevice, employee: lookup.employee });
            setIsSubmitting(false);
            return;
          }
          throw err;
        }
      } else {
        // Create a new employee in the database (with normalized values)
        const newEmployee = await createNewEmployee({
          ...normalizedFormData,
          id: currentUserId,
        });
        if (!newEmployee) throw new Error('Prestataire non créé dans la base de données');

        updateUserType('employee');
        updateUserData(newEmployee, 'employee');

        // Clear saved form data so a different user on the same device starts fresh
        setFormData({
          firstName: '',
          familyName: '',
          tel: '',
          email: '',
          geographicZone: '',
          conciergerieName: conciergeries?.[0]?.name || '',
          message: '',
        });

        // Send notification email to conciergerie
        const selectedConciergerie = findConciergerie(newEmployee.conciergerieName ?? null);
        if (!selectedConciergerie) throw new Error('Conciergerie non trouvée');
        if (!selectedConciergerie.email) throw new Error('Email de la conciergerie non trouvé');

        // Use EmailSender for consistent retry mechanism
        await EmailSender.sendRegistrationEmail(selectedConciergerie, newEmployee);
        showToast({ type: ToastType.Success, message: "L'email de notification a été envoyé avec succès" });

        // Wait a bit before redirecting to allow the email to be sent and a toast to be displayed
        setTimeout(() => onMenuChange(Page.Waiting), 1500);
      }
    } catch (error) {
      showToast({
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

      if (!updatedIds) throw new Error('Prestataire non mis à jour dans la base de données');

      // Update the employee object with the new ID array
      const updatedEmployee = {
        ...employee,
        id: updatedIds,
      };

      // Update local user data and userType so auth context is fully set before navigating
      updateUserType('employee');
      updateUserData(updatedEmployee, 'employee');

      // Send notification email to employee about the new device
      await EmailSender.sendNewDeviceEmail(updatedEmployee, userId);
      showToast({
        type: ToastType.Success,
        message: "L'email de notification de nouvel appareil a été envoyé avec succès",
      });

      // Wait a bit before redirecting to allow the email to be sent and a toast to be displayed
      setTimeout(() => onMenuChange(Page.Waiting), 1500);
    } else {
      updateUserType('employee');
      updateUserData(employee, 'employee');
      onMenuChange(employee.status === 'accepted' ? Page.Missions : Page.Waiting);
    }
  };

  const handleConfirmEviction = () => {
    if (!maxDevicesPrompt) return;
    const { employee } = maxDevicesPrompt;
    setMaxDevicesPrompt(null);
    setIsSubmitting(true);
    proceedWithDeviceUpdate(employee, true).catch(error => {
      showToast({
        type: ToastType.Error,
        message: String(error),
        error,
      });
      setIsSubmitting(false);
    });
  };

  if (!formData || isLoading) return null;

  if (!conciergeries?.length)
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background">
        <h2 className="text-2xl font-bold mb-2">Conciergerie</h2>
        <p className="text-foreground">Aucune conciergerie trouvée !</p>
      </div>
    );

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-start bg-background pt-2">
      <h2 className="text-2xl font-bold mb-2">Inscription Prestataire</h2>

      <form onSubmit={handleSubmit} className="w-full px-4 space-y-2">
        <Input
          id="firstName"
          label="Prénom"
          ref={firstNameRef}
          value={formData.firstName}
          onChange={e => setFormData({ ...formData, firstName: e })}
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
          onChange={e => setFormData({ ...formData, familyName: e })}
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
          onChange={e => setFormData({ ...formData, tel: e })}
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
          onChange={e => setFormData({ ...formData, email: e })}
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
          onChange={e => setFormData({ ...formData, geographicZone: e })}
          disabled={isSubmitting}
          placeholder="Sélectionnez un lieu de vie..."
          error={geographicZoneError}
          onError={setGeographicZoneError}
          required
        />

        <Select
          id="conciergerie"
          label={
            <div className="flex items-center">
              <Tooltip trigger="Conciergerie">
                C&apos;est la conciergerie par laquelle vous avez connu ce site, qui recevra votre candidature et qui
                validera votre inscription.
              </Tooltip>
            </div>
          }
          ref={conciergerieNameRef}
          options={conciergeries.map(c => c.name)}
          value={formData.conciergerieName || ''}
          onChange={e => setFormData({ ...formData, conciergerieName: e })}
          disabled={isSubmitting}
          placeholder="Sélectionner une conciergerie"
          error={conciergerieNameError}
          onError={setConciergerieNameError}
          required
        />

        <TextArea
          id="message"
          label="Message"
          ref={messageRef}
          value={formData.message}
          onChange={value => setFormData({ ...formData, message: value })}
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
                className={cn(buttonClassName('primary'), 'w-full')}
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
                className="text-sm text-gray-500 hover:text-gray-700 underline cursor-pointer"
              >
                Retour au formulaire
              </button>
            </div>
          </div>
        )}

        <FormActions
          onCancel={() => {
            const hasChanges =
              formData &&
              Object.entries(formData)
                .filter(([key]) => key !== 'conciergerieName')
                .some(([, value]) => value !== '');
            if (hasChanges) {
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

      <AppVersion flow />
    </div>
  );
}
