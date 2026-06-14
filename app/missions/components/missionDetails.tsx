'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import { FullScreenImageCarousel } from '@/app/components/fullScreenImageCarousel';
import FullScreenModal from '@/app/components/fullScreenModal';
import HomeTitle from '@/app/components/homeTitle';
import ResponsiveDateTimeInput from '@/app/components/responsiveDateTimeInput';
import Switch from '@/app/components/switch';
import { ToastType } from '@/app/components/toastMessage';
import Tooltip from '@/app/components/tooltip';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useModal } from '@/app/contexts/modalProvider';
import { useToast } from '@/app/contexts/toastProvider';
import EmployeeDetails from '@/app/employees/components/employeeDetails';
import HomeDetails from '@/app/homes/components/homeDetails';
import { useImageCache } from '@/app/hooks/useImageCache';
import MissionActions from '@/app/missions/components/missionActions';
import MissionCompletionModal from '@/app/missions/components/missionCompletionModal';
import MissionForm from '@/app/missions/components/missionForm';
import type { Employee, Mission } from '@/app/types/dataTypes';
import {
  buttonClassName,
  cn,
  containerClassName,
  descriptionClassName,
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
import { isMissionDuoOpen, isMissionEditable } from '@/app/utils/missionFilters';
import { fallbackImage, getStorageImageUrl } from '@/app/utils/storage';
import { formatHours } from '@/app/utils/task';
import { getUserKey, isEmployeeUser } from '@/app/utils/user';
import {
  IconBuildingStore,
  IconBulb,
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
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

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

// Accept-mission warning with a "don't show again" toggle (self-contained so the Switch stays live)
function AcceptMissionWarning({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const { setShouldShowAcceptWarning } = useMissions();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  return (
    <ConfirmationModal
      isOpen
      title="Accepter la mission"
      message="En acceptant cette mission, vous vous engagez à l'honorer. La seule façon d'annuler est de contacter directement la conciergerie."
      confirmText="Accepter"
      onConfirm={() => {
        if (dontShowAgain) setShouldShowAcceptWarning(false);
        onConfirm();
      }}
      onClose={onClose}
    >
      <div className="mt-4 flex items-center justify-center w-full">
        <label className="flex items-center cursor-pointer select-none w-full justify-center gap-2">
          <span className={cn('text-light', dontShowAgain ? 'font-bold' : '')}>Ne plus afficher ce message</span>
          <Switch enabled={dontShowAgain} onToggle={setDontShowAgain} />
        </label>
      </div>
    </ConfirmationModal>
  );
}

export default function MissionDetails({ mission: propMission, onClose, isFromCalendar = false }: MissionDetailsProps) {
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
    updateMissionDateTime,
    updateMission,
    getMissionReport,
  } = useMissions();
  const { conciergerieName, findConciergerie, findEmployee, userData, isConciergerie } = useAuth();
  const { homes } = useHomes();
  const { openModal, closeModal, closeAllModals } = useModal();
  const { showToast } = useToast();

  const [isEditMode, setIsEditMode] = useState(false);

  const [selectedImageIndex, setSelectedImageIndex] = useState<number>();
  const [showHomeDetails, setShowHomeDetails] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const [selectedReportImageIndex, setSelectedReportImageIndex] = useState<number>();

  // Sync local mission with prop when it changes (e.g., after external updates)
  const [mission, setMission] = useState(propMission);
  useEffect(() => {
    setMission(propMission);
  }, [propMission]);

  // Open a confirmation dialog through the modal singleton (auto-pops on confirm/cancel)
  const confirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    onConfirm: () => void;
    children?: ReactNode;
  }) => {
    const id = openModal(() => (
      <ConfirmationModal
        isOpen
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        isDangerous={options.isDangerous}
        onConfirm={options.onConfirm}
        onClose={() => closeModal(id)}
      >
        {options.children}
      </ConfirmationModal>
    ));
  };

  // Get the conciergerie from the mission data
  const conciergerie = useMemo(
    () => findConciergerie(mission.conciergerieName),
    [mission.conciergerieName, findConciergerie],
  );
  const conciergerieColor = getColorValueByName(conciergerie?.colorName);
  const isOwner = isConciergerie && mission.conciergerieName === conciergerieName;

  // Get the mission report (if any) - permission checks are handled in getMissionReport
  const report = useMemo(
    () => (mission.status === 'completed' ? getMissionReport(mission.id) : undefined),
    [mission.id, mission.status, getMissionReport],
  );

  // Cache report images - report photos are stored in the "House images" bucket under the Reports/ folder
  const reportImageUrls = useMemo(
    () => report?.images.map(path => getStorageImageUrl(path, { width: 200, quality: 80 })) ?? [],
    [report],
  );
  const reportFullImageUrls = useMemo(() => report?.images.map(path => getStorageImageUrl(path)) ?? [], [report]);
  const { getCachedUrl } = useImageCache(reportImageUrls);

  // Date helpers
  const now = new Date();
  const startDate = new Date(mission.startDateTime);
  const endDate = new Date(mission.endDateTime);
  const hasStarted = now >= startDate;
  const hasEnded = now >= endDate;
  const [editingDate, setEditingDate] = useState<'start' | 'end' | null>(null);
  const isDateEditable = isOwner && isMissionEditable(mission) && !editingDate && !hasEnded;

  // Date edit state - allows the conciergerie to adjust start and end dates inline
  const [editStartDate, setEditStartDate] = useState(localISOString(startDate));
  const [editEndDate, setEditEndDate] = useState(localISOString(endDate));
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [pendingDateChanges, setPendingDateChanges] = useState<{ start?: Date; end?: Date }>({});

  // Update edit dates when mission changes (e.g., after form submission)
  useEffect(() => {
    setEditStartDate(localISOString(startDate));
    setEditEndDate(localISOString(endDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.startDateTime, mission.endDateTime]);

  // Get the home data
  const home = homes.find(h => h.id === mission.homeId);

  const handleDelete = () => {
    setIsSubmitting(true);
    deleteMission(mission.id).then(({ success, employeeNotified }) => {
      showToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? employeeNotified
            ? 'Mission supprimée ! Le prestataire a été notifié.'
            : 'Mission supprimée !'
          : 'Erreur lors de la suppression de la mission',
      });
      if (success) onClose();
      else setIsSubmitting(false);
    });
  };

  const handleCancel = () => {
    setIsSubmitting(true);
    cancelMission(mission.id).then(({ success, employeeNotified }) => {
      showToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? employeeNotified
            ? 'Mission annulée ! Le prestataire a été notifié.'
            : 'Mission annulée !'
          : "Erreur lors de l'annulation de la mission",
      });
      if (success) onClose();
      else setIsSubmitting(false);
    });
  };

  const handleAccept = () => {
    if (shouldShowAcceptWarning) {
      const id = openModal(() => (
        <AcceptMissionWarning onConfirm={handleConfirmAccept} onClose={() => closeModal(id)} />
      ));
    } else {
      confirm({
        title: 'Accepter la mission',
        message: 'Êtes-vous sûr de vouloir accepter cette mission ?',
        confirmText: 'Accepter',
        onConfirm: handleConfirmAccept,
      });
    }
  };

  const handleConfirmAccept = () => {
    setIsSubmitting(true);
    acceptMission(mission.id).then(({ success, employeeNotified }) => {
      showToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? employeeNotified
            ? 'Mission acceptée ! Un email de confirmation vous a été envoyé.'
            : 'Mission acceptée ! Retrouvez-la dans votre calendrier.'
          : "Erreur lors de l'acceptation de la mission",
      });
      if (success) onClose();
      else setIsSubmitting(false);
    });
  };

  const handleAccept2 = () => {
    setIsSubmitting(true);
    acceptMission2(mission.id).then(({ success, employeeNotified }) => {
      showToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? employeeNotified
            ? 'Binôme rejoint ! Un email de confirmation vous a été envoyé.'
            : 'Binôme rejoint !'
          : "Erreur lors de l'acceptation du binôme",
      });
      if (success) onClose();
      else setIsSubmitting(false);
    });
  };

  const handleAssignSecondProvider = () => {
    const providerId = prompt('Entrez l&apos;identifiant du prestataire (nom complet ou email) :');
    if (!providerId) return;
    setIsSubmitting(true);
    assignSecondProvider(mission.id, providerId).then(({ success, employeeNotified }) => {
      showToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? employeeNotified
            ? '2ème prestataire assigné ! Un email de confirmation lui a été envoyé.'
            : '2ème prestataire assigné !'
          : "Erreur lors de l'assignation du 2ème prestataire",
      });
      if (success) onClose();
      else setIsSubmitting(false);
    });
  };

  const handleRemoveSecondProvider = () => {
    setIsSubmitting(true);
    removeSecondProvider(mission.id).then(({ success, employeeNotified }) => {
      showToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success
          ? employeeNotified
            ? '2ème prestataire retiré ! Il a été notifié.'
            : '2ème prestataire retiré !'
          : 'Erreur lors du retrait du 2ème prestataire',
      });
      if (success) onClose();
      else setIsSubmitting(false);
    });
  };

  const handleRemoveEmployee = (field: 'employeeId' | 'employeeId2') => {
    confirm({
      title: 'Retirer de la mission',
      message: 'Êtes-vous sûr de vouloir retirer ce prestataire de la mission ?',
      confirmText: 'Retirer',
      isDangerous: true,
      onConfirm: () => handleConfirmRemoveEmployee(field),
    });
  };

  const handleConfirmRemoveEmployee = (employeeFieldToRemove: 'employeeId' | 'employeeId2') => {
    setIsSubmitting(true);

    // Don't remove employees from completed missions (for archive purposes)
    if (mission.status === 'completed') {
      showToast({
        type: ToastType.Error,
        message: "Impossible de retirer un prestataire d'une mission terminée",
      });
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
      const isConciergerie2 = !isEmployeeUser(employee2);

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
      showToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success ? 'Prestataire retiré de la mission' : 'Erreur lors du retrait du prestataire',
      });
      if (success) onClose();
      else setIsSubmitting(false);
    });
  };

  const handleStart = () => {
    setIsSubmitting(true);
    startMission(mission.id).then(isSuccess => {
      showToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess
          ? 'Mission démarrée ! Retrouvez-la dans votre calendrier.'
          : 'Erreur lors du démarrage de la mission',
      });
      if (isSuccess) onClose();
      else setIsSubmitting(false);
    });
  };

  // Open the completion modal on top of the details modal (using internal state to avoid flash)
  const handleComplete = () => {
    setSkipAnimation(true);
    setShowCompletionModal(true);
  };

  // Open employee details on top of the mission details (using internal state to avoid flash)
  const openEmployeeDetails = (emp: Employee) => {
    setSkipAnimation(true);
    setSelectedEmployee(emp);
    setShowEmployeeDetails(true);
  };

  const handleConfirmComplete = () => {
    // This function will be called after the objectives have been checked
    setIsSubmitting(true);
    completeMission(mission.id).then(isSuccess => {
      showToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess ? 'Mission terminée ! Félicitations !' : 'Erreur lors de la validation de la mission',
      });
      if (isSuccess) onClose();
      else setIsSubmitting(false);
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
      showToast({
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
      confirm({
        title: 'Réduction du temps de mission',
        message:
          'Cette modification réduira le temps alloué au prestataire. En confirmant, le prestataire sera retiré de la mission et recevra une notification par email.',
        confirmText: 'Confirmer',
        cancelText: 'Annuler',
        isDangerous: true,
        onConfirm: handleReduceTimeWarningConfirm,
      });
    } else {
      const dates: { startDateTime?: Date; endDateTime?: Date } = {};
      if (pendingDateChanges.start) dates.startDateTime = pendingDateChanges.start;
      if (pendingDateChanges.end) dates.endDateTime = pendingDateChanges.end;
      performDateChange(dates, false);
    }
  };

  if (showHomeDetails && home) {
    // Get the original home from the homes context to ensure we have all images
    const originalHome = homes.find(h => h.id === mission.homeId) || home;
    return (
      <HomeDetails home={originalHome} onClose={() => setShowHomeDetails(false)} isFromCalendar={isFromCalendar} />
    );
  }

  if (showEmployeeDetails && selectedEmployee) {
    return (
      <EmployeeDetails
        employee={selectedEmployee}
        mission={mission}
        onClose={closeAllModals}
        onBack={() => setShowEmployeeDetails(false)}
        skipAnimation
      />
    );
  }

  if (showCompletionModal) {
    return (
      <MissionCompletionModal
        mission={mission}
        onClose={() => setShowCompletionModal(false)}
        onComplete={handleConfirmComplete}
        skipAnimation
      />
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
        if (mission.employeeId)
          confirm({
            title: 'Mission déjà acceptée',
            message:
              'Cette mission a déjà été acceptée par un prestataire. En modifiant cette mission, elle sera retirée du planning du prestataire et retournera dans la liste des missions disponibles.',
            confirmText: 'Continuer',
            cancelText: 'Annuler',
            isDangerous: true,
            onConfirm: () => setIsEditMode(true),
          });
        else setIsEditMode(true);
      }}
      onDelete={() => {
        if (mission.employeeId)
          confirm({
            title: 'Mission déjà acceptée',
            message:
              'Cette mission a déjà été acceptée par un prestataire. En supprimant cette mission, elle sera retirée du planning du prestataire.',
            confirmText: 'Continuer',
            cancelText: 'Annuler',
            isDangerous: true,
            onConfirm: handleDelete,
          });
        else
          confirm({
            title: 'Supprimer la mission',
            message: 'Êtes-vous sûr de vouloir supprimer cette mission ?',
            confirmText: 'Supprimer',
            onConfirm: handleDelete,
          });
      }}
      onRemoveEmployee={() =>
        confirm({
          title: 'Annuler la mission',
          message:
            'Êtes-vous sûr de vouloir annuler cette mission ? En annulant cette mission, elle sera retirée du planning du prestataire et retournera dans la liste des missions disponibles.',
          onConfirm: handleCancel,
        })
      }
      onAcceptMission={handleAccept}
      onAcceptMission2={handleAccept2}
      onAssignSecondProvider={handleAssignSecondProvider}
      onRemoveSecondProvider={handleRemoveSecondProvider}
      onStartMission={handleStart}
      onCompleteMission={handleComplete}
    />
  );

  if (!home) return;

  return (
    <>
      <div style={{ display: isEditMode ? 'block' : 'none' }}>
        <MissionForm
          key={isEditMode ? 'edit' : 'hidden'}
          mission={mission}
          onClose={() => {
            setSkipAnimation(true);
            setIsEditMode(false);
          }}
          onSuccess={updatedMission => {
            setMission(updatedMission);
          }}
          onCancel={() => {
            setSkipAnimation(true);
            setIsEditMode(false);
          }}
          mode="edit"
          skipAnimation
          forceRecalc={isEditMode}
        />
      </div>

      {!isEditMode && (
        <FullScreenModal
          onClose={onClose}
          title="Détails de la mission"
          footer={footer}
          disabled={isSubmitting}
          closeAll
          skipAnimation={skipAnimation}
        >
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

            {!!mission.travellers && (
              <div className="flex items-center justify-between">
                <h3 className={containerClassName}>
                  <IconUsers size={16} />
                  Nombre de voyageurs
                </h3>
                <span className="font-medium">{mission.travellers}</span>
              </div>
            )}

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
                    <div
                      className={cn(
                        textClassName,
                        'bg-secondary px-3 py-1 rounded-2xl',
                        hasStarted && !hasEnded ? 'ml-0' : '-ml-2 whitespace-nowrap',
                      )}
                    >
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
                      {!mission.allowDuo ? <IconUserCheck size={16} /> : <IconUsers size={16} />}
                      {!mission.allowDuo ? 'Prestataire' : 'Binôme'}
                    </h3>
                    <div className="flex items-center gap-2">
                      {(employee2 || isMissionDuoOpen(mission)) && <span className={titleClassName}>+</span>}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div
                            onClick={() => openEmployeeDetails(employee)}
                            className="flex items-center gap-1 cursor-pointer hover:underline hover:text-primary transition-colors"
                          >
                            <span className="text-right">{getUserKey(employee)}</span>
                            <IconInfoCircle className="min-w-4.5" size={18} />
                          </div>
                          {isMissionEditable(mission) && (
                            <button
                              onClick={() => handleRemoveEmployee('employeeId')}
                              className={iconButtonClassName('dangerous')}
                              title="Retirer de la mission"
                            >
                              <IconUserMinus size={24} />
                            </button>
                          )}
                        </div>
                        {employee2 && (
                          <div className="flex items-center justify-between gap-2">
                            {isEmployeeUser(employee2) ? (
                              <div
                                onClick={() => openEmployeeDetails(employee2 as Employee)}
                                className="flex items-center gap-1 cursor-pointer hover:underline hover:text-primary transition-colors"
                              >
                                <span className="text-right">{getUserKey(employee2)}</span>
                                <IconInfoCircle className="min-w-4.5" size={18} />
                              </div>
                            ) : (
                              <span className="text-right">{getUserKey(employee2)}</span>
                            )}
                            {isMissionEditable(mission) && (
                              <button
                                onClick={() => handleRemoveEmployee('employeeId2')}
                                className={iconButtonClassName('dangerous')}
                                title="Retirer de la mission"
                              >
                                <IconUserMinus size={24} />
                              </button>
                            )}
                          </div>
                        )}
                        {isMissionDuoOpen(mission) && (
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

            {mission.allowDuo && !isConciergerie && (
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

            {mission.conciergerieComment && (
              <div className=" p-1 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <IconBulb size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
                    <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                      Commentaire conciergerie
                    </h3>
                  </div>
                  <p className={cn(descriptionClassName, 'px-1 text-yellow-800 dark:text-yellow-200')}>
                    {mission.conciergerieComment}
                  </p>
                </div>
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
                        src={getCachedUrl(reportImageUrls[index])}
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
              imageUrls={reportFullImageUrls}
              initialIndex={selectedReportImageIndex}
              onClose={() => setSelectedReportImageIndex(undefined)}
            />
          )}
        </FullScreenModal>
      )}
    </>
  );
}
