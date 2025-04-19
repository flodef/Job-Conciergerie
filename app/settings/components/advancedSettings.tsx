import ConfirmationModal from '@/app/components/confirmationModal';
import { useAuth } from '@/app/contexts/authProvider';
import { buttonClassName } from '@/app/utils/className';
import React, { useState } from 'react';

const AdvancedSettings: React.FC = () => {
  const { userType, disconnect, nuke } = useAuth();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showNukeConfirmation, setShowNukeConfirmation] = useState(false);

  return (
    <div className="flex flex-col space-y-4 text-center">
      <div className="justify-items-center">
        <button onClick={() => setShowConfirmation(true)} className={buttonClassName('dangerous')}>
          Réinitialiser mes données
        </button>
        <p className="text-sm text-light mt-2">
          Cette action supprimera votre accès à l&apos;application et vous redirigera vers la page d&apos;accueil. Vos
          paramètres seront néanmoins conservés.
        </p>
      </div>

      {/* Nuke button - only for conciergerie */}
      {userType === 'conciergerie' && (
        <div className="justify-items-center">
          <button onClick={() => setShowNukeConfirmation(true)} className={buttonClassName('inferno')}>
            Supprimer toutes les données
          </button>
          <p className="text-sm text-light mt-2">
            Cette action supprimera votre accès à l&apos;application et vous redirigera vers la page d&apos;accueil.
            Tous vos paramètres seront supprimés.
          </p>
        </div>
      )}

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={disconnect}
        title="Réinitialiser mes données"
        confirmText="Réinitialiser"
        cancelText="Annuler"
        isDangerous={true}
      >
        <p>Êtes-vous sûr de vouloir réinitialiser vos données personnelles ? Cette action est importante car :</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Vous serez déconnecté de votre profil actuel</li>
          <li>Vous devrez remplir à nouveau votre profil utilisateur et faire une demande d&apos;accès</li>
          <li>Vos données personnelles resteront enregistrées mais ne seront plus associées à votre profil</li>
          <li>Vos paramètres seront conservés</li>
        </ul>
      </ConfirmationModal>

      {/* Nuke confirmation modal */}
      <ConfirmationModal
        isOpen={showNukeConfirmation}
        onClose={() => setShowNukeConfirmation(false)}
        onConfirm={nuke}
        title="Supprimer toutes les données"
        confirmText="Supprimer tout"
        cancelText="Annuler"
        isDangerous={true}
      >
        <p>
          Êtes-vous sûr de vouloir supprimer toutes les données de l&apos;application ? Cette action est irréversible et
          :
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Vous serez déconnecté de votre profil actuel</li>
          <li>Vous devrez de nouveau faire une demande d&apos;accès</li>
          <li>Tous vos paramètres seront supprimés</li>
        </ul>
      </ConfirmationModal>
    </div>
  );
};

export default AdvancedSettings;
