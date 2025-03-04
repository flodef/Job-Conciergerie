'use client';

import { IconCancel, IconCheck, IconPencil, IconTrash, IconZoomScan } from '@tabler/icons-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useMissions } from '../contexts/missionsProvider';
import { useHomes } from '../contexts/homesProvider';
import { Mission } from '../types/types';
import ConfirmationModal from './confirmationModal';
import FullScreenImageModal from './fullScreenImageModal';
import FullScreenModal from './fullScreenModal';
import HomeDetails from './homeDetails';
import MissionForm from './missionForm';
import { getWelcomeParams } from '../utils/welcomeParams';

type MissionDetailsProps = {
  mission: Mission;
  onClose: () => void;
};

export default function MissionDetails({ mission, onClose }: MissionDetailsProps) {
  const {
    deleteMission,
    removeEmployee,
    getCurrentConciergerie,
    shouldShowAcceptWarning,
    acceptMission,
    setShouldShowAcceptWarning,
  } = useMissions();
  const { homes } = useHomes();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showHomeDetails, setShowHomeDetails] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Get the conciergerie color from the mission data
  const conciergerieColor = mission.conciergerie?.color || 'var(--color-primary)';

  useEffect(() => {
    // Get the user type
    const { userType } = getWelcomeParams();
    setUserType(userType);

    // Check if the current conciergerie is the one that created the mission
    const currentConciergerie = getCurrentConciergerie();
    if (userType === 'employee') {
      // Employees can never edit missions
      setIsReadOnly(true);
    } else if (currentConciergerie && mission.conciergerie.name === currentConciergerie.name) {
      // Conciergerie can edit their own missions
      setIsReadOnly(false);
    } else {
      // Default to read-only
      setIsReadOnly(true);
    }
  }, [mission, getCurrentConciergerie]);

  const handleDelete = () => {
    deleteMission(mission.id);
    setIsDeleteModalOpen(false);
    onClose();
  };

  const handleRemoveEmployee = () => {
    removeEmployee(mission.id);
    onClose();
  };

  const handleAcceptClick = () => {
    if (shouldShowAcceptWarning) {
      setIsAcceptModalOpen(true);
    } else {
      setIsConfirmationModalOpen(true);
    }
  };

  const handleConfirmAccept = () => {
    acceptMission(mission.id);
    setIsConfirmationModalOpen(false);
    onClose();
  };

  const handleAcceptWithWarning = () => {
    // Update the warning preference if the checkbox is checked
    if (dontShowAgain) {
      setShouldShowAcceptWarning(false);
    }

    // Accept the mission
    acceptMission(mission.id);
    setIsAcceptModalOpen(false);
    onClose();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isEditMode) {
    return (
      <FullScreenModal onClose={() => setIsEditMode(false)}>
        <MissionForm
          mission={mission}
          onClose={() => {
            setIsEditMode(false);
            onClose();
          }}
          mode="edit"
        />
      </FullScreenModal>
    );
  }

  if (showHomeDetails) {
    // Get the original home from the homes context to ensure we have all images
    const originalHome = homes.find(h => h.id === mission.home.id) || mission.home;
    return <HomeDetails home={originalHome} onClose={() => setShowHomeDetails(false)} />;
  }

  const firstHomeImage = mission.home.images?.length ? mission.home.images[0] : '';
  const isEmployee = userType === 'employee';
  const canAcceptMission = isEmployee && !mission.employee;

  return (
    <FullScreenModal onClose={onClose}>
      {selectedImage && <FullScreenImageModal url={selectedImage} onClose={() => setSelectedImage(null)} />}

      <div className="p-6" data-mission-details>
        <h2 className="text-xl font-bold mb-4">Détails de la mission</h2>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-light">Bien</h3>
                <p className="text-foreground">{mission.home.title}</p>
              </div>
              <button onClick={() => setShowHomeDetails(true)} title="Voir les détails du bien">
                <IconZoomScan size={40} />
              </button>
            </div>

            {mission.home.images?.length ? (
              <div className="relative aspect-video w-full max-h-32 mt-1 overflow-hidden rounded-lg">
                <Image
                  src={firstHomeImage}
                  alt={`Photo de ${mission.home.title}`}
                  fill
                  className="object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImage(firstHomeImage)}
                />
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="text-sm font-medium text-light">Objectifs</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {mission.objectives.map(objective => (
                <span
                  key={objective}
                  className="px-2 py-1 rounded-lg text-sm"
                  style={{
                    backgroundColor: `${conciergerieColor}`,
                  }}
                >
                  {objective}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-light">Date</h3>
            <p className="text-foreground">{formatDate(mission.date)}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-light">Conciergerie</h3>
            <p className="font-bold" style={{ color: conciergerieColor }}>
              {mission.conciergerie.name}
            </p>
          </div>

          {mission.employee && (
            <div>
              <h3 className="text-sm font-medium text-light">Prestataire</h3>
              <p>{mission.employee.name}</p>
            </div>
          )}
        </div>
      </div>

      {!isReadOnly && !isEmployee && (
        <div className="flex justify-end items-center px-4 pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditMode(true)}
              className="flex flex-col items-center p-2 w-20 rounded-lg hover:opacity-80"
              data-edit-button
            >
              <IconPencil />
              Modifier
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex flex-col items-center p-2 w-20 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              <IconTrash />
              Supprimer
            </button>
            {mission.employee && (
              <button
                onClick={handleRemoveEmployee}
                className="flex flex-col items-center p-2 w-20 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
              >
                <IconCancel />
                Annuler
              </button>
            )}
          </div>
        </div>
      )}

      {canAcceptMission && (
        <div className="flex justify-end items-center px-4 pb-4">
          <button
            onClick={handleAcceptClick}
            className="flex flex-col items-center p-2 w-20 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
          >
            <IconCheck />
            Accepter
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        title="Supprimer la mission"
        message="Êtes-vous sûr de vouloir supprimer cette mission ?"
        confirmText="Supprimer"
        cancelText="Annuler"
      />

      <ConfirmationModal
        isOpen={isAcceptModalOpen}
        onConfirm={handleAcceptWithWarning}
        onCancel={() => setIsAcceptModalOpen(false)}
        title="Accepter la mission"
        message="En acceptant cette mission, vous vous engagez à l'honorer. La seule façon d'annuler est de contacter directement la conciergerie."
        confirmText="Accepter"
        cancelText="Annuler"
      >
        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="dontShowAgain"
            checked={dontShowAgain}
            onChange={e => setDontShowAgain(e.target.checked)}
            className="mr-2 h-4 w-4 text-primary border-secondary rounded focus:ring-primary"
          />
          <label htmlFor="dontShowAgain" className="text-sm text-foreground/80">
            Ne plus afficher ce message
          </label>
        </div>
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onConfirm={handleConfirmAccept}
        onCancel={() => setIsConfirmationModalOpen(false)}
        title="Accepter la mission"
        message="Êtes-vous sûr de vouloir accepter cette mission ?"
        confirmText="Accepter"
        cancelText="Annuler"
      />
    </FullScreenModal>
  );
}
