import {
  getImpersonationTargets,
  startImpersonation,
  stopImpersonation,
  type ImpersonationTarget,
} from '@/app/actions/admin';
import { Button } from '@/app/components/button';
import Select from '@/app/components/select';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import type { UserType } from '@/app/contexts/authProvider';
import { useToast } from '@/app/contexts/toastProvider';
import type { SelectOption } from '@/app/types/types';
import { cn } from '@/app/utils/className';
import { IconBuildingStore, IconUser } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';

const AdminSettings: React.FC = () => {
  const { impersonating, impersonatedName } = useAuth();
  const [targets, setTargets] = useState<ImpersonationTarget[]>([]);
  const [targetType, setTargetType] = useState<UserType>('conciergerie');
  const [selected, setSelected] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    getImpersonationTargets()
      .then(setTargets)
      .catch(() => {});
  }, []);

  // The currently impersonated row is excluded — impersonating yourself is
  // meaningless. rowKey IS the displayed name for both user types.
  const options: SelectOption[] = targets
    .filter(t => t.userType === targetType && (!impersonating || t.rowKey !== impersonatedName))
    .map(t => ({ value: t.rowKey, label: t.rowKey }));

  const handleImpersonate = async () => {
    try {
      setIsLoading(true);
      if (!(await startImpersonation(targetType, selected)))
        throw new Error("Impossible de voir l'application en tant que cette personne");
      window.location.reload();
    } catch (error) {
      showToast({ type: ToastType.Error, message: String(error), error });
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setIsLoading(true);
      if (!(await stopImpersonation())) throw new Error("Impossible de quitter la vue d'impersonation");
      window.location.reload();
    } catch (error) {
      showToast({ type: ToastType.Error, message: String(error), error });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {impersonating && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-100 px-3 py-2">
          <span className="text-sm text-amber-800 truncate">En tant que {impersonatedName}</span>
          <Button style="secondary" onClick={handleStop} disabled={isLoading}>
            Quitter
          </Button>
        </div>
      )}

      {/* Type toggle — pick the kind of row first, then the person */}
      <div className="flex gap-2">
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 px-3 py-2 rounded cursor-pointer flex-1 justify-center',
            targetType === 'conciergerie' ? 'bg-primary text-white' : 'bg-secondary text-foreground',
          )}
          onClick={() => {
            setTargetType('conciergerie');
            setSelected('');
          }}
          disabled={isLoading}
        >
          <IconBuildingStore size={18} />
          Conciergerie
        </button>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 px-3 py-2 rounded cursor-pointer flex-1 justify-center',
            targetType === 'employee' ? 'bg-primary text-white' : 'bg-secondary text-foreground',
          )}
          onClick={() => {
            setTargetType('employee');
            setSelected('');
          }}
          disabled={isLoading}
        >
          <IconUser size={18} />
          Prestataire
        </button>
      </div>

      <Select
        id="impersonate-target"
        label={targetType === 'conciergerie' ? 'Voir en tant que conciergerie' : 'Voir en tant que prestataire'}
        value={selected}
        onChange={setSelected}
        options={options}
        disabled={isLoading}
        placeholder={targetType === 'conciergerie' ? 'Choisir une conciergerie…' : 'Choisir un prestataire…'}
        required
        row
      />
      <div className="flex justify-center pt-2">
        <Button onClick={handleImpersonate} disabled={!selected} loading={isLoading} loadingText="Chargement...">
          Voir en tant que
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
