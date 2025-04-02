'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import FullScreenModal from '@/app/components/fullScreenModal';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import Tooltip from '@/app/components/tooltip';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import HomeDetails from '@/app/homes/components/homeDetails';
import MissionActions from '@/app/missions/components/missionActions';
import MissionForm from '@/app/missions/components/missionForm';
import { Conciergerie, Mission } from '@/app/types/dataTypes';
import { getColorValueByName } from '@/app/utils/color';
import { formatDateTime, getDateRangeDifference } from '@/app/utils/date';
import { getIPFSImageUrl } from '@/app/utils/ipfs';
import { calculateEmployeePointsForDay, calculateMissionPoints, formatNumber, getTaskPoints } from '@/app/utils/task';
import {
  IconAlertTriangle,
  IconBuildingStore,
  IconCalculator,
  IconCalendarEvent,
  IconCheck,
  IconListCheck,
  IconMail,
  IconPhone,
  IconStopwatch,
  IconUserCheck,
  IconUsersGroup,
  IconZoomScan,
} from '@tabler/icons-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type MissionDetailsProps = {
  mission: Mission;
  onClose: () => void;
  isFromCalendar?: boolean;
};

export default function MissionDetails({ mission, onClose, isFromCalendar = false }: MissionDetailsProps) {
  const {
    missions,
    shouldShowAcceptWarning,
    deleteMission,
    cancelMission,
    acceptMission,
    startMission,
    completeMission,
    setShouldShowAcceptWarning,
  } = useMissions();
  const { userId, userType, conciergerieName, conciergeries, employees } = useAuth();
  const { homes } = useHomes();

  const [toast, setToast] = useState<Toast>();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showHomeDetails, setShowHomeDetails] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isEditWarningModalOpen, setIsEditWarningModalOpen] = useState(false);
  const [isDeleteWarningModalOpen, setIsDeleteWarningModalOpen] = useState(false);

  // Get the conciergerie from the mission data
  const [conciergerie, setConciergerie] = useState<Conciergerie>();
  const conciergerieColor = getColorValueByName(conciergerie?.colorName);

  // Get the home data
  const home = homes.find(h => h.id === mission.homeId);

  const isEmployee = userType === 'employee';
  const isConciergerie = userType === 'conciergerie';

  // Fetch conciergerie data when mission changes
  useEffect(() => {
    const conciergerieData = conciergeries.find(c => c.name === home?.conciergerieName);
    setConciergerie(conciergerieData);
  }, [conciergeries, home?.conciergerieName]);

  useEffect(() => {
    setIsReadOnly(isEmployee || (isConciergerie && home?.conciergerieName !== conciergerieName));
  }, [mission, conciergerieName, isEmployee, isConciergerie, home?.conciergerieName]);

  const handleDelete = () => {
    deleteMission(mission.id).then(isSuccess => {
      setToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess ? 'Mission supprimée !' : 'Erreur lors de la suppression de la mission',
      });
      if (isSuccess) setIsDeleteModalOpen(false);
    });
  };

  const handleCancel = () => {
    cancelMission(mission.id).then(isSuccess => {
      setToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess ? 'Mission annulée !' : "Erreur lors de l'annulation de la mission",
      });
    });
  };

  const handleAccept = () => {
    if (shouldShowAcceptWarning) {
      setIsAcceptModalOpen(true);
    } else {
      setIsConfirmationModalOpen(true);
    }
  };

  const handleConfirmAccept = () => {
    acceptMission(mission.id).then(isSuccess => {
      setToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess
          ? 'Mission acceptée ! Retrouvez-la dans votre calendrier.'
          : "Erreur lors de l'acceptation de la mission",
      });
      if (isSuccess) setIsConfirmationModalOpen(false);
    });
  };

  const handleAcceptWithWarning = () => {
    // Update the warning preference if the checkbox is checked
    if (dontShowAgain) {
      setShouldShowAcceptWarning(false);
    }

    // Accept the mission
    acceptMission(mission.id).then(isSuccess => {
      setToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess
          ? 'Mission acceptée ! Retrouvez-la dans votre calendrier.'
          : "Erreur lors de l'acceptation de la mission",
      });
      if (isSuccess) setIsAcceptModalOpen(false);
    });
  };

  const handleStart = () => {
    startMission(mission.id).then(isSuccess => {
      setToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess
          ? 'Mission démarrée ! Retrouvez-la dans votre calendrier.'
          : 'Erreur lors du démarrage de la mission',
      });
    });
  };

  const handleComplete = () => {
    completeMission(mission.id).then(isSuccess => {
      setToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess
          ? 'Mission terminée ! Retrouvez-la dans votre calendrier.'
          : 'Erreur lors du terminage de la mission',
      });
    });
  };

  if (isEditMode) {
    return <MissionForm mission={mission} onClose={() => setIsEditMode(false)} onCancel={onClose} mode="edit" />;
  }

  if (showHomeDetails && home) {
    // Get the original home from the homes context to ensure we have all images
    const originalHome = homes.find(h => h.id === mission.homeId) || home;
    return <HomeDetails home={originalHome} onClose={() => setShowHomeDetails(false)} />;
  }

  const firstHomeImage = home?.images?.length ? home.images[0] : '';
  const employee = employees.find(e => e.id === mission.employeeId);

  // Check if the employee can accept the mission
  const canAcceptMission = isEmployee && !employee;

  // Calculate the total points the employee has for each day of the mission
  const [hasExceededPoints] = (() => {
    if (!canAcceptMission || !userId) return [false, 0];

    // Get the mission points
    const { pointsPerDay } = calculateMissionPoints(mission);

    // Check each day of the mission to see if accepting would exceed 3 points per day
    const startDate = new Date(mission.startDateTime);
    const endDate = new Date(mission.endDateTime);

    // Create dates for the range
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const lastDate = new Date(endDate);
    lastDate.setHours(0, 0, 0, 0);

    let maxPointsForAnyDay = 0;

    // Check each day in the range
    while (currentDate <= lastDate) {
      const pointsForDay = calculateEmployeePointsForDay(userId, new Date(currentDate), missions);

      // Keep track of the maximum points for any day
      maxPointsForAnyDay = Math.max(maxPointsForAnyDay, pointsForDay);

      // If adding this mission would exceed 3 points for this day, return true
      if (pointsForDay + pointsPerDay > 3) {
        return [true];
      }

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return [false];
  })();

  const footer = (
    <>
      <MissionActions
        mission={mission}
        isReadOnly={isReadOnly}
        isFromCalendar={isFromCalendar}
        onEdit={() => {
          if (mission.employeeId) setIsEditWarningModalOpen(true);
          else setIsEditMode(true);
        }}
        onDelete={() => {
          if (mission.employeeId) setIsDeleteWarningModalOpen(true);
          else setIsDeleteModalOpen(true);
        }}
        onRemoveEmployee={handleCancel}
        onStartMission={handleStart}
        onCompleteMission={handleComplete}
        onClose={onClose}
      />
      {canAcceptMission && (
        <div className="sticky bottom-0 bg-background border-t border-secondary py-2">
          <div className="flex justify-end gap-2">
            {hasExceededPoints && (
              <div className="flex items-center text-center p-2 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                <IconAlertTriangle size={16} className="mr-2 w-8 h-8" />
                Le maximum de 3 points/jour est déjà atteint !
              </div>
            )}
            <button
              onClick={handleAccept}
              disabled={hasExceededPoints}
              className={`flex flex-col items-center p-2 w-20 rounded-lg ${
                hasExceededPoints
                  ? 'bg-gray-100 text-gray-400/50 cursor-not-allowed'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              <IconCheck />
              Accepter
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (!home) return;

  return (
    <FullScreenModal onClose={onClose} title="Détails de la mission" footer={footer}>
      <ToastMessage
        toast={toast}
        onClose={() => {
          setToast(undefined);
          if (toast?.type === ToastType.Success) onClose();
        }}
      />

      {selectedImage && (
        <FullScreenModal
          title={`Photo de ${home.title}`}
          imageUrl={getIPFSImageUrl(selectedImage)}
          onClose={() => setSelectedImage(null)}
        />
      )}

      <div className="space-y-2" data-mission-details>
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground">{`${home.title} (${home.geographicZone})`}</p>
            </div>
            <button onClick={() => setShowHomeDetails(true)} title="Voir les détails du bien">
              <IconZoomScan size={40} />
            </button>
          </div>

          {home.images.length ? (
            <div className="relative aspect-video w-full max-h-32 mt-1 overflow-hidden rounded-lg">
              <Image
                src={firstHomeImage}
                alt={`Photo de ${home.title}`}
                fill
                sizes="(max-width: 768px) 100vw, 300px"
                className="object-cover cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedImage(firstHomeImage)}
              />
            </div>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-medium text-light flex items-center gap-1">
            <IconListCheck size={16} />
            Tâches
          </h3>
          <div className="flex flex-wrap gap-2 mt-1">
            {mission.tasks.map(task => {
              const points = getTaskPoints(task);
              return (
                <span
                  key={task}
                  className="px-2 py-1 rounded-lg text-sm text-background flex items-center gap-1"
                  style={{
                    backgroundColor: `${conciergerieColor}`,
                  }}
                >
                  <span>{task}</span>
                  {points && (
                    <span className="ml-1 px-1.5 py-0.5 bg-background/20 rounded-full text-xs">
                      {points} pt{points !== 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-light flex items-center gap-1">
            <IconCalculator size={16} />
            Points de mission
            <Tooltip>
              <p>
                <strong>Règle des 3 points par jour :</strong> Pour ne pas dépasser la capacité de travail d&apos;un
                prestataire, il est impossible d&apos;attribuer plus de 3 points de mission par jour par prestataire.
              </p>
            </Tooltip>
          </h3>
          <span className="font-medium">{calculateMissionPoints(mission).totalPoints} points</span>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-light flex items-center gap-1">
            <IconStopwatch size={16} />
            Nombre d&apos;heures estimées
          </h3>
          <span className="font-medium">{formatNumber(mission.hours)} heures</span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-light flex items-center gap-1">
                <IconCalendarEvent size={16} />
                Date de début
              </h3>
              <p className="text-foreground">{formatDateTime(mission.startDateTime)}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-light flex items-center gap-1">
                <IconCalendarEvent size={16} />
                Date de fin
              </h3>
              <p className="text-foreground">{formatDateTime(mission.endDateTime)}</p>
            </div>
          </div>

          <div className="relative h-24 flex items-center">
            <div className="h-full w-0.5 bg-secondary mx-2"></div>
            <div className="absolute top-0 left-0 w-4 h-0.5 bg-secondary -ml-1.5"></div>
            <div className="absolute bottom-0 left-0 w-4 h-0.5 bg-secondary -ml-1.5"></div>

            <div className="absolute top-1/2 -translate-y-1/2 left-4">
              <div className="flex items-center">
                <div className="w-4 h-0.5 bg-secondary -ml-1.5"></div>
                <div className="ml-0 bg-secondary px-3 py-1 rounded-full text-sm font-medium text-nowrap">
                  {(() => {
                    const now = new Date();
                    const startDate = new Date(mission.startDateTime);
                    const endDate = new Date(mission.endDateTime);
                    const hasStarted = now >= startDate;
                    const hasEnded = now >= endDate;

                    // Otherwise show total duration
                    return hasEnded
                      ? 'Mission terminée'
                      : getDateRangeDifference(hasStarted ? now : startDate, endDate) + (hasStarted ? ' restant' : '');
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Only show conciergerie name if not viewed from calendar by a conciergerie */}
        {!(isFromCalendar && isConciergerie) && conciergerie?.name !== conciergerieName && (
          <div>
            <h3 className="text-sm font-medium text-light flex items-center gap-1">
              <IconBuildingStore size={16} />
              Conciergerie
            </h3>
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
        )}

        {!isFromCalendar && isConciergerie && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-light flex items-center gap-1">
              <IconUsersGroup size={16} />
              Prestataires autorisés
            </h3>
            <div className="flex items-center gap-1">
              <p>{mission.allowedEmployees?.length || 'Tous'}</p>
              {!!mission.allowedEmployees?.length && (
                <Tooltip>
                  <ul className="list-disc pl-4">
                    {mission.allowedEmployees?.map(employeeId => {
                      const employee = employees.find(e => e.id === employeeId);
                      return (
                        <li key={employeeId}>
                          {employee ? `${employee.firstName} ${employee.familyName}` : employeeId}
                        </li>
                      );
                    })}
                  </ul>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {employee && !isFromCalendar && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-light flex items-center gap-1">
              <IconUserCheck size={16} />
              Prestataire
            </h3>
            <p>
              {employee.firstName} {employee.familyName}
            </p>
          </div>
        )}
      </div>

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

      {/* Warning modal when editing a mission that has already been accepted */}
      <ConfirmationModal
        isOpen={isEditWarningModalOpen}
        onConfirm={() => {
          setIsEditWarningModalOpen(false);
          setIsEditMode(true);
        }}
        onCancel={() => setIsEditWarningModalOpen(false)}
        title="Mission déjà acceptée"
        message="Cette mission a déjà été acceptée par un prestataire. En modifiant cette mission, elle sera retirée du planning du prestataire et retournera dans la liste des missions disponibles."
        confirmText="Continuer"
        cancelText="Annuler"
        isDangerous
      />

      {/* Warning modal when deleting a mission that has already been accepted */}
      <ConfirmationModal
        isOpen={isDeleteWarningModalOpen}
        onConfirm={() => {
          setIsDeleteWarningModalOpen(false);
          setIsDeleteModalOpen(true);
        }}
        onCancel={() => setIsDeleteWarningModalOpen(false)}
        title="Mission déjà acceptée"
        message="Cette mission a déjà été acceptée par un prestataire. En supprimant cette mission, elle sera retirée du planning du prestataire."
        confirmText="Continuer"
        cancelText="Annuler"
        isDangerous
      />
    </FullScreenModal>
  );
}
