import { getImpersonationTargets, startImpersonation, type ImpersonationTarget } from '@/app/actions/admin';
import { Button } from '@/app/components/button';
import Label from '@/app/components/label';
import Select from '@/app/components/select';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import type { UserType } from '@/app/contexts/authProvider';
import { useToast } from '@/app/contexts/toastProvider';
import type { SelectOption } from '@/app/types/types';
import { cn, rowClassName } from '@/app/utils/className';
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

  return (
    <div className="space-y-2">
      {/* Line 1 — pick the kind of row to impersonate (icon-only toggle) */}
      <div className={rowClassName}>
        <Label id="impersonate-type">Voir en tant que</Label>
        <div className="flex-1 flex justify-end">
          <div className="flex overflow-hidden rounded-lg border border-secondary">
            {(
              [
                { type: 'conciergerie' as const, label: 'Conciergerie', icon: <IconBuildingStore size={20} /> },
                { type: 'employee' as const, label: 'Prestataire', icon: <IconUser size={20} /> },
              ] as const
            ).map(({ type, label, icon }) => (
              <button
                key={type}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={targetType === type}
                className={cn(
                  'px-3 py-2 cursor-pointer transition-colors',
                  targetType === type ? 'bg-primary text-white' : 'bg-background text-foreground',
                )}
                onClick={() => {
                  setTargetType(type);
                  setSelected('');
                }}
                disabled={isLoading}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Line 2 — pick the person */}
      <Select
        id="impersonate-target"
        label={targetType === 'conciergerie' ? 'Conciergerie' : 'Prestataire'}
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
