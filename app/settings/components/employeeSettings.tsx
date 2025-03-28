import { updateEmployeeData } from '@/app/actions/employee';
import Combobox from '@/app/components/combobox';
import Input from '@/app/components/input';
import LoadingSpinner from '@/app/components/loadingSpinner';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import geographicZones from '@/app/data/geographicZone.json';
import { Employee, ErrorField } from '@/app/types/types';
import { labelClassName } from '@/app/utils/className';
import { handleChange } from '@/app/utils/form';
import { emailRegex, frenchPhoneRegex } from '@/app/utils/regex';
import React, { useEffect, useState } from 'react';

const EmployeeSettings: React.FC = () => {
  const { userId, isLoading: authLoading, getUserData, updateUserData } = useAuth();

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [geographicZoneError, setGeographicZoneError] = useState('');

  // References for form fields
  const emailRef = React.useRef<HTMLInputElement>(null);
  const phoneRef = React.useRef<HTMLInputElement>(null);
  const geographicZoneRef = React.useRef<HTMLInputElement>(null);

  // Form state for editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [geographicZone, setGeographicZone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<Toast>();

  // Track original values for comparison
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalTel, setOriginalTel] = useState('');
  const [originalGeographicZone, setOriginalGeographicZone] = useState('');

  // Load user info and set form values
  useEffect(() => {
    const employee = getUserData<Employee>();
    if (!employee) return;

    // Set employee data for form
    setName(employee.firstName + ' ' + employee.familyName);
    setEmail(employee.email);
    setTel(employee.tel);
    setGeographicZone(employee.geographicZone || '');

    // Store original values for comparison
    setOriginalEmail(employee.email);
    setOriginalTel(employee.tel);
    setOriginalGeographicZone(employee.geographicZone || '');
  }, [userId, getUserData]);

  const hasChanges = () => {
    const emailChanged = email !== originalEmail;
    const telChanged = tel !== originalTel;
    const geographicZoneChanged = geographicZone !== originalGeographicZone;
    return emailChanged || telChanged || geographicZoneChanged;
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
    // Geographic zone validation - required but no specific format
    else if (!geographicZone.trim())
      error = {
        message: 'Veuillez entrer une zone géographique',
        fieldRef: geographicZoneRef,
        func: setGeographicZoneError,
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
        geographicZone,
        message: undefined,
        conciergerieName: undefined,
      });
      if (!updatedEmployee) throw new Error('Paramètres non mis à jour dans la base de données');

      updateUserData(updatedEmployee);

      // Update original values to match current values after save
      setOriginalEmail(email);
      setOriginalTel(tel);
      setOriginalGeographicZone(geographicZone);

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
        <p className={labelClassName}>Nom</p>
        <p className="font-medium">{name}</p>
      </div>

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

      <Combobox
        id="geographic-zone"
        label="Lieu de vie"
        ref={geographicZoneRef}
        options={geographicZones}
        value={geographicZone}
        onChange={e => handleChange(e, setGeographicZone, setGeographicZoneError)}
        disabled={isSaving}
        placeholder="Sélectionnez un lieu de vie..."
        error={geographicZoneError}
        required
      />

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
