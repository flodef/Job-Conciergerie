import { updateConciergerieData } from '@/app/actions/conciergerie';
import { Button } from '@/app/components/button';
import ColorPicker from '@/app/components/colorPicker';
import Input from '@/app/components/input';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import colorOptions from '@/app/data/colors.json';
import { Conciergerie } from '@/app/types/dataTypes';
import { ErrorField } from '@/app/types/types';
import { setPrimaryColor } from '@/app/utils/color';
import { emailRegex, frenchPhoneRegex } from '@/app/utils/regex';
import React, { useEffect, useState } from 'react';

type ColorOption = {
  name: string;
  value: string;
};

const ConciergerieSettings: React.FC = () => {
  const { userId, conciergeries, getUserData, updateUserData } = useAuth();

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // References for form fields
  const emailRef = React.useRef<HTMLInputElement>(null);
  const phoneRef = React.useRef<HTMLInputElement>(null);

  // Form state for editable fields
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<Toast>();

  // Track original values for comparison
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalTel, setOriginalTel] = useState('');
  const [originalColorName, setOriginalColorName] = useState('');

  // Load user info and set form values
  useEffect(() => {
    // Find the conciergerie that matches the name in localStorage
    const conciergerie = getUserData<Conciergerie>();
    if (!conciergerie) return;

    // Set current form values for conciergerie
    setEmail(conciergerie.email);
    setTel(conciergerie.tel);

    // Store original values for comparison
    setOriginalEmail(conciergerie.email);
    setOriginalTel(conciergerie.tel);
    setOriginalColorName(conciergerie.colorName);

    // Find matching color from our options
    const matchingColor = colorOptions.find(color => color.name === conciergerie.colorName) || null;
    setSelectedColor(matchingColor);

    // Apply theme color
    setPrimaryColor(conciergerie.color);
  }, [userId, getUserData]);

  // Check if form has been modified
  const hasChanges = () => {
    const emailChanged = email !== originalEmail;
    const telChanged = tel !== originalTel;
    const colorChanged = selectedColor?.name !== originalColorName;
    return emailChanged || telChanged || colorChanged;
  };

  // Handle form submission
  const handleSave = async () => {
    let error: ErrorField | undefined;

    if (!email.trim())
      error = { message: 'Veuillez entrer une adresse email', fieldRef: emailRef, func: setEmailError };
    else if (!tel.trim())
      error = { message: 'Veuillez entrer un numéro de téléphone', fieldRef: phoneRef, func: setPhoneError };
    else if (!emailRegex.test(email))
      error = { message: "Veuillez corriger le format de l'email", fieldRef: emailRef, func: setEmailError };
    else if (!frenchPhoneRegex.test(tel))
      error = {
        message: 'Veuillez corriger le format du numéro de téléphone',
        fieldRef: phoneRef,
        func: setPhoneError,
      };
    else if (originalEmail !== email && conciergeries.some(e => e.email === email))
      error = {
        message: "L'adresse email est déjà utilisée",
        fieldRef: emailRef,
        func: setEmailError,
      };
    else if (originalTel !== tel && conciergeries.some(e => e.tel === tel))
      error = {
        message: 'Le numéro de téléphone est déjà utilisé',
        fieldRef: phoneRef,
        func: setPhoneError,
      };

    try {
      setIsSaving(true);

      if (error) {
        error.fieldRef?.current?.focus();
        error.func(error.message);
        throw new Error(error.message);
      }

      const updatedConciergerie = await updateConciergerieData(getUserData<Conciergerie>(), {
        email,
        tel,
        colorName: selectedColor?.name || '',
      });
      if (!updatedConciergerie) throw new Error('Paramètres non mis à jour dans la base de données');

      updateUserData(updatedConciergerie);

      // Update theme
      if (selectedColor) {
        setPrimaryColor(selectedColor.value);
      }

      // Update original values to match current values after save
      setOriginalEmail(email);
      setOriginalTel(tel);
      if (selectedColor) {
        setOriginalColorName(selectedColor.name);
      }

      // Show success toast
      setToast({
        type: ToastType.Success,
        message: 'Modifications enregistrées avec succès',
      });
    } catch (error) {
      setToast({
        type: ToastType.Error,
        message: String(error),
        error,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />

      <Input
        id="email"
        label="Email"
        ref={emailRef}
        value={email}
        onChange={setEmail}
        error={emailError}
        onError={setEmailError}
        disabled={isSaving}
        placeholder="jean.dupont@example.com"
        required
      />

      <Input
        id="tel"
        label="Téléphone"
        ref={phoneRef}
        value={tel}
        onChange={setTel}
        error={phoneError}
        onError={setPhoneError}
        disabled={isSaving}
        placeholder="06 12 34 56 78"
        required
      />

      <ColorPicker
        id="color"
        label="Couleur"
        colorOptions={colorOptions}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        disabled={isSaving}
      />

      <div className="flex justify-center pt-2">
        <Button onClick={handleSave} disabled={!hasChanges()} loading={isSaving} loadingText="Enregistrement...">
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
};

export default ConciergerieSettings;
