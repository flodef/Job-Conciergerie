import LoadingSpinner from '@/app/components/loadingSpinner';
import { ToastMessage, ToastProps, ToastType } from '@/app/components/toastMessage';
import { useTheme } from '@/app/contexts/themeProvider';
import { emailRegex, frenchPhoneRegex } from '@/app/utils/regex';
import { getWelcomeParams } from '@/app/utils/welcomeParams';
import { clsx } from 'clsx/lite';
import React, { useEffect, useState } from 'react';
import colorOptions from '@/app/data/colors.json';
import conciergeriesData from '@/app/data/conciergeries.json';
import { Conciergerie } from '@/app/types/types';
import { updateConciergerieData } from '@/app/utils/welcomeParams';

type ColorOption = {
  name: string;
  value: string;
};

const ConciergerieSettings: React.FC = () => {
  const { setPrimaryColor } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<Conciergerie & { color?: string }>();

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
  const [selectedColor, setSelectedColor] = useState<ColorOption>();
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastProps>();

  // Track original values for comparison
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalTel, setOriginalTel] = useState('');
  const [originalColorName, setOriginalColorName] = useState('');

  // Load user info and set form values
  useEffect(() => {
    setIsLoading(true);
    // Add a small delay to simulate loading and ensure localStorage is read
    // await new Promise(resolve => setTimeout(resolve, 500));

    const params = getWelcomeParams();
    setUserInfo(params.conciergerieData);

    if (params.conciergerieData) {
      // Set current form values for conciergerie
      setEmail(params.conciergerieData.email || '');
      setTel(params.conciergerieData.tel || '');

      // Store original values for comparison
      setOriginalEmail(params.conciergerieData.email || '');
      setOriginalTel(params.conciergerieData.tel || '');
      setOriginalColorName(params.conciergerieData.colorName || '');

      // Find matching color from our options
      const matchingColor = colorOptions.find(color => color.name === params.conciergerieData?.colorName);
      setSelectedColor(matchingColor);

      // Apply theme color if conciergerie data exists
      if (params.conciergerieData.color) {
        setPrimaryColor(params.conciergerieData.color);
      }
    }

    setIsLoading(false);
  }, [setPrimaryColor]);

  // Check if a color is already used by another conciergerie
  const isColorUsed = (colorName: string) => {
    if (!userInfo) return false;

    // Find conciergeries that are not the current one
    const otherConciergeries = conciergeriesData.filter(c => c.name !== userInfo.name);

    // Check if any other conciergerie uses this color
    return otherConciergeries.some(c => c.colorName === colorName);
  };

  // Check if form has been modified
  const hasChanges = () => {
    if (!userInfo) return false;

    const emailChanged = email !== originalEmail;
    const telChanged = tel !== originalTel;
    const colorChanged = selectedColor?.name !== originalColorName;
    return emailChanged || telChanged || colorChanged;
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
      // Create updated conciergerie data
      const updatedData = {
        ...userInfo,
        email,
        tel,
        colorName: selectedColor?.name || userInfo.colorName,
      };

      // Update in localStorage
      updateConciergerieData(updatedData);

      // Update theme
      if (selectedColor) {
        setPrimaryColor(selectedColor.value);
      }

      // Update local state
      setUserInfo({
        ...updatedData,
        color: selectedColor?.value || userInfo.color,
      });

      // Update original values to match current values after save
      setOriginalEmail(email);
      setOriginalTel(tel);
      if (selectedColor) {
        setOriginalColorName(selectedColor.name);
      }

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
              setEmailError("Format d'email invalide");
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
              '--tw-ring-color': selectedColor?.value || userInfo?.color,
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
              '--tw-ring-color': selectedColor?.value || userInfo?.color,
            } as React.CSSProperties
          }
        />
        {isFormSubmitted && !tel ? (
          <p className="text-red-500 text-sm mt-1">Veuillez entrer un numéro de téléphone</p>
        ) : phoneError ? (
          <p className="text-red-500 text-sm mt-1">{phoneError}</p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/70 mb-2">Couleur</label>
        <div className="grid grid-cols-3 gap-3">
          {colorOptions.map(color => {
            const isUsed = isColorUsed(color.name);
            const isSelected = selectedColor?.name === color.name;

            return (
              <button
                key={color.name}
                type="button"
                onClick={() => {
                  if (!isUsed || isSelected) {
                    setSelectedColor(color);
                  }
                }}
                disabled={isUsed && !isSelected}
                className={`
                  relative flex flex-col items-center space-y-1 p-2 border rounded-md transition-all
                  ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-secondary'}
                  ${isUsed && !isSelected ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary/10'}
                `}
                title={
                  isUsed && !isSelected ? 'Cette couleur est déjà utilisée par une autre conciergerie' : color.name
                }
              >
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color.value }} />
                <span>{color.name}</span>

                {/* Diagonal "utilisée" label for used colors */}
                {isUsed && !isSelected && (
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <div
                      className="absolute text-sm font-bold text-foreground/80 bg-background/70 px-1 py-0.5 uppercase tracking-wider whitespace-nowrap"
                      style={{
                        transform: 'rotate(45deg) scale(0.9)',
                        transformOrigin: 'center',
                        width: '140%',
                        textAlign: 'center',
                      }}
                    >
                      UTILISÉE
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
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

export default ConciergerieSettings;
