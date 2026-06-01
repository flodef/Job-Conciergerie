'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import DateTimeInput from '@/app/components/dateTimeInput';
import { FullScreenImageCarousel } from '@/app/components/fullScreenImageCarousel';
import FullScreenModal from '@/app/components/fullScreenModal';
import Switch from '@/app/components/switch';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import Tooltip from '@/app/components/tooltip';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import EmployeeDetails from '@/app/employees/components/employeeDetails';
import HomeDetails from '@/app/homes/components/homeDetails';
import MissionActions, { MAX_POINTS_PER_DAY } from '@/app/missions/components/missionActions';
import MissionCompletionModal from '@/app/missions/components/missionCompletionModal';
import MissionForm from '@/app/missions/components/missionForm';
import { Mission } from '@/app/types/dataTypes';
import { getColorValueByName } from '@/app/utils/color';
import { formatDateTime, getDateRangeDifference, localISOString } from '@/app/utils/date';
import { fallbackImage, getStorageImageUrl } from '@/app/utils/storage';
import { useImageCache } from '@/app/hooks/useImageCache';
import { calculateMissionPoints, formatHour, getTaskPoints } from '@/app/utils/task';
import {
  IconBuildingStore,
  IconCalculator,
  IconCalendarEvent,
  IconInfoCircle,
  IconListCheck,
  IconMail,
  IconPencil,
  IconPhone,
  IconStopwatch,
  IconUserCheck,
  IconUsersGroup,
  IconZoomScan,
} from '@tabler/icons-react';
import { cn, errorClassName, inputFieldClassName } from '@/app/utils/className';
import { useMemo, useState } from 'react';

type MissionDetailsProps = {
  mission: Mission;
  onClose: () => void;
  isFromCalendar?: boolean;
};

// Cached image preview component
function HomeImagePreview({
  imageUrl,
  homeTitle,
  onClick,
}: {
  imageUrl: string;
  homeTitle: string;
  onClick: () => void;
}) {
  const { getCachedUrl } = useImageCache([imageUrl]);
  const cachedUrl = getCachedUrl(imageUrl);

  return (
    <div className="relative aspect-video w-full max-h-32 mt-1 overflow-hidden rounded-lg">
      <img
        src={cachedUrl}
        alt={`Photo de ${homeTitle}`}
        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onClick}
        onError={e => {
          e.currentTarget.src = fallbackImage;
        }}
      />
    </div>
  );
}

