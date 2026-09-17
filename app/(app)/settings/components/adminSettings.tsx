import { getImpersonationTargets, startImpersonation, type ImpersonationTarget } from '@/app/actions/admin';
import { Button } from '@/app/components/button';
import Select from '@/app/components/select';
import { ToastType } from '@/app/components/toastMessage';
import { useToast } from '@/app/contexts/toastProvider';
import type { SelectOption } from '@/app/types/types';
import React, { useEffect, useState } from 'react';

const AdminSettings: React.FC = () => {
  const [targets, setTargets] = useState<ImpersonationTarget[]>([]);
  const [selected, setSelected] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    getImpersonationTargets()
      .then(setTargets)
      .catch(() => {});
  }, []);

  const options: SelectOption[] = targets.map(t => ({
    value: t.userType + '|' + t.rowKey,
    label: (t.userType === 'conciergerie' ? 'Conciergerie — ' : 'Prestataire — ') + t.rowKey,
  }));

  const handleImpersonate = async () => {
    const [userType, ...rest] = selected.split('|');
    const rowKey = rest.join('|');
    try {
      setIsLoading(true);
      if (!(await startImpersonation(userType as ImpersonationTarget['userType'], rowKey)))
        throw new Error("Impossible de voir l'application en tant que cette personne");
      window.location.reload();
    } catch (error) {
      showToast({ type: ToastType.Error, message: String(error), error });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Select
        id="impersonate-target"
        label="Voir l'application en tant que"
        value={selected}
        onChange={setSelected}
        options={options}
        disabled={isLoading}
        placeholder="Choisir une personne…"
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
