import { changeMyPlan, fetchMyGroup, updateConciergerieData } from '@/app/actions/conciergerie';
import { Button } from '@/app/components/button';
import ColorPicker from '@/app/components/colorPicker';
import ConfirmationModal from '@/app/components/confirmationModal';
import Input from '@/app/components/input';
import Label from '@/app/components/label';
import PlanComparisonModal from '@/app/(app)/settings/components/planComparisonModal';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useModal } from '@/app/contexts/modalProvider';
import { useToast } from '@/app/contexts/toastProvider';
import colorOptions from '@/app/data/colors.json';
import { PLANS, PLAN_ORDER } from '@/app/data/plans';
import type { Conciergerie, ConciergeriePlan } from '@/app/types/dataTypes';
import type { ErrorField } from '@/app/types/types';
import { setPrimaryColor } from '@/app/utils/color';
import { rowClassName, textClassName } from '@/app/utils/className';
import { emailRegex, frenchPhoneRegex, normalizePhone } from '@/app/utils/regex';
import React, { useEffect, useState } from 'react';

type ColorOption = {
  name: string;
  value: string;
};

const ConciergerieSettings: React.FC = () => {
  const { conciergeries, userData, updateUserData } = useAuth();

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
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(null);
  const [plan, setPlan] = useState<ConciergeriePlan>('pro');
  const [group, setGroup] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const { openModal, closeModal, closeAllModals } = useModal();

  // Track original values for comparison
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalTel, setOriginalTel] = useState('');
  const [originalColorName, setOriginalColorName] = useState('');

  // Load user info and set form values
  useEffect(() => {
    // Find the conciergerie that matches the name in localStorage
    const conciergerie = userData as Conciergerie;
    if (!conciergerie) return;

    // Set current form values for conciergerie
    setName(conciergerie.name);
    setEmail(conciergerie.email);
    setTel(normalizePhone(conciergerie.tel));

    // Store original values for comparison
    setOriginalEmail(conciergerie.email);
    setOriginalTel(normalizePhone(conciergerie.tel));
    setOriginalColorName(conciergerie.colorName);
    setPlan(conciergerie.plan ?? 'pro');

    // Find matching color from our options
    const matchingColor = colorOptions.find(color => color.name === conciergerie.colorName) || null;
    setSelectedColor(matchingColor);

    // Apply theme color
    setPrimaryColor(conciergerie.color);
  }, [userData]);

  // Multi-conciergerie group membership — read-only indicator (group changes
  // are an admin operation). Members share missions & providers when their
  // plan allows it; a solo member shows "Indépendante".
  useEffect(() => {
    fetchMyGroup().then(g => {
      if (!g) return;
      setGroup(g.members.length > 1 ? g.members.join(', ') : 'Indépendante');
    });
  }, []);

  // Plan comparison popup — also the plan picker: each other plan gets a
  // "Passer à" button. The confirmation stacks on top via the modal provider
  // (an inline modal would paint behind the comparison modal).
  const openPlanModal = () => {
    openModal(id => (
      <PlanComparisonModal currentPlan={plan} onClose={() => closeModal(id)} onSelect={openPlanConfirm} />
    ));
  };

  const openPlanConfirm = (chosen: ConciergeriePlan) => {
    openModal(cid => (
      <PlanChangeConfirmation
        plan={chosen}
        isDowngrade={PLAN_ORDER.indexOf(chosen) < PLAN_ORDER.indexOf(plan)}
        onCancel={() => closeModal(cid)}
        onConfirm={async () => {
          const updated = await changeMyPlan(chosen);
          if (!updated) throw new Error('Le forfait n’a pas pu être modifié');
          updateUserData(updated);
          setPlan(chosen);
          closeAllModals();
          showToast({ type: ToastType.Success, message: `Forfait ${PLANS[chosen].name} activé` });
        }}
      />
    ));
  };

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

      const updatedConciergerie = await updateConciergerieData(userData as Conciergerie, {
        email,
        tel,
        colorName: selectedColor?.name || '',
      });
      if (!updatedConciergerie) throw new Error('Paramètres non mis à jour dans la base de données');

      updateUserData(updatedConciergerie);

      // Update theme
      if (selectedColor) setPrimaryColor(selectedColor.value);

      // Update original values to match current values after save
      setOriginalEmail(email);
      setOriginalTel(tel);
      if (selectedColor) setOriginalColorName(selectedColor.name);

      // Show success toast
      showToast({
        type: ToastType.Success,
        message: 'Modifications enregistrées avec succès',
      });
    } catch (error) {
      showToast({
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
      <Label id="name" className="text-lg font-bold">
        {name}
      </Label>

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
        placeholder="0612345678"
        required
        row
      />

      <ColorPicker
        id="color"
        label="Couleur"
        colorOptions={colorOptions}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        disabled={isSaving}
        required
      />

      <div className={rowClassName}>
        <Label
          id="plan"
          tooltip="Facturation mensuelle : le forfait le plus élevé utilisé dans le mois est celui facturé le 1er du mois suivant."
        >
          Forfait
        </Label>
        <div className="flex-1 flex items-center justify-end gap-3">
          <span className={textClassName}>
            {PLANS[plan].name} — {PLANS[plan].monthly} €/mois
          </span>
          <Button style="secondary" onClick={openPlanModal}>
            Comparer les forfaits
          </Button>
        </div>
      </div>

      <div className={rowClassName}>
        <Label
          id="group"
          tooltip="Les conciergeries d'un même groupe partagent missions et prestataires (selon leur forfait). Contactez-nous pour modifier votre groupe."
        >
          Groupe
        </Label>
        <div className="flex-1 flex items-center justify-end">
          <span className={textClassName}>{group || '…'}</span>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <Button onClick={handleSave} disabled={!hasChanges()} loading={isSaving} loadingText="Enregistrement...">
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
};

/**
 * Plan-switch confirmation — a real component (not just a render function) so
 * its busy label re-renders while the server action runs. On cancel the modal
 * pops and the comparison modal underneath reappears.
 */
const PlanChangeConfirmation = ({
  plan,
  isDowngrade,
  onConfirm,
  onCancel,
}: {
  plan: ConciergeriePlan;
  isDowngrade: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  return (
    <ConfirmationModal
      isOpen
      title="Changer de forfait"
      message={`Passer au forfait ${PLANS[plan].name} (${PLANS[plan].monthly} €/mois) ? Le changement est immédiat et le mois en cours est facturé au forfait le plus élevé utilisé.${
        isDowngrade
          ? ' Vos données existantes sont conservées, mais les créations au-delà des limites du nouveau forfait seront bloquées.'
          : ''
      }`}
      confirmText={busy ? 'Changement…' : 'Confirmer'}
      onCancel={onCancel}
      onConfirm={async () => {
        if (busy) return;
        setBusy(true);
        try {
          await onConfirm();
        } catch (error) {
          setBusy(false);
          showToast({ type: ToastType.Error, message: String(error), error });
        }
      }}
    />
  );
};

export default ConciergerieSettings;
