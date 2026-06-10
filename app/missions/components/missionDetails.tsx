'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import { FullScreenImageCarousel } from '@/app/components/fullScreenImageCarousel';
import FullScreenModal from '@/app/components/fullScreenModal';
import HomeTitle from '@/app/components/homeTitle';
import ResponsiveDateTimeInput from '@/app/components/responsiveDateTimeInput';
import Switch from '@/app/components/switch';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import Tooltip from '@/app/components/tooltip';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import EmployeeDetails from '@/app/employees/components/employeeDetails';
import HomeDetails from '@/app/homes/components/homeDetails';
import { useImageCache } from '@/app/hooks/useImageCache';
import MissionActions from '@/app/missions/components/missionActions';
import MissionCompletionModal from '@/app/missions/components/missionCompletionModal';
import MissionForm from '@/app/missions/components/missionForm';
import { fetchMissionReport } from '@/app/actions/missionReport';
import { Employee, Mission, MissionReport } from '@/app/types/dataTypes';
import {
  buttonClassName,
  cn,
  containerClassName,
  iconButtonClassName,
  textClassName,
  textPulseClassName,
  titleClassName,
} from '@/app/utils/className';
import { getColorValueByName } from '@/app/utils/color';
import {
  formatDateTime,
  getDateRangeDifference,
  getMinEndDate,
  getMinStartDate,
  handleMissionEndDateChange,
  handleMissionStartDateChange,
  localISOString,
} from '@/app/utils/date';
import { fallbackImage, getStorageImageUrl } from '@/app/utils/storage';
import { formatHours } from '@/app/utils/task';
import { getUserKey, isEmployee } from '@/app/utils/user';
import {
  IconBuildingStore,
  IconCalendarEvent,
  IconCheck,
  IconInfoCircle,
  IconListCheck,
  IconMail,
  IconNotes,
  IconPencil,
  IconPhone,
  IconStopwatch,
  IconUserCheck,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
  IconUsersGroup,
  IconX,
  IconZoomScan,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

type MissionDetailsProps = {
  mission: Mission;
  onClose: (reopenAfter?: boolean) => void;
  isFromCalendar?: boolean;
  onOpenCompletionModal?: () => void;
  onOpenEmployeeDetails?: (employee: Employee) => void;
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

export default function MissionDetails({
  mission,
  onClose,
  isFromCalendar = false,
  onOpenCompletionModal,
  onOpenEmployeeDetails,
}: MissionDetailsProps) {
  const {
    shouldShowAcceptWarning,
    deleteMission,
    cancelMission,
    acceptMission,
    acceptMission2,
    assignSecondProvider,
    removeSecondProvider,
    startMission,
    completeMission,
    setShouldShowAcceptWarning,
    updateMissionDateTime,
    updateMission,
  } = useMissions();
  const { conciergerieName, findConciergerie, findEmployee, userData, isConciergerie } = useAuth();
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
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<typeof employee>(undefined);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRemoveEmployeeModalOpen, setIsRemoveEmployeeModalOpen] = useState(false);
  const [employeeFieldToRemove, setEmployeeFieldToRemove] = useState<'employeeId' | 'employeeId2' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<MissionReport | null>(null);
  const [selectedReportImageIndex, setSelectedReportImageIndex] = useState<number>();

  // Fetch the mission report (if any) once the mission is completed
  useEffect(() => {
    if (mission.status !== 'completed') {
      setReport(null);
      return;
    }
    let active = true;
    fetchMissionReport(mission.id)
      .then(result => {
        if (active) setReport(result);
      })
      .catch(error => console.error('Error fetching mission report:', error));
    return () => {
      active = false;
    };
  }, [mission.id, mission.status]);

  // Get the conciergerie from the mission data
  const conciergerie = useMemo(
    () => findConciergerie(mission.conciergerieName),
    [mission.conciergerieName, findConciergerie],
  );
  const conciergerieColor = getColorValueByName(conciergerie?.colorName);
  const isOwner = isConciergerie && mission.conciergerieName === conciergerieName;

  // Date helpers
  const now = new Date();
  const startDate = new Date(mission.startDateTime);
  const endDate = new Date(mission.endDateTime);
  const hasStarted = now >= startDate;
  const hasEnded = now >= endDate;
  const [editingDate, setEditingDate] = useState<'start' | 'end' | null>(null);
  const isDateEditable =
    isOwner && mission.status !== 'started' && mission.status !== 'completed' && !editingDate && !hasEnded;

  // Date edit state - allows the conciergerie to adjust start and end dates inline
  const [editStartDate, setEditStartDate] = useState(localISOString(startDate));
  const [editEndDate, setEditEndDate] = useState(localISOString(endDate));
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [isReduceTimeWarningOpen, setIsReduceTimeWarningOpen] = useState(false);
  const [pendingDateChanges, setPendingDateChanges] = useState<{ start?: Date; end?: Date }>({});

  // Get the home data
  const home = homes.find(h => h.id === mission.homeId);

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

  const handleAccept2 = () => {
    setIsSubmitting(true);
    acceptMission2(mission.id).then(({ success, employeeNotified }) => {
      setToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? employeeNotified
            ? 'Binôme rejoint ! Un email de confirmation vous a été envoyé.'
            : 'Binôme rejoint !'
          : "Erreur lors de l'acceptation du binôme",
      });
      if (!success) setIsSubmitting(false);
    });
  };

  const handleAssignSecondProvider = () => {
    const providerId = prompt('Entrez l&apos;identifiant du prestataire (nom complet ou email) :');
    if (!providerId) return;
    setIsSubmitting(true);
    assignSecondProvider(mission.id, providerId).then(({ success, employeeNotified }) => {
      setToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? employeeNotified
            ? '2ème prestataire assigné ! Un email de confirmation lui a été envoyé.'
            : '2ème prestataire assigné !'
          : "Erreur lors de l'assignation du 2ème prestataire",
      });
      if (!success) setIsSubmitting(false);
    });
  };

  const handleRemoveSecondProvider = () => {
    setIsSubmitting(true);
    removeSecondProvider(mission.id).then(({ success, employeeNotified }) => {
      setToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? employeeNotified
            ? '2ème prestataire retiré ! Il a été notifié.'
            : '2ème prestataire retiré !'
          : 'Erreur lors du retrait du 2ème prestataire',
      });
      if (!success) setIsSubmitting(false);
    });
  };

  const handleRemoveEmployee = (field: 'employeeId' | 'employeeId2') => {
    setEmployeeFieldToRemove(field);
    setIsRemoveEmployeeModalOpen(true);
  };

  const handleConfirmRemoveEmployee = () => {
    if (!employeeFieldToRemove) return;
    setIsSubmitting(true);

    // Don't remove employees from completed missions (for archive purposes)
    if (mission.status === 'completed') {
      setToast({
        type: ToastType.Error,
        message: "Impossible de retirer un prestataire d'une mission terminée",
      });
      setIsRemoveEmployeeModalOpen(false);
      setEmployeeFieldToRemove(null);
      setIsSubmitting(false);
      return;
    }

    let updatedMission = {
      ...mission,
      [employeeFieldToRemove]: null,
      modifiedDate: new Date(),
    };

    // Handle duo mission special cases
    if (employeeFieldToRemove === 'employeeId' && mission.employeeId2 && employee2) {
      // If removing primary employee in a duo mission
      const isConciergerie2 = !isEmployee(employee2);

      if (isConciergerie2) {
        // If secondary is a conciergerie, remove both and set status to null
        updatedMission = {
          ...updatedMission,
          employeeId2: null,
          status: null,
        };
      } else {
        // If secondary is an employee, promote to primary
        updatedMission = {
          ...updatedMission,
          employeeId: mission.employeeId2,
          employeeId2: null,
        };
      }
    } else if (employeeFieldToRemove === 'employeeId2' && mission.employeeId) {
      // If removing secondary employee in a duo mission, set status to null
      // (because a duo mission needs 2 employees to be accepted)
      updatedMission = {
        ...updatedMission,
        status: null,
      };
    } else if (employeeFieldToRemove === 'employeeId' && !mission.employeeId2) {
      // If removing primary employee in a non-duo mission, set status to null
      updatedMission = {
        ...updatedMission,
        status: null,
      };
    }

    updateMission(updatedMission).then(({ success }) => {
      setToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success ? 'Prestataire retiré de la mission' : 'Erreur lors du retrait du prestataire',
      });
      setIsRemoveEmployeeModalOpen(false);
      setEmployeeFieldToRemove(null);
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
    // Close the mission details modal but keep the mission selected for completion modal
    onClose(true);
    // Small delay to allow the mission details modal to close before opening completion modal
    setTimeout(() => {
      if (onOpenCompletionModal) {
        onOpenCompletionModal();
      } else {
        // Fallback for backward compatibility
        setIsCompletionModalOpen(true);
      }
    }, 100);
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

  // Start inline date editing
  const startEditingDate = (date: 'start' | 'end') => {
    if (!isOwner) return;
    cancelDateEditing();
    setEditingDate(date);
    setStartDateError('');
    setEndDateError('');
    // Blur any focused button
    (document.activeElement as HTMLElement)?.blur();
  };

  // Cancel date editing - close the fullscreen modal without changes
  const cancelDateEditing = () => {
    setEditingDate(null);
    setEditStartDate(localISOString(pendingDateChanges.start ? pendingDateChanges.start : startDate));
    setEditEndDate(localISOString(pendingDateChanges.end ? pendingDateChanges.end : endDate));
    setStartDateError('');
    setEndDateError('');
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
      if (success) {
        setPendingDateChanges({});
        const newStart = dates.startDateTime ? localISOString(dates.startDateTime) : localISOString(startDate);
        const newEnd = dates.endDateTime ? localISOString(dates.endDateTime) : localISOString(endDate);
        setEditStartDate(newStart);
        setEditEndDate(newEnd);
      } else {
        setIsSubmitting(false);
      }
    });
  };

  // Validate and confirm date changes (just exit edit mode and set pending changes)
  const handleDateEditConfirm = () => {
    const newStart = new Date(editStartDate);
    const newEnd = new Date(editEndDate);

    // Validate dates
    if (editingDate === 'start' && isNaN(newStart.getTime())) {
      setStartDateError('Date invalide');
      return;
    }
    if (editingDate === 'end' && isNaN(newEnd.getTime())) {
      setEndDateError('Date invalide');
      return;
    }

    if (newStart >= newEnd) {
      if (editingDate === 'start') {
        const { endDateTime: adjustedEnd } = handleMissionStartDateChange(editStartDate, editStartDate, editEndDate);
        setEditEndDate(adjustedEnd);
      } else if (editingDate === 'end') {
        const { startDateTime: adjustedStart } = handleMissionEndDateChange(editEndDate, editStartDate, editEndDate);
        setEditStartDate(adjustedStart);
      }
      return;
    }

    // Set pending changes and exit edit mode
    setPendingDateChanges({
      start: newStart,
      end: newEnd,
    });
    setEditingDate(null);
    setStartDateError('');
    setEndDateError('');
  };

  // Handle the warning modal confirmation for time reduction
  const handleReduceTimeWarningConfirm = () => {
    setIsReduceTimeWarningOpen(false);
    const dates: { startDateTime?: Date; endDateTime?: Date } = {};
    if (pendingDateChanges.start) dates.startDateTime = pendingDateChanges.start;
    if (pendingDateChanges.end) dates.endDateTime = pendingDateChanges.end;
    performDateChange(dates, true);
  };

  // Cancel pending date changes and restore original values
  const handleCancelPendingDateChanges = () => {
    setEditingDate(null);
    setPendingDateChanges({});
    setEditStartDate(localISOString(startDate));
    setEditEndDate(localISOString(endDate));
    setStartDateError('');
    setEndDateError('');
  };

  // Confirm pending date changes with time reduction check
  const handleConfirmPendingDateChanges = () => {
    setEditingDate(null);

    const currentStart = startDate;
    const currentEnd = endDate;
    const isStartTimeReduced = pendingDateChanges.start && pendingDateChanges.start > currentStart;
    const isEndTimeReduced = pendingDateChanges.end && pendingDateChanges.end < currentEnd;
    const isTimeReduced = isStartTimeReduced || isEndTimeReduced;

    if (mission.employeeId && isTimeReduced) {
      setIsReduceTimeWarningOpen(true);
    } else {
      const dates: { startDateTime?: Date; endDateTime?: Date } = {};
      if (pendingDateChanges.start) dates.startDateTime = pendingDateChanges.start;
      if (pendingDateChanges.end) dates.endDateTime = pendingDateChanges.end;
      performDateChange(dates, false);
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
  const employee2 = findEmployee(mission.employeeId2) || findConciergerie(mission.employeeId2);

  const hasPendingChanges =
    (pendingDateChanges.start && pendingDateChanges.start.getTime() !== startDate.getTime()) ||
    (pendingDateChanges.end && pendingDateChanges.end.getTime() !== endDate.getTime());

  const footer = hasPendingChanges ? (
    <div className="flex justify-end gap-2 bg-background border-t border-secondary px-2 py-2 rounded-b-lg">
      <button onClick={handleCancelPendingDateChanges} className={buttonClassName('secondary')}>
        Annuler
      </button>
      <button onClick={handleConfirmPendingDateChanges} className={buttonClassName('primary')}>
        Confirmer
      </button>
    </div>
  ) : (
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
      onAcceptMission2={handleAccept2}
      onAssignSecondProvider={handleAssignSecondProvider}
      onRemoveSecondProvider={handleRemoveSecondProvider}
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
                <HomeTitle home={home} />
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

            <div className="flex items-center justify-between">
              <h3 className={containerClassName}>
                <IconListCheck size={16} />
                Tâches
              </h3>
              <div className="flex flex-wrap gap-2 justify-end">
                {mission.tasks.map(task => (
                  <span
                    key={task}
                    className="px-2 py-1 rounded-lg text-sm text-background"
                    style={{
                      backgroundColor: `${conciergerieColor}`,
                    }}
                  >
                    {task}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className={containerClassName}>
                <IconStopwatch size={16} />
                Nombre d&apos;heures estimées
              </h3>
              <span className="font-medium">{formatHours(mission.hours)}</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="space-y-2">
                <div>
                  <h3 className={containerClassName}>
                    <IconCalendarEvent size={16} />
                    Date de début
                  </h3>
                  <div className="flex items-center gap-1 flex-wrap">
                    {editingDate === 'start' ? (
                      <>
                        <ResponsiveDateTimeInput
                          id="Date de début"
                          label=""
                          value={editStartDate}
                          onChange={value => {
                            const { startDateTime: newStart, endDateTime: newEnd } = handleMissionStartDateChange(
                              value,
                              editStartDate,
                              editEndDate,
                            );
                            setEditStartDate(newStart);
                            setEditEndDate(newEnd);
                          }}
                          onEscape={cancelDateEditing}
                          onEnter={handleDateEditConfirm}
                          error={startDateError}
                          onError={setStartDateError}
                          required
                          min={localISOString(getMinStartDate())}
                          className="text-sm h-[28px] content-center"
                          minimal
                          autoFocus={editingDate === 'start'}
                        />
                        <button
                          onClick={handleDateEditConfirm}
                          className={iconButtonClassName('success')}
                          title="Confirmer"
                        >
                          <IconCheck size={20} />
                        </button>
                        <button
                          onClick={cancelDateEditing}
                          className={iconButtonClassName('dangerous')}
                          title="Annuler"
                        >
                          <IconX size={20} />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="flex items-center gap-1 flex-wrap pl-1 pr-[5px]">
                          {formatDateTime(new Date(editStartDate), true)}
                        </p>
                        {isDateEditable && (
                          <button
                            onClick={() => startEditingDate('start')}
                            className={iconButtonClassName()}
                            title="Modifier la date de début"
                          >
                            <IconPencil size={20} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className={containerClassName}>
                    <IconCalendarEvent size={16} />
                    Date de fin
                  </h3>
                  <div className="flex items-center gap-1 flex-wrap">
                    {editingDate === 'end' ? (
                      <>
                        <ResponsiveDateTimeInput
                          id="Date de fin"
                          label=""
                          value={editEndDate}
                          onChange={value => {
                            const { startDateTime: newStart, endDateTime: newEnd } = handleMissionEndDateChange(
                              value,
                              editStartDate,
                              editEndDate,
                            );
                            setEditEndDate(newEnd);
                            setEditStartDate(newStart);
                          }}
                          onEscape={cancelDateEditing}
                          onEnter={handleDateEditConfirm}
                          error={endDateError}
                          onError={setEndDateError}
                          required
                          min={localISOString(getMinEndDate())}
                          className="text-sm h-[28px] content-center"
                          minimal
                          autoFocus={editingDate === 'end'}
                        />
                        <button
                          onClick={handleDateEditConfirm}
                          className={iconButtonClassName('success')}
                          title="Confirmer"
                        >
                          <IconCheck size={20} />
                        </button>
                        <button
                          onClick={cancelDateEditing}
                          className={iconButtonClassName('dangerous')}
                          title="Annuler"
                        >
                          <IconX size={20} />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="flex items-center gap-1 flex-wrap pl-1 pr-[5px]">
                          {formatDateTime(new Date(editEndDate), true)}
                        </p>
                        {isDateEditable && (
                          <button
                            onClick={() => startEditingDate('end')}
                            className={iconButtonClassName()}
                            title="Modifier la date de fin"
                          >
                            <IconPencil size={20} />
                          </button>
                        )}
                      </>
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
                    <div className={cn(textClassName, '-ml-2 bg-secondary px-3 py-1 rounded-full text-nowrap')}>
                      {(() => {
                        // Otherwise show total duration
                        return hasEnded
                          ? 'Mission terminée'
                          : getDateRangeDifference(hasStarted ? now : new Date(editStartDate), new Date(editEndDate)) +
                              (hasStarted ? ' restant' : '');
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Only show conciergerie name if not viewed from calendar by a conciergerie */}
            {(!isFromCalendar || !isConciergerie) && !isOwner && (
              <div>
                <h3 className={containerClassName}>
                  <IconBuildingStore size={16} />
                  Conciergerie
                </h3>
                <div className="flex items-center gap-3">
                  <p className={cn(titleClassName, 'h-6 font-bold')} style={{ color: conciergerieColor }}>
                    {conciergerie?.name || mission.conciergerieName}
                  </p>

                  {/* Contact buttons */}
                  <div className="flex gap-3">
                    {conciergerie?.tel && (
                      <a
                        href={`tel:${conciergerie.tel}`}
                        className={cn(iconButtonClassName(), 'p-0 hover:bg-transparent')}
                        title={`Appeler ${conciergerie.name}`}
                      >
                        <IconPhone size={24} stroke={1.5} style={{ color: conciergerieColor }} />
                      </a>
                    )}

                    {conciergerie?.email && (
                      <a
                        href={`mailto:${conciergerie.email}`}
                        className={cn(iconButtonClassName(), 'p-0 hover:bg-transparent')}
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
                    <h3 className={containerClassName}>
                      {!home.allowDuo ? <IconUserCheck size={16} /> : <IconUsers size={16} />}
                      {!home.allowDuo ? 'Prestataire' : 'Binôme'}
                    </h3>
                    <div className="flex items-center gap-2">
                      {(employee2 ||
                        (home.allowDuo &&
                          !employee2 &&
                          mission.employeeId &&
                          !mission.employeeId2 &&
                          new Date(mission.endDateTime) >= new Date())) && <span className={titleClassName}>+</span>}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div
                            onClick={() => {
                              setSelectedEmployeeForDetails(employee);
                              if (onOpenEmployeeDetails) {
                                onClose(true);
                                onOpenEmployeeDetails(employee);
                              } else {
                                setIsEmployeeDetailsModalOpen(true);
                              }
                            }}
                            className="flex items-center gap-1 cursor-pointer hover:underline hover:text-primary transition-colors"
                          >
                            <span className="text-right">{getUserKey(employee)}</span>
                            <IconInfoCircle className="min-w-4.5" size={18} />
                          </div>
                          <button
                            onClick={() => handleRemoveEmployee('employeeId')}
                            className={iconButtonClassName('dangerous')}
                            title="Retirer de la mission"
                          >
                            <IconUserMinus size={24} />
                          </button>
                        </div>
                        {employee2 && (
                          <div className="flex items-center justify-between gap-2">
                            {isEmployee(employee2) ? (
                              <div
                                onClick={() => {
                                  setSelectedEmployeeForDetails(employee2 as Employee);
                                  if (onOpenEmployeeDetails) {
                                    onClose(true);
                                    onOpenEmployeeDetails(employee2 as Employee);
                                  } else {
                                    setIsEmployeeDetailsModalOpen(true);
                                  }
                                }}
                                className="flex items-center gap-1 cursor-pointer hover:underline hover:text-primary transition-colors"
                              >
                                <span className="text-right">{getUserKey(employee2)}</span>
                                <IconInfoCircle className="min-w-4.5" size={18} />
                              </div>
                            ) : (
                              <span className="text-right">{getUserKey(employee2)}</span>
                            )}
                            <button
                              onClick={() => handleRemoveEmployee('employeeId2')}
                              className={iconButtonClassName('dangerous')}
                              title="Retirer de la mission"
                            >
                              <IconUserMinus size={24} />
                            </button>
                          </div>
                        )}
                        {home.allowDuo &&
                          !employee2 &&
                          mission.employeeId &&
                          !mission.employeeId2 &&
                          new Date(mission.endDateTime) >= new Date() && (
                            <div className="flex items-center justify-between gap-2">
                              <button
                                onClick={() => handleAccept2()}
                                className={cn(
                                  buttonClassName('primary'),
                                  'px-2 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200',
                                )}
                              >
                                <IconUserPlus size={20} />
                                <span>Rejoindre</span>
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className={containerClassName}>
                      <IconUsersGroup size={16} />
                      Prestataires autorisés
                    </h3>
                    <div className="flex items-center gap-1">
                      <Tooltip
                        trigger={
                          <div className="flex items-center gap-1 cursor-help">
                            <p>
                              {mission.allowedEmployees?.length === 1
                                ? mission.allowedEmployees[0]
                                : mission.allowedEmployees?.length || 'Tous'}
                            </p>
                          </div>
                        }
                        size="medium"
                        className="text-foreground"
                        isDisabled={(mission.allowedEmployees?.length || 0) <= 1}
                      >
                        <ul className="list-disc pl-4">
                          {mission.allowedEmployees?.map(employeeId => (
                            <li key={employeeId}>{employeeId}</li>
                          ))}
                        </ul>
                      </Tooltip>
                    </div>
                  </>
                )}
              </div>
            )}

            {home.allowDuo && !isConciergerie && (
              <div className="flex items-center justify-between">
                <h3 className={containerClassName}>
                  <IconUserCheck size={16} />
                  Binôme
                </h3>

                {employee && userData && getUserKey(userData) === getUserKey(employee) ? (
                  employee2 ? (
                    <span className={textClassName}>{getUserKey(employee2)}</span>
                  ) : (
                    <span className={textPulseClassName}>En attente...</span>
                  )
                ) : employee2 && userData && getUserKey(userData) === getUserKey(employee2) ? (
                  <span className={textClassName}>{employee ? getUserKey(employee) : '-'}</span>
                ) : employee ? (
                  <span className={textClassName}>{getUserKey(employee)}</span>
                ) : (
                  <span className={textPulseClassName}>En attente...</span>
                )}
              </div>
            )}

            {report && (report.content || report.images.length > 0) && (
              <div className="space-y-2 border-t border-secondary pt-2">
                <h3 className={containerClassName}>
                  <IconNotes size={16} />
                  Compte rendu
                </h3>
                {report.content && (
                  <p className="text-sm text-foreground whitespace-pre-wrap wrap-break-word">{report.content}</p>
                )}
                {report.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {report.images.map((path, index) => (
                      <img
                        key={path}
                        src={getStorageImageUrl(path, { width: 200, quality: 80 })}
                        alt={`Photo ${index + 1} du compte rendu`}
                        className="object-cover w-full aspect-square rounded-lg cursor-pointer"
                        onClick={() => setSelectedReportImageIndex(index)}
                        onError={e => {
                          (e.target as HTMLImageElement).src = fallbackImage;
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {report && selectedReportImageIndex !== undefined && (
            <FullScreenImageCarousel
              altPrefix="Photo du compte rendu"
              imageUrls={report.images.map(path => getStorageImageUrl(path))}
              initialIndex={selectedReportImageIndex}
              onClose={() => setSelectedReportImageIndex(undefined)}
            />
          )}

          {/* Employee details modal */}
          {isEmployeeDetailsModalOpen && selectedEmployeeForDetails && 'firstName' in selectedEmployeeForDetails && (
            <EmployeeDetails
              employee={selectedEmployeeForDetails}
              onClose={() => setIsEmployeeDetailsModalOpen(false)}
              mission={mission}
            />
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
          />

          <ConfirmationModal
            isOpen={isCancelModalOpen}
            onConfirm={handleCancel}
            onCancel={() => setIsCancelModalOpen(false)}
            title="Annuler la mission"
            message="Êtes-vous sûr de vouloir annuler cette mission ? En annulant cette mission, elle sera retirée du planning du prestataire et retournera dans la liste des missions disponibles."
          />

          <ConfirmationModal
            isOpen={isAcceptModalOpen}
            onConfirm={handleAcceptWithWarning}
            onCancel={() => setIsAcceptModalOpen(false)}
            title="Accepter la mission"
            message="En acceptant cette mission, vous vous engagez à l'honorer. La seule façon d'annuler est de contacter directement la conciergerie."
            confirmText="Accepter"
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

          {/* Warning modal when reducing time for an accepted mission */}
          <ConfirmationModal
            isOpen={isReduceTimeWarningOpen}
            onConfirm={handleReduceTimeWarningConfirm}
            onCancel={() => setIsReduceTimeWarningOpen(false)}
            title="Réduction du temps de mission"
            message="Cette modification réduira le temps alloué au prestataire. En confirmant, le prestataire sera retiré de la mission et recevra une notification par email."
            confirmText="Confirmer"
            cancelText="Annuler"
            isDangerous
          />

          {/* Confirmation modal for removing employee from mission */}
          <ConfirmationModal
            isOpen={isRemoveEmployeeModalOpen}
            onConfirm={handleConfirmRemoveEmployee}
            onCancel={() => {
              setIsRemoveEmployeeModalOpen(false);
              setEmployeeFieldToRemove(null);
            }}
            title="Retirer de la mission"
            message="Êtes-vous sûr de vouloir retirer ce prestataire de la mission ?"
            confirmText="Retirer"
            isDangerous
          />
        </FullScreenModal>
      )}
    </>
  );
}
