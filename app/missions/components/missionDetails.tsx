'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import FullScreenModal from '@/app/components/fullScreenModal';
import { ToastMessage, ToastProps, ToastType } from '@/app/components/toastMessage';
import { useMissions } from '@/app/contexts/missionsProvider';
import HomeDetails from '@/app/homes/components/homeDetails';
import MissionActionButtons from '@/app/missions/components/missionActionButtons';
import MissionForm from '@/app/missions/components/missionForm';
import { Conciergerie, Mission } from '@/app/types/types';
import { getColorValueByName } from '@/app/utils/colorUtil';
import { formatDateTime, getTimeDifference } from '@/app/utils/dateUtils';
import { formatPoints } from '@/app/utils/formatUtils';
import {
  calculateEmployeePointsForDay,
  calculateMissionPoints,
  calculateRemainingPointsPerDay,
  getTaskWithPoints,
} from '@/app/utils/taskUtils';
import { getWelcomeParams } from '@/app/utils/welcomeParams';
import {
  IconAlertTriangle,
  IconCalculator,
  IconCheck,
  IconInfoCircle,
  IconMail,
  IconPhone,
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
    deleteMission,
    removeEmployee,
    getCurrentConciergerie,
    shouldShowAcceptWarning,
    acceptMission,
    startMission,
    completeMission,
    setShouldShowAcceptWarning,
    missions,
    getConciergerieByName,
    getHomeById,
    getEmployeeById,
  } = useMissions();

  const [toastMessage, setToastMessage] = useState<ToastProps>();
  const { userType, employeeData } = getWelcomeParams();

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
  const [conciergerie, setConciergerie] = useState<Conciergerie | null>(null);
  const conciergerieColor = getColorValueByName(conciergerie?.colorName);

  // Fetch conciergerie data when mission changes
  useEffect(() => {
    const loadConciergerieData = async () => {
      try {
        const conciergerieData = await getConciergerieByName(mission.conciergerieName);
        setConciergerie(conciergerieData);
      } catch (error) {
        console.error(`Error fetching conciergerie ${mission.conciergerieName}:`, error);
      }
    };

    loadConciergerieData();
  }, [mission.conciergerieName, getConciergerieByName]);

  // Get the home data
  const home = getHomeById(mission.homeId);

  const isEmployee = userType === 'employee';

  useEffect(() => {
    // Check if the current conciergerie is the one that created the mission
    const currentConciergerie = getCurrentConciergerie();
    if (isEmployee) {
      // Employees can never edit missions
      setIsReadOnly(true);
    } else if (mission.conciergerieName === currentConciergerie?.name) {
      // Conciergerie can edit their own missions
      // Always allow editing if mission hasn't been started
      setIsReadOnly(false);
    } else {
      // Default to read-only
      setIsReadOnly(true);
    }
  }, [mission, getCurrentConciergerie, isEmployee]);

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
    setToastMessage({
      type: ToastType.Success,
      message: 'Mission acceptée ! Retrouvez-la dans votre calendrier.',
    });
  };

  const handleAcceptWithWarning = () => {
    // Update the warning preference if the checkbox is checked
    if (dontShowAgain) {
      setShouldShowAcceptWarning(false);
    }

    // Accept the mission
    acceptMission(mission.id);
    setIsAcceptModalOpen(false);
    setToastMessage({
      type: ToastType.Success,
      message: 'Mission acceptée ! Retrouvez-la dans votre calendrier.',
    });
  };

  if (isEditMode) {
    return <MissionForm mission={mission} onClose={() => setIsEditMode(false)} onCancel={onClose} mode="edit" />;
  }

  if (showHomeDetails && home) {
    // Get the original home from the homes context to ensure we have all images
    const originalHome = getHomeById(mission.homeId) || home;
    return <HomeDetails home={originalHome} onClose={() => setShowHomeDetails(false)} />;
  }

  const firstHomeImage = home?.images?.length ? home.images[0] : '';
  const employee = getEmployeeById(mission.employeeId);

  // Check if the employee can accept the mission
  const canAcceptMission = isEmployee && !employee;

  // Get the employee data from localStorage
  const currentEmployeeId = employeeData?.id;

  // Calculate the total points the employee has for each day of the mission
  const [hasExceededPoints] = (() => {
    if (!canAcceptMission || !currentEmployeeId) return [false, 0];

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
      const pointsForDay = calculateEmployeePointsForDay(currentEmployeeId, new Date(currentDate), missions);

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

  return (
    <FullScreenModal onClose={onClose} title="Détails de la mission">
      {toastMessage && (
        <ToastMessage
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => {
            setToastMessage(undefined);
            if (toastMessage.type === ToastType.Success) onClose();
          }}
        />
      )}
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
          <h3 className="text-sm font-medium text-light">Zone géographique</h3>
          <p className="text-foreground">{home?.geographicZone || 'Non spécifiée'}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-light">Tâches</h3>
          <div className="flex flex-wrap gap-2 mt-1">
            {mission.tasks.map(task => {
              const taskWithPoints = getTaskWithPoints(task.label);
              return (
                <span
                  key={task.label}
                  className="px-2 py-1 rounded-lg text-sm text-background flex items-center gap-1"
                  style={{
                    backgroundColor: `${conciergerieColor}`,
                  }}
                >
                  <span>{task.label}</span>
                  {taskWithPoints && (
                    <span className="ml-1 px-1.5 py-0.5 bg-background/20 rounded-full text-xs">
                      {taskWithPoints.points} pt{taskWithPoints.points !== 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-light flex items-center gap-1">
            <IconCalculator size={16} />
            Points de mission
            <div className="relative inline-block">
              <IconInfoCircle
                size={16}
                className="text-light cursor-help ml-1"
                onMouseOver={() => document.getElementById('points-tooltip')?.classList.remove('hidden')}
                onMouseOut={() => document.getElementById('points-tooltip')?.classList.add('hidden')}
              />
              <div
                id="points-tooltip"
                className="hidden absolute z-10 w-64 p-2 bg-background border border-secondary rounded-md shadow-lg text-xs -left-28 top-6"
              >
                <p>
                  <strong>Règle des 3 points par jour :</strong> Pour ne pas dépasser la capacité de travail d&apos;un
                  prestataire, il est recommandé de ne pas attribuer plus de 3 points de mission par jour.
                </p>
              </div>
            </div>
          </h3>
          <div className="mt-1 space-y-1">
            {(() => {
              const { totalPoints, pointsPerDay } = calculateMissionPoints(mission);
              const remainingPointsPerDay = calculateRemainingPointsPerDay(mission);

              return (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total des points:</span>
                    <span className="font-medium">{formatPoints(totalPoints)} pts</span>
                  </div>
                  {/* Only show points per day if mission spans more than 1 day */}
                  {new Date(mission.endDateTime).getTime() - new Date(mission.startDateTime).getTime() >
                    24 * 60 * 60 * 1000 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">
                          Points par jour {remainingPointsPerDay !== pointsPerDay && 'restant'} :{' '}
                        </span>
                        <span className="font-medium">
                          {remainingPointsPerDay !== pointsPerDay
                            ? formatPoints(remainingPointsPerDay)
                            : formatPoints(pointsPerDay)}
                          pts/jour
                        </span>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-light">Date de début</h3>
              <p className="text-foreground">{formatDateTime(mission.startDateTime)}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-light">Date de fin</h3>
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
                      : getTimeDifference(hasStarted ? now : startDate, endDate) + (hasStarted ? ' restant' : '');
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Only show conciergerie name if not viewed from calendar by a conciergerie */}
        {!(isFromCalendar && userType === 'conciergerie') && (
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
        )}

        {employee && !isFromCalendar && (
          <div>
            <h3 className="text-sm font-medium text-light">Prestataire</h3>
            <p>
              {employee.firstName} {employee.familyName}
            </p>
          </div>
        )}
      </div>

      {/* Display action buttons for non-calendar view */}
      {!isFromCalendar && (
        <MissionActionButtons
          mission={mission}
          isEmployee={isEmployee}
          isReadOnly={isReadOnly}
          isFromCalendar={isFromCalendar}
          currentEmployeeId={currentEmployeeId || ''}
          userType={userType || 'employee'}
          onEdit={() => {
            if (mission.employeeId) {
              setIsEditWarningModalOpen(true);
            } else {
              setIsEditMode(true);
            }
          }}
          onDelete={() => {
            if (mission.employeeId) {
              setIsDeleteWarningModalOpen(true);
            } else {
              setIsDeleteModalOpen(true);
            }
          }}
          onRemoveEmployee={handleRemoveEmployee}
          onStartMission={startMission}
          onCompleteMission={completeMission}
          onClose={onClose}
        />
      )}
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
              onClick={handleAcceptClick}
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

      {/* Display action buttons for calendar view */}
      {isFromCalendar && (
        <MissionActionButtons
          mission={mission}
          isEmployee={isEmployee}
          isReadOnly={isReadOnly}
          isFromCalendar={isFromCalendar}
          currentEmployeeId={currentEmployeeId || ''}
          userType={userType || 'employee'}
          onEdit={() => {
            if (mission.employeeId) {
              setIsEditWarningModalOpen(true);
            } else {
              setIsEditMode(true);
            }
          }}
          onDelete={() => {
            if (mission.employeeId) {
              setIsDeleteWarningModalOpen(true);
            } else {
              setIsDeleteModalOpen(true);
            }
          }}
          onRemoveEmployee={handleRemoveEmployee}
          onStartMission={startMission}
          onCompleteMission={completeMission}
          onClose={onClose}
        />
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