export default function MissionDetails({ mission, onClose, isFromCalendar = false }: MissionDetailsProps) {
  const {
    shouldShowAcceptWarning,
    deleteMission,
    cancelMission,
    acceptMission,
    startMission,
    completeMission,
    setShouldShowAcceptWarning,
    updateMissionDateTime,
  } = useMissions();
  const { userType, conciergerieName, findConciergerie, findEmployee } = useAuth();
  const { homes } = useHomes();

  const [toast, setToast] = useState<Toast>();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>();
  const [showHomeDetails, setShowHomeDetails] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isEditWarningModalOpen, setIsEditWarningModalOpen] = useState(false);
  const [isDeleteWarningModalOpen, setIsDeleteWarningModalOpen] = useState(false);
  const [isEmployeeDetailsModalOpen, setIsEmployeeDetailsModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date edit state - allows the conciergerie to adjust only the start or end date
  const [dateEditField, setDateEditField] = useState<'start' | 'end' | undefined>(undefined);
  const [dateEditValue, setDateEditValue] = useState('');
  const [dateEditError, setDateEditError] = useState('');
  const [pendingDateChange, setPendingDateChange] = useState<{ startDateTime?: Date; endDateTime?: Date } | null>(null);
  const [isReduceTimeWarningOpen, setIsReduceTimeWarningOpen] = useState(false);

  // Get the conciergerie from the mission data
  const conciergerie = useMemo(
    () => findConciergerie(mission.conciergerieName),
    [mission.conciergerieName, findConciergerie],
  );
  const conciergerieColor = getColorValueByName(conciergerie?.colorName);

  // Get the home data
  const home = homes.find(h => h.id === mission.homeId);

  const isConciergerie = userType === 'conciergerie';

  const handleDelete = () => {
    setIsSubmitting(true);
    setIsDeleteModalOpen(false);
    deleteMission(mission.id).then(({ success, employeeNotified }) => {
      setToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? employeeNotified
            ? 'Mission supprimée ! Le prestataire a été notifié.'
            : 'Mission supprimée !'
          : 'Erreur lors de la suppression de la mission',
      });
      if (!success) setIsSubmitting(false);
    });
  };

  const handleCancel = () => {
    setIsSubmitting(true);
    setIsCancelModalOpen(false);
    cancelMission(mission.id).then(({ success, employeeNotified }) => {
      setToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? employeeNotified
            ? 'Mission annulée ! Le prestataire a été notifié.'
            : 'Mission annulée !'
          : "Erreur lors de l'annulation de la mission",
      });
      if (!success) setIsSubmitting(false);
    });
  };

  const handleAccept = () => {
    if (shouldShowAcceptWarning) setIsAcceptModalOpen(true);
    else setIsConfirmationModalOpen(true);
  };

  const handleConfirmAccept = () => {
    setIsSubmitting(true);
    setIsConfirmationModalOpen(false);
    acceptMission(mission.id).then(({ success, employeeNotified }) => {
      setToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? employeeNotified
            ? 'Mission acceptée ! Un email de confirmation vous a été envoyé.'
            : 'Mission acceptée ! Retrouvez-la dans votre calendrier.'
          : "Erreur lors de l'acceptation de la mission",
      });
      if (!success) setIsSubmitting(false);
    });
  };

  const handleAcceptWithWarning = () => {
    // Update the warning preference if the checkbox is checked
    if (dontShowAgain) setShouldShowAcceptWarning(false);

    // Accept the mission
    setIsAcceptModalOpen(false);
    handleConfirmAccept();
  };

  const handleStart = () => {
    setIsSubmitting(true);
    startMission(mission.id).then(isSuccess => {
      setToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess
          ? 'Mission démarrée ! Retrouvez-la dans votre calendrier.'
          : 'Erreur lors du démarrage de la mission',
      });
      if (!isSuccess) setIsSubmitting(false);
    });
  };

  const handleComplete = () => {
    // Open the completion modal instead of immediately completing the mission
    setIsCompletionModalOpen(true);
  };

  const handleConfirmComplete = () => {
    // This function will be called after the objectives have been checked
    setIsSubmitting(true);
    completeMission(mission.id).then(isSuccess => {
      setToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess ? 'Mission terminée ! Félicitations !' : 'Erreur lors de la validation de la mission',
      });
      if (!isSuccess) setIsSubmitting(false);
    });
  };

  // Open the date editor for a specific field, pre-filled with the current value
  const openDateEditor = (field: 'start' | 'end') => {
    setDateEditError('');
    setDateEditValue(localISOString(new Date(field === 'start' ? mission.startDateTime : mission.endDateTime)));
    setDateEditField(field);
  };

  // Apply the date change in DB and notify the prestataire accordingly
  const performDateChange = (dates: { startDateTime?: Date; endDateTime?: Date }, removeEmployee: boolean) => {
    setIsSubmitting(true);
    updateMissionDateTime(mission.id, dates, removeEmployee).then(({ success, employeeNotified }) => {
      setToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? removeEmployee
            ? employeeNotified
              ? 'Date modifiée ! Le prestataire a été retiré et notifié.'
              : 'Date modifiée ! Le prestataire a été retiré de la mission.'
            : employeeNotified
              ? 'Date modifiée ! Le prestataire a été informé de son temps supplémentaire.'
              : 'Date modifiée avec succès !'
          : 'Erreur lors de la modification de la date',
      });
      if (!success) setIsSubmitting(false);
    });
  };

  // Decide whether the change grants more time (keep prestataire) or reduces it (warn + remove)
  const proceedDateChange = (dates: { startDateTime?: Date; endDateTime?: Date }, isMoreTime: boolean) => {
    setDateEditField(undefined);
    if (mission.employeeId && !isMoreTime) {
      // Reducing the prestataire's time on an accepted mission - warn before removing them
      setPendingDateChange(dates);
      setIsReduceTimeWarningOpen(true);
    } else {
      // Extra time (or no prestataire assigned) - keep the prestataire
      performDateChange(dates, false);
    }
  };

  // Validate the chosen date then route to the correct flow
  const handleDateEditConfirm = () => {
    if (!dateEditField || !dateEditValue) return;
    const newDate = new Date(dateEditValue);
    if (isNaN(newDate.getTime())) {
      setDateEditError('Date invalide');
      return;
    }

    const currentStart = new Date(mission.startDateTime);
    const currentEnd = new Date(mission.endDateTime);

    if (dateEditField === 'start') {
      if (newDate.getTime() === currentStart.getTime()) {
        setDateEditField(undefined);
        return;
      }
      if (newDate >= currentEnd) {
        setDateEditError('La date de début doit être avant la date de fin.');
        return;
      }
      // An earlier start grants more time to the prestataire
      proceedDateChange({ startDateTime: newDate }, newDate < currentStart);
    } else {
      if (newDate.getTime() === currentEnd.getTime()) {
        setDateEditField(undefined);
        return;
      }
      if (newDate <= currentStart) {
        setDateEditError('La date de fin doit être après la date de début.');
        return;
      }
      // A later end grants more time to the prestataire
      proceedDateChange({ endDateTime: newDate }, newDate > currentEnd);
    }
  };

  if (isEditMode)
    return <MissionForm mission={mission} onClose={() => setIsEditMode(false)} onCancel={onClose} mode="edit" />;

  if (showHomeDetails && home) {
    // Get the original home from the homes context to ensure we have all images
    const originalHome = homes.find(h => h.id === mission.homeId) || home;
    return (
      <HomeDetails home={originalHome} onClose={() => setShowHomeDetails(false)} isFromCalendar={isFromCalendar} />
    );
  }

  const firstHomeImage = home?.images?.length ? home.images[0] : '';
  const employee = findEmployee(mission.employeeId);

  const footer = (
    <MissionActions
      mission={mission}
      onEdit={() => {
        if (mission.employeeId) setIsEditWarningModalOpen(true);
        else setIsEditMode(true);
      }}
      onDelete={() => {
        if (mission.employeeId) setIsDeleteWarningModalOpen(true);
        else setIsDeleteModalOpen(true);
      }}
      onRemoveEmployee={() => setIsCancelModalOpen(true)}
      onAcceptMission={handleAccept}
      onStartMission={handleStart}
      onCompleteMission={handleComplete}
    />
  );

  if (!home) return;

  const hasSuccessToast = toast?.type === ToastType.Success;

  return (
    <>
      <ToastMessage
        toast={toast}
        onClose={() => {
          setToast(undefined);
          if (toast?.type === ToastType.Success) onClose();
        }}
      />

      {!hasSuccessToast && (
        <FullScreenModal onClose={onClose} title="Détails de la mission" footer={footer} disabled={isSubmitting}>
          {selectedImageIndex !== undefined && (
            <FullScreenImageCarousel
              altPrefix={`Photo de ${home.title}`}
              imageUrls={home.images}
              initialIndex={selectedImageIndex}
              onClose={() => setSelectedImageIndex(undefined)}
            />
          )}

          <div className="space-y-2" data-mission-details>
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground">{`${home.title} (${home.geographicZone})`}</p>
                </div>
                <button
                  className="cursor-pointer"
                  onClick={() => setShowHomeDetails(true)}
                  title="Voir les détails du bien"
                >
                  <IconZoomScan size={40} />
                </button>
              </div>

              {home.images.length ? (
                <HomeImagePreview
                  imageUrl={getStorageImageUrl(firstHomeImage, { width: 400, quality: 80 })}
                  homeTitle={home.title}
                  onClick={() => setSelectedImageIndex(home.images.indexOf(firstHomeImage))}
                />
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
                    <strong>Règle des {MAX_POINTS_PER_DAY} points par jour :</strong> Pour ne pas dépasser la capacité
                    de travail d&apos;un prestataire, il est impossible d&apos;attribuer plus de {MAX_POINTS_PER_DAY}{' '}
                    points de mission par jour par prestataire.
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
              <span className="font-medium">{formatHour(mission.hours)}</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="space-y-2">
                <div>
                  <h3 className="text-sm font-medium text-light flex items-center gap-1">
                    <IconCalendarEvent size={16} />
                    Date de début
                  </h3>
                  <div className="flex items-center gap-1">
                    <p className="text-foreground">{formatDateTime(mission.startDateTime)}</p>
                    {isConciergerie && mission.status !== 'completed' && (
                      <button
                        onClick={() => openDateEditor('start')}
                        className="p-1 rounded-full hover:bg-secondary/20 transition-colors cursor-pointer"
                        title="Modifier la date de début"
                      >
                        <IconPencil size={20} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-light flex items-center gap-1">
                    <IconCalendarEvent size={16} />
                    Date de fin
                  </h3>
                  <div className="flex items-center gap-1">
                    <p className="text-foreground">{formatDateTime(mission.endDateTime)}</p>
                    {isConciergerie && mission.status !== 'completed' && (
                      <button
                        onClick={() => openDateEditor('end')}
                        className="p-1 rounded-full hover:bg-secondary/20 transition-colors cursor-pointer"
                        title="Modifier la date de fin"
                      >
                        <IconPencil size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative h-24 flex items-center">
                <div className="h-full w-0.5 bg-secondary -mx-1"></div>
                <div className="absolute top-0 left-0 w-3 h-0.5 bg-secondary -ml-4"></div>
                <div className="absolute bottom-0 left-0 w-3 h-0.5 bg-secondary -ml-4"></div>

                <div className="absolute top-1/2 -translate-y-1/2 left-0.5">
                  <div className="flex items-center">
                    <div className="w-4 h-0.5 bg-secondary -ml-1"></div>
                    <div className="-ml-2 bg-secondary px-3 py-1 rounded-full text-sm font-medium text-nowrap">
                      {(() => {
                        const now = new Date();
                        const startDate = new Date(mission.startDateTime);
                        const endDate = new Date(mission.endDateTime);
                        const hasStarted = now >= startDate;
                        const hasEnded = now >= endDate;

                        // Otherwise show total duration
                        return hasEnded
                          ? 'Mission terminée'
                          : getDateRangeDifference(hasStarted ? now : startDate, endDate) +
                              (hasStarted ? ' restant' : '');
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
                {employee ? (
                  <>
                    <h3 className="text-sm font-medium text-light flex items-center gap-1">
                      <IconUserCheck size={16} />
                      Prestataire
                    </h3>
                    <div
                      onClick={() => setIsEmployeeDetailsModalOpen(true)}
                      className="flex items-center gap-1 cursor-pointer hover:underline hover:text-primary transition-colors"
                    >
                      <span className="text-right">
                        {employee.firstName} {employee.familyName}
                      </span>
                      <IconInfoCircle className="min-w-4.5" size={18} />
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-medium text-light flex items-center gap-1">
                      <IconUsersGroup size={16} />
                      Prestataires autorisés
                    </h3>
                    <div className="flex items-center gap-1">
                      <p>{mission.allowedEmployees?.length || 'Tous'}</p>
                      {!!mission.allowedEmployees?.length && (
                        <Tooltip>
                          <ul className="list-disc pl-4">
                            {mission.allowedEmployees?.map(employeeId => (
                              <li key={employeeId}>{employeeId}</li>
                            ))}
                          </ul>
                        </Tooltip>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Employee details modal */}
          {isEmployeeDetailsModalOpen && employee && (
            <EmployeeDetails employee={employee} onClose={() => setIsEmployeeDetailsModalOpen(false)} />
          )}

          {isCompletionModalOpen && (
            <MissionCompletionModal
              mission={mission}
              onClose={() => setIsCompletionModalOpen(false)}
              onComplete={handleConfirmComplete}
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
            isOpen={isCancelModalOpen}
            onConfirm={handleCancel}
            onCancel={() => setIsCancelModalOpen(false)}
            title="Annuler la mission"
            message="Êtes-vous sûr de vouloir annuler cette mission ? En annulant cette mission, elle sera retirée du planning du prestataire et retournera dans la liste des missions disponibles."
            confirmText="Confirmer"
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
            <div className="mt-4 flex items-center justify-center w-full">
              <label className="flex items-center cursor-pointer select-none w-full justify-center gap-2">
                <span className={cn('text-light', dontShowAgain ? 'font-bold' : '')}>Ne plus afficher ce message</span>
                <Switch enabled={dontShowAgain} onChange={() => setDontShowAgain(!dontShowAgain)} />
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

          {/* Date editing modal */}
          <ConfirmationModal
            isOpen={dateEditField !== undefined}
            onConfirm={handleDateEditConfirm}
            onCancel={() => setDateEditField(undefined)}
            title={dateEditField === 'start' ? 'Modifier la date de début' : 'Modifier la date de fin'}
            message=""
            confirmText="Confirmer"
            cancelText="Annuler"
          >
            <div className="mt-4">
              <DateTimeInput
                id={dateEditField === 'start' ? 'edit-start-date' : 'edit-end-date'}
                label={dateEditField === 'start' ? 'Nouvelle date de début' : 'Nouvelle date de fin'}
                value={dateEditValue}
                onChange={setDateEditValue}
                error={dateEditError}
                onError={setDateEditError}
                required
                min={dateEditField === 'start' ? undefined : localISOString(new Date(mission.startDateTime))}
                max={dateEditField === 'end' ? undefined : localISOString(new Date(mission.endDateTime))}
              />
            </div>
          </ConfirmationModal>

          {/* Warning modal when reducing time for an accepted mission */}
          <ConfirmationModal
            isOpen={isReduceTimeWarningOpen}
            onConfirm={() => {
              setIsReduceTimeWarningOpen(false);
              if (pendingDateChange) {
                performDateChange(pendingDateChange, true);
                setPendingDateChange(null);
              }
            }}
            onCancel={() => {
              setIsReduceTimeWarningOpen(false);
              setPendingDateChange(null);
            }}
            title="Réduction du temps de mission"
            message="Cette modification réduira le temps alloué au prestataire. En confirmant, le prestataire sera retiré de la mission et recevra une notification par email."
            confirmText="Confirmer"
            cancelText="Annuler"
            isDangerous
          />
        </FullScreenModal>
      )}
    </>
  );
}
