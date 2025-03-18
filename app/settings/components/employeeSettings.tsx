import { fetchEmployeeById, updateEmployeeData } from '@/app/actions/employee';
import LoadingSpinner from '@/app/components/loadingSpinner';
import { ToastMessage, ToastProps, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { emailRegex, frenchPhoneRegex } from '@/app/utils/regex';
import { clsx } from 'clsx/lite';
import React, { useEffect, useState } from 'react';

const EmployeeSettings: React.FC = () => {
  const { userId } = useAuth();

  const [isLoading, setIsLoading] = useState(true);

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  // References for form fields
  const emailRef = React.useRef<HTMLInputElement>(null);
  const phoneRef = React.useRef<HTMLInputElement>(null);

  // Form state for editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastProps>();

  // Track original values for comparison
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalTel, setOriginalTel] = useState('');

  // Load user info and set form values
  useEffect(() => {
    const loadEmployeeData = async () => {
      setIsLoading(true);
      try {
        const employee = await fetchEmployeeById(userId!);
        if (employee) {
          // Set employee data for form
          setName(employee.firstName + ' ' + employee.familyName);
          setEmail(employee.email);
          setTel(employee.tel);

          // Store original values for comparison
          setOriginalEmail(employee.email);
          setOriginalTel(employee.tel);
        }
      } catch (error) {
        setToastMessage({
          type: ToastType.Error,
          message: 'Erreur lors du chargement des données',
          error,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployeeData();
  }, [userId]);

  const hasChanges = () => {
    const emailChanged = email !== originalEmail;
    const telChanged = tel !== originalTel;
    return emailChanged || telChanged;
  };

  // Handle form submission
  const handleSave = async () => {
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
      if (userId) {
        await updateEmployeeData(userId, {
          email,
          tel,
          message: undefined,
          conciergerieName: undefined,
        });
      } else {
        setToastMessage({
          type: ToastType.Error,
          message: 'Erreur: impossible de mettre à jour l&apos;employé (ID manquant)',
        });
        setIsSaving(false);
        return;
      }

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
        message: 'Erreur lors de l&apos;enregistrement',
        error,
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
