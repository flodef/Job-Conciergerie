import { updateEmployeeData } from '@/app/actions/employee';
import { Button } from '@/app/components/button';
import Combobox from '@/app/components/combobox';
import Input from '@/app/components/input';
import Label from '@/app/components/label';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import geographicZones from '@/app/data/geographicZone.json';
import { Employee } from '@/app/types/dataTypes';
import { ErrorField } from '@/app/types/types';
import { handleChange } from '@/app/utils/form';
import { emailRegex, frenchPhoneRegex } from '@/app/utils/regex';
import React, { useEffect, useState } from 'react';

const EmployeeSettings: React.FC = () => {
  const { employees, userData, updateUserData } = useAuth();

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
  const [toast, setToast] = useState<Toast>();

  // Track original values for comparison
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalTel, setOriginalTel] = useState('');
  const [originalGeographicZone, setOriginalGeographicZone] = useState('');

  // Load user info and set form values
  useEffect(() => {
    const employee = userData as Employee;
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
  }, [userData]);

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
    else if (originalEmail !== email && employees.some(e => e.email === email))
      error = {
        message: "L'adresse email est déjà utilisée",
        fieldRef: emailRef,
        func: setEmailError,
      };
    else if (originalTel !== tel && employees.some(e => e.tel === tel))
      error = {
        message: 'Le numéro de téléphone est déjà utilisé',
        fieldRef: phoneRef,
        func: setPhoneError,
      };
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

      const updatedEmployee = await updateEmployeeData(userData as Employee, {
        email,
        tel,
        geographicZone,
      });
      if (!updatedEmployee) throw new Error('Paramètres non mis à jour dans la base de données');

      updateUserData(updatedEmployee);

      // Update original values to match current values after save
      setOriginalEmail(email);
      setOriginalTel(tel);
      setOriginalGeographicZone(geographicZone);

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

      <Label id="name">{name}</Label>

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
        row
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
        row
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
        row
      />

      <div className="flex justify-center pt-2">
        <Button onClick={handleSave} disabled={!hasChanges()} loading={isSaving} loadingText="Enregistrement...">
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
};

export default EmployeeSettings;
