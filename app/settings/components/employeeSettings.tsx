import { updateEmployeeData } from '@/app/actions/employee';
import LoadingSpinner from '@/app/components/loadingSpinner';
import { ToastMessage, Toast, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { Employee, ErrorField } from '@/app/types/types';
import { emailRegex, frenchPhoneRegex } from '@/app/utils/regex';
import { clsx } from 'clsx/lite';
import React, { useEffect, useState } from 'react';

const EmployeeSettings: React.FC = () => {
  const { userId, isLoading: authLoading, getUserData, updateUserData } = useAuth();

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // References for form fields
  const emailRef = React.useRef<HTMLInputElement>(null);
  const phoneRef = React.useRef<HTMLInputElement>(null);

  // Form state for editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<Toast>();

  // Track original values for comparison
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalTel, setOriginalTel] = useState('');

  // Load user info and set form values
  useEffect(() => {
    const employee = getUserData<Employee>();
    if (!employee) return;

    // Set employee data for form
    setName(employee.firstName + ' ' + employee.familyName);
    setEmail(employee.email);
    setTel(employee.tel);

    // Store original values for comparison
    setOriginalEmail(employee.email);
    setOriginalTel(employee.tel);
  }, [userId, getUserData]);

  const hasChanges = () => {
    const emailChanged = email !== originalEmail;
    const telChanged = tel !== originalTel;
    return emailChanged || telChanged;
  };

  // Handle form submission
  const handleSave = async () => {
    let error: ErrorField | undefined;

    if (!email.trim())
      error = {
        message: 'Veuillez entrer une adresse email',
        fieldRef: emailRef,
        func: setEmailError,
      };
    else if (!tel.trim())
      error = {
        message: 'Veuillez entrer un numéro de téléphone',
        fieldRef: phoneRef,
        func: setPhoneError,
      };
    else if (!emailRegex.test(email))
      error = {
        message: "Veuillez corriger le format de l'email",
        fieldRef: emailRef,
        func: setEmailError,
      };
    else if (!frenchPhoneRegex.test(tel))
      error = {
        message: 'Veuillez corriger le format du numéro de téléphone',
        fieldRef: phoneRef,
        func: setPhoneError,
      };

    try {
      setIsSaving(true);

      if (error) {
        error.fieldRef.current?.focus();
        error.func(error.message);
        throw new Error(error.message);
      }

      if (!userId) throw new Error("L'identifiant n'est pas défini");

      const updatedEmployee = await updateEmployeeData(userId, {
        email,
        tel,
        message: undefined,
        conciergerieName: undefined,
      });
      if (!updatedEmployee) throw new Error('Paramètres non mis à jour dans la base de données');

      updateUserData(updatedEmployee);

      // Update original values to match current values after save
      setOriginalEmail(email);
      setOriginalTel(tel);

      // Show success toast
      setToastMessage({
        type: ToastType.Success,
        message: 'Modifications enregistrées avec succès',
      });
    } catch (error) {
      setToastMessage({
        type: ToastType.Error,
        message: String(error),
        error,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <ToastMessage toast={toastMessage} onClose={() => setToastMessage(undefined)} />

      <div>
        <p className="text-sm text-foreground/70 mb-1">Nom</p>
        <p className="font-medium">{name}</p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground/70 mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          ref={emailRef}
          value={email}
          onChange={e => {
            const newValue = e.target.value;
            setEmail(newValue);
            setEmailError(newValue && !emailRegex.test(newValue) ? 'Format d&apos;email invalide' : '');
          }}
          className={clsx(
            'w-full px-3 py-2 rounded-lg bg-background text-foreground',
            emailError
              ? 'border-red-500 focus-visible:outline-red-500 border-2'
              : 'border-secondary focus-visible:outline-primary border',
          )}
          disabled={isSaving}
          placeholder="jean.dupont@example.com"
        />
        {emailError ? <p className="text-red-500 text-sm mt-1">{emailError}</p> : null}
      </div>

      <div>
        <label htmlFor="tel" className="block text-sm font-medium text-foreground/70 mb-1">
          Téléphone
        </label>
        <input
          type="tel"
          id="tel"
          ref={phoneRef}
          value={tel}
          onChange={e => {
            const newValue = e.target.value;
            setTel(newValue);
            setPhoneError(newValue && !frenchPhoneRegex.test(newValue) ? 'Format de numéro de téléphone invalide' : '');
          }}
          className={clsx(
            'w-full px-3 py-2 rounded-lg bg-background text-foreground',
            phoneError
              ? 'border-red-500 focus-visible:outline-red-500 border-2'
              : 'border-secondary focus-visible:outline-primary border',
          )}
          disabled={isSaving}
          placeholder="06 12 34 56 78"
        />
        {phoneError ? <p className="text-red-500 text-sm mt-1">{phoneError}</p> : null}
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges()}
          className={`px-4 py-2 text-white rounded-md transition-colors ${
            hasChanges() ? 'bg-primary hover:bg-primary/80' : 'bg-primary/50 cursor-not-allowed'
          }`}
        >
          {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  );
};

export default EmployeeSettings;
