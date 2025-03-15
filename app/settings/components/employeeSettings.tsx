import LoadingSpinner from '@/app/components/loadingSpinner';
import { ToastMessage, ToastProps, ToastType } from '@/app/components/toastMessage';
import { Employee } from '@/app/types/types';
import { emailRegex, frenchPhoneRegex } from '@/app/utils/regex';
import { getWelcomeParams, updateEmployeeData } from '@/app/utils/welcomeParams';
import { clsx } from 'clsx/lite';
import React, { useEffect, useState } from 'react';

const EmployeeSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<Employee & { id: string }>();

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  // References for form fields
  const emailRef = React.useRef<HTMLInputElement>(null);
  const phoneRef = React.useRef<HTMLInputElement>(null);

  // Form state for editable fields
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastProps>();

  // Track original values for comparison
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalTel, setOriginalTel] = useState('');

  // Load user info and set form values
  useEffect(() => {
    setIsLoading(true);
    // Add a small delay to simulate loading and ensure localStorage is read
    // await new Promise(resolve => setTimeout(resolve, 500));

    const params = getWelcomeParams();
    setUserInfo(params.employeeData);

    if (params.employeeData) {
      // Set employee data for form
      setEmail(params.employeeData.email || '');
      setTel(params.employeeData.tel || '');

      // Store original values for comparison
      setOriginalEmail(params.employeeData.email || '');
      setOriginalTel(params.employeeData.tel || '');
    }

    setIsLoading(false);
  }, []);

  const hasChanges = () => {
    if (!userInfo) return false;

    const emailChanged = email !== originalEmail;
    const telChanged = tel !== originalTel;
    return emailChanged || telChanged;
  };

  // Handle form submission
  const handleSave = () => {
    if (!userInfo) return;

    setIsFormSubmitted(true);

    // Validate required fields
    if (!email) {
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez remplir tous les champs obligatoires',
      });
      // Focus on email field
      emailRef.current?.focus();
      return;
    }

    // Validate required phone number
    if (!tel) {
      setPhoneError('Veuillez entrer un numéro de téléphone');
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez remplir tous les champs obligatoires',
      });
      // Focus on phone field
      phoneRef.current?.focus();
      return;
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      setEmailError("Format d'email invalide");
      setToastMessage({
        type: ToastType.Error,
        message: "Veuillez corriger le format de l'email",
      });
      // Focus on email field
      emailRef.current?.focus();
      return;
    }

    // Validate phone format
    if (!frenchPhoneRegex.test(tel)) {
      setPhoneError('Format de numéro de téléphone invalide');
      setToastMessage({
        type: ToastType.Error,
        message: 'Veuillez corriger le format du numéro de téléphone',
      });
      // Focus on phone field
      phoneRef.current?.focus();
      return;
    }

    setIsSaving(true);

    try {
      // Update employee data
      const updatedData = {
        ...userInfo,
        email,
        tel,
        message: undefined,
        conciergerieName: undefined,
      };

      // Save to localStorage
      updateEmployeeData(updatedData);

      // Update local state
      setUserInfo(updatedData);

      // Update original values to match current values after save
      setOriginalEmail(email);
      setOriginalTel(tel);

      // Show success toast
      setToastMessage({
        type: ToastType.Success,
        message: 'Modifications enregistrées avec succès',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setToastMessage({
        type: ToastType.Error,
        message: 'Erreur lors de l&apos;enregistrement',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100dvh-9rem)] flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Chargement..." />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {toastMessage && (
        <ToastMessage
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => setToastMessage(undefined)}
        />
      )}

      <div>
        <p className="text-sm text-foreground/70 mb-1">Nom</p>
        <p className="font-medium">
          {userInfo?.firstName} {userInfo?.familyName}
        </p>
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
            if (newValue && !emailRegex.test(newValue)) {
              setEmailError('Format d&apos;email invalide');
            } else {
              setEmailError('');
            }
          }}
          className={clsx(
            'w-full p-2 border rounded-md',
            'border-foreground/20',
            'focus:outline-none focus:ring-2',
            (isFormSubmitted && !email) || emailError ? 'border-red-500' : '',
          )}
          style={
            {
              '--tw-ring-color': 'var(--color-primary)',
            } as React.CSSProperties
          }
        />
        {isFormSubmitted && !email ? (
          <p className="text-red-500 text-sm mt-1">Veuillez entrer une adresse email</p>
        ) : emailError ? (
          <p className="text-red-500 text-sm mt-1">{emailError}</p>
        ) : null}
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
            if (newValue && !frenchPhoneRegex.test(newValue)) {
              setPhoneError('Format de numéro de téléphone invalide');
            } else {
              setPhoneError('');
            }
          }}
          className={clsx(
            'w-full p-2 border rounded-md',
            'border-foreground/20',
            'focus:outline-none focus:ring-2',
            (isFormSubmitted && !tel) || phoneError ? 'border-red-500' : '',
          )}
          placeholder="Ex: 06 12 34 56 78"
          style={
            {
              '--tw-ring-color': 'var(--color-primary)',
            } as React.CSSProperties
          }
        />
        {isFormSubmitted && !tel ? (
          <p className="text-red-500 text-sm mt-1">Veuillez entrer un numéro de téléphone</p>
        ) : phoneError ? (
          <p className="text-red-500 text-sm mt-1">{phoneError}</p>
        ) : null}
      </div>

      <div className="flex justify-center">
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
