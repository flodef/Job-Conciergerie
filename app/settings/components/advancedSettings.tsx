import ConfirmationModal from '@/app/components/confirmationModal';
import Switch from '@/app/components/switch';
import { useAuth } from '@/app/contexts/authProvider';
import { buttonClassName } from '@/app/utils/className';
import clsx from 'clsx/lite';
import React, { useState } from 'react';

const AdvancedSettings: React.FC = () => {
  const { disconnect, nuke } = useAuth();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteSettings, setDeleteSettings] = useState(false);

  const resetData = () => {
    if (deleteSettings) nuke();
    else disconnect();
  };

  return (
    <div className="flex flex-col space-y-4 text-center">
      <div className="justify-items-center">
        <button onClick={() => setShowConfirmDialog(true)} className={buttonClassName('dangerous')}>
          Réinitialiser mes données
        </button>
        <p className="text-sm text-light mt-2">
          Cette action supprimera votre accès à l&apos;application et vous redirigera vers la page d&apos;accueil.
        </p>
      </div>

      <ConfirmationModal
        isOpen={showConfirmDialog}
        onConfirm={resetData}
        onClose={() => setShowConfirmDialog(false)}
        title="Confirmation"
        message="Êtes-vous sûr de vouloir réinitialiser vos données ? Cette action supprimera votre accès à l'application."
        confirmText="Réinitialiser"
        cancelText="Annuler"
        isDangerous
      >
        <div className="mt-4 flex items-center justify-center w-full">
          <label className="flex items-center cursor-pointer select-none w-full justify-center gap-2">
            <span className={clsx('text-light', deleteSettings ? 'font-bold' : '')}>
              Supprimer également mes paramètres
            </span>
            <Switch enabled={deleteSettings} onChange={() => setDeleteSettings(!deleteSettings)} />
          </label>
        </div>
      </ConfirmationModal>
    </div>
  );
};

export default AdvancedSettings;
