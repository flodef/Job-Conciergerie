'use client';

import { useEffect, useState } from 'react';
import Accordion from '../components/accordion';
import ConfirmationModal from '../components/confirmationModal';
import { ToastMessage, ToastProps } from '../components/toastMessage';
import { useRedirectIfNotRegistered } from '../utils/redirectIfNotRegistered';
import { getWelcomeParams } from '../utils/welcomeParams';
import ConciergerieSettings from './components/conciergerieSettings';
import EmployeeSettings from './components/employeeSettings';

function NoUserInfo() {
  return (
    <div className="min-h-10 flex items-center justify-center bg-background">
      <p className="text-foreground/70">Aucune information utilisateur disponible.</p>
    </div>
  );
}

export default function Settings() {
  // Regular expressions for validation
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showNukeConfirmation, setShowNukeConfirmation] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastProps>();
  const [userType, setUserType] = useState<'conciergerie' | 'employee'>();

  // Redirect if not registered
  useRedirectIfNotRegistered();

  useEffect(() => {
    const params = getWelcomeParams();
    setUserType(params.userType);
  }, []);

  // Sections content
  const generalSection = {
    conciergerie: <ConciergerieSettings />,
    employee: <EmployeeSettings />,
    '': <NoUserInfo />,
  }[userType || ''];

  const notificationsSection = (
    <div className="text-sm opacity-70 italic">Les paramètres de notification seront bientôt disponibles.</div>
  );

  const advancedSection = (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4 text-center">
        <div>
          <button
            onClick={() => setShowConfirmation(true)}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
          >
            Réinitialiser mes données
          </button>
          <p className="text-sm text-foreground/70 mt-2">
            Cette action supprimera votre accès à l&apos;application et vous redirigera vers la page d&apos;accueil.
          </p>
        </div>

        {/* Nuke button - only for conciergerie */}
        {userType === 'conciergerie' && (
          <div className="mt-4">
            <button
              onClick={() => setShowNukeConfirmation(true)}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md transition-colors"
            >
              Supprimer toutes les données
            </button>
            <p className="text-sm text-foreground/70 mt-2">
              Cette action supprimera toutes les données de l&apos;application, y compris les missions, les prestataires
              et les logements.
            </p>
          </div>
        )}
      </div>

      {/* Toast message */}
      {toastMessage && (
        <ToastMessage
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(undefined)}
        />
      )}

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={() => {
          // Clear only the user type from localStorage (keep other data)
          localStorage.removeItem('user_type');

          // Force a full page reload to reset the app state
          window.location.href = '/';
        }}
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
        </ul>
      </ConfirmationModal>

      {/* Nuke confirmation modal */}
      <ConfirmationModal
        isOpen={showNukeConfirmation}
        onClose={() => setShowNukeConfirmation(false)}
        onConfirm={() => {
          // Clear all data from localStorage
          localStorage.clear();

          // Force a full page reload to reset the app state
          window.location.href = '/';
        }}
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
          <li>Supprimera toutes les missions, prestataires et logements</li>
          <li>Déconnectera tous les utilisateurs</li>
          <li>Réinitialisera complètement l&apos;application</li>
          <li>Vous devrez reconfigurer entièrement votre conciergerie</li>
        </ul>
      </ConfirmationModal>
    </div>
  );

  const accordionItems = [
    {
      title: 'Général',
      content: generalSection,
    },
    {
      title: 'Notifications',
      content: notificationsSection,
    },
    {
      title: 'Avancé',
      content: advancedSection,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <Accordion items={accordionItems} />
    </div>
  );
}
