'use client';

import { IconCancel, IconCheck, IconMail, IconPencil, IconPhone, IconTrash, IconZoomScan } from '@tabler/icons-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useMissions } from '../contexts/missionsProvider';
import { Mission } from '../types/types';
import { formatDateTime } from '../utils/dateUtils';
import { getColorValueByName, getWelcomeParams } from '../utils/welcomeParams';
import ConfirmationModal from './confirmationModal';
import FullScreenModal from './fullScreenModal';
import HomeDetails from './homeDetails';
import MissionForm from './missionForm';

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
  const { getConciergerieByName, getHomeById, getEmployeeById } = useMissions();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showHomeDetails, setShowHomeDetails] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Get the conciergerie from the mission data
  const conciergerie = getConciergerieByName(mission.conciergerieName);
  const conciergerieColor = getColorValueByName(conciergerie?.colorName);

  // Get the home data
  const home = getHomeById(mission.homeId);

  useEffect(() => {
    // Get the user type
    const { userType } = getWelcomeParams();
    setUserType(userType);

    // Check if the current conciergerie is the one that created the mission
    const currentConciergerie = getCurrentConciergerie();
    if (userType === 'employee') {
      // Employees can never edit missions
      setIsReadOnly(true);
    } else if (currentConciergerie && mission.conciergerieName === currentConciergerie.name) {
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

  if (isEditMode) {
    return (
      <FullScreenModal onClose={() => setIsEditMode(false)} title="Modification de la mission">
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

  if (showHomeDetails && home) {
    // Get the original home from the homes context to ensure we have all images
    const originalHome = getHomeById(mission.homeId) || home;
    return <HomeDetails home={originalHome} onClose={() => setShowHomeDetails(false)} />;
  }

  const firstHomeImage = home?.images?.length ? home.images[0] : '';
  const isEmployee = userType === 'employee';
  const employee = getEmployeeById(mission.employeeId);
  const canAcceptMission = isEmployee && !employee;

  return (
    <FullScreenModal onClose={onClose} title="Détails de la mission">
      {selectedImage && (
        <FullScreenModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
          title={`Photo de ${home?.title || 'la mission'}`}
        />
      )}

      <div className="space-y-2" data-mission-details>
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-light">Bien</h3>
              <p className="text-foreground">{home?.title || 'Bien non trouvé'}</p>
            </div>
            <button onClick={() => setShowHomeDetails(true)} title="Voir les détails du bien">
              <IconZoomScan size={40} />
            </button>
          </div>

          {home?.images?.length ? (
            <div className="relative aspect-video w-full max-h-32 mt-1 overflow-hidden rounded-lg">
              <Image
                src={firstHomeImage}
                alt={`Photo de ${home?.title || 'la mission'}`}
                fill
                sizes="(max-width: 768px) 100vw, 300px"
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
                className="px-2 py-1 rounded-lg text-sm text-background"
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
          <h3 className="text-sm font-medium text-light">Date de début</h3>
          <p className="text-foreground">{formatDateTime(mission.startDateTime)}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-light">Date de fin</h3>
          <p className="text-foreground">{formatDateTime(mission.endDateTime)}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-light">Conciergerie</h3>
          <div className="flex items-center gap-3">
            <p className="text-lg font-bold" style={{ color: conciergerieColor }}>
              {conciergerie?.name || mission.conciergerieName}
            </p>

            {/* Contact buttons */}
            <div className="flex gap-3">
              {conciergerie?.tel && (
                <a
                  href={`tel:${conciergerie.tel}`}
                  className="p-1 rounded-full hover:bg-gray-100"
                  title={`Appeler ${conciergerie.name}`}
                >
                  <IconPhone size={24} stroke={1.5} style={{ color: conciergerieColor }} />
                </a>
              )}

              {conciergerie?.email && (
                <a
                  href={`mailto:${conciergerie.email}`}
                  className="p-1 rounded-full hover:bg-gray-100"
                  title={`Envoyer un email à ${conciergerie.name}`}
                >
                  <IconMail size={24} stroke={1.5} style={{ color: conciergerieColor }} />
                </a>
              )}
            </div>
          </div>
        </div>

        {employee && (
          <div>
            <h3 className="text-sm font-medium text-light">Prestataire</h3>
            <p>
              {employee.firstName} {employee.familyName}
            </p>
          </div>
        )}
      </div>

      {!isReadOnly && !isEmployee && (
        <div className="sticky bottom-0 bg-background border-t border-secondary pt-2">
          <div className="flex justify-end gap-2">
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
            {mission.employeeId && (
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
        <div className="sticky bottom-0 bg-background border-t border-secondary pt-2">
          <div className="flex justify-end gap-2">
            <button
              onClick={handleAcceptClick}
              className="flex flex-col items-center p-2 w-20 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
            >
              <IconCheck />
              Accepter
            </button>
          </div>
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
