'use client';

import { deleteEmployeeData, updateEmployeeStatusAction } from '@/app/actions/employee';
import ConfirmationModal from '@/app/components/confirmationModal';
import FullScreenModal from '@/app/components/fullScreenModal';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useModal } from '@/app/contexts/modalProvider';
import { useToast } from '@/app/contexts/toastProvider';
import type { Employee, Mission, MissionStatus } from '@/app/types/dataTypes';
import {
  actionButtonBarClassName,
  actionButtonClassName,
  cn,
  containerClassName,
  descriptionClassName,
  labelClassName,
} from '@/app/utils/className';
import { formatDate } from '@/app/utils/date';
import { countEmployeeMissions, getEmployeeFullName, updateEmployeeStatus } from '@/app/utils/employee';
import { isMissionEditable } from '@/app/utils/missionFilters';
import { getUserKey } from '@/app/utils/user';
import { IconArrowLeft, IconCheck, IconMail, IconMapPin, IconPhone, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';

type EmployeeDetailsProps = {
  employee: Employee;
  onClose: () => void;
  onBack?: () => void;
  mission?: Mission;
  skipAnimation?: boolean;
};

export default function EmployeeDetails({
  employee,
  onClose,
  onBack,
  mission,
  skipAnimation = false,
}: EmployeeDetailsProps) {
  const { updateUserData, userData, employees } = useAuth();
  const { missions, removeSecondProvider, updateMission } = useMissions();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open a confirmation dialog through the modal singleton (auto-pops on confirm/cancel)
  const confirm = (options: {
    title: string;
    message: string;
    confirmText: string;
    isDangerous?: boolean;
    onConfirm: () => void;
  }) => {
    const id = openModal(() => (
      <ConfirmationModal
        isOpen
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        isDangerous={options.isDangerous}
        onConfirm={options.onConfirm}
        onClose={() => closeModal(id)}
      />
    ));
  };

  // Helper function to count missions by status
  const countMissions = (status: MissionStatus) => {
    const employeeId = getUserKey(employee);
    if (!employeeId) return 0;

    return missions.filter(mission => mission.employeeId === employeeId && mission.status === status).length;
  };

  const handleStatusChange = (newStatus: 'accepted' | 'rejected') => {
    setIsSubmitting(true);
    updateEmployeeStatus(employee, newStatus, userData, missions, employees || [], updateUserData)
      .then(({ updatedEmployee, emailSent }) => {
        showToast({
          type: newStatus === 'accepted' ? ToastType.Success : ToastType.Info,
          message: `${getEmployeeFullName(updatedEmployee)} a été ${
            newStatus === 'accepted' ? 'accepté' : 'rejeté'
          }${emailSent ? '. Le prestataire a été notifié par email.' : '.'}`,
        });
        onClose();
      })
      .catch(error => {
        showToast({
          type: ToastType.Error,
          message: error.toString(),
          error,
        });
        setIsSubmitting(false);
      });
  };

  const handleDelete = async () => {
    setIsSubmitting(true);

    // Check if employee has completed missions
    const hasCompleted = countMissions('completed') > 0;

    const updateAction = hasCompleted
      ? () => updateEmployeeStatusAction(employee, 'deleted') // Mark as deleted instead of deleting from DB
      : () => deleteEmployeeData(employee); // Delete from the DB

    updateAction().then(isSuccess => {
      showToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess ? 'Prestataire supprimé !' : 'Erreur lors de la suppression du prestataire',
      });
      if (isSuccess) onClose();
      else setIsSubmitting(false);
    });
  };

  const handleRemoveFromMission = () => {
    if (!mission) return;

    setIsSubmitting(true);

    const employeeId = getUserKey(employee);
    if (!employeeId) {
      showToast({ type: ToastType.Error, message: "Impossible d'identifier le prestataire" });
      setIsSubmitting(false);
      return;
    }

    const showResult = ({ success }: { success: boolean }) => {
      showToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success ? 'Prestataire retiré de la mission' : 'Erreur lors du retrait du prestataire',
      });
      if (success) onClose();
      else setIsSubmitting(false);
    };

    if (mission.employeeId === employeeId) {
      const updatedMission = { ...mission, employeeId: null, status: null };
      updateMission(updatedMission).then(showResult);
    } else if (mission.employeeId2 === employeeId) {
      removeSecondProvider(mission.id).then(showResult);
    } else {
      showToast({ type: ToastType.Error, message: "Le prestataire n'est pas assigné à cette mission" });
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className={actionButtonBarClassName}>
      {mission ? (
        <>
          <button onClick={onBack} className={actionButtonClassName}>
            <IconArrowLeft />
            Retour
          </button>
          {isMissionEditable(mission) && (
            <button
              onClick={() =>
                confirm({
                  title: 'Retirer de la mission',
                  message: 'Êtes-vous sûr de vouloir retirer ce prestataire de la mission ?',
                  confirmText: 'Retirer',
                  isDangerous: true,
                  onConfirm: handleRemoveFromMission,
                })
              }
              className={cn(actionButtonClassName, 'bg-orange-100 text-orange-700')}
            >
              <IconX />
              Retirer
            </button>
          )}
        </>
      ) : (
        <>
          {(employee.status === 'accepted' || employee.status === 'pending') && (
            <button
              onClick={() =>
                confirm({
                  title: 'Rejeter le prestataire',
                  message: `Vous êtes sur le point de rejeter ${getEmployeeFullName(employee)}.${
                    countEmployeeMissions(employee, missions) > 0
                      ? ` Ce prestataire sera retiré de ses ${countEmployeeMissions(employee, missions)} mission(s).`
                      : ''
                  } Il ne pourra plus accéder à l'application.`,
                  confirmText: 'Rejeter',
                  isDangerous: true,
                  onConfirm: () => handleStatusChange('rejected'),
                })
              }
              className={cn(actionButtonClassName, 'bg-red-100 text-red-700')}
            >
              <IconX />
              Rejeter
            </button>
          )}
          {employee.status === 'rejected' && (
            <button
              onClick={() =>
                confirm({
                  title: 'Accepter le prestataire',
                  message: `Vous êtes sur le point d'accepter ${getEmployeeFullName(employee)} qui était précédemment rejeté. Ce prestataire pourra à nouveau accéder à l'application.`,
                  confirmText: 'Accepter',
                  onConfirm: () => handleStatusChange('accepted'),
                })
              }
              className={cn(actionButtonClassName, 'bg-green-100 text-green-700')}
            >
              <IconCheck />
              Accepter
            </button>
          )}
          {employee.status === 'pending' && (
            <button
              onClick={() => handleStatusChange('accepted')}
              className={cn(actionButtonClassName, 'bg-green-100 text-green-700')}
            >
              <IconCheck />
              Accepter
            </button>
          )}
          <button
            onClick={() =>
              confirm({
                title: 'Supprimer le prestataire',
                message: `Êtes-vous sûr de vouloir supprimer ce prestataire de l'application ?\n\n⚠️ ATTENTION ⚠️\nCette action est irréversible !!`,
                confirmText: 'Supprimer',
                isDangerous: true,
                onConfirm: handleDelete,
              })
            }
            className={cn(actionButtonClassName, 'bg-red-100 text-red-700')}
          >
            <IconTrash />
            Supprimer
          </button>
        </>
      )}
    </div>
  );

  return (
    <FullScreenModal
      title={getEmployeeFullName(employee)}
      onClose={onClose}
      footer={footer}
      disabled={isSubmitting}
      skipAnimation={skipAnimation}
    >
      <div>
        <div className={containerClassName}>
          Statut :
          <span
            className={cn(
              'text-base font-bold',
              {
                pending: 'text-yellow-500',
                accepted: 'text-green-500',
                rejected: 'text-red-500',
                deleted: 'text-red-500',
              }[employee.status],
            )}
          >
            {employee.status === 'pending' ? 'En attente' : employee.status === 'accepted' ? 'Accepté' : 'Rejeté'}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <h4 className={descriptionClassName}>Contact :</h4>
        <div className="space-y-3 mt-1">
          <div className="flex items-center gap-2">
            <IconMail size={25} className="text-light" />
            <a href={`mailto:${employee.email}`} className="text-foreground hover:underline truncate">
              {employee.email}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <IconPhone size={25} className="text-light" />
            <a href={`tel:${employee.tel}`} className="text-foreground hover:underline truncate">
              {employee.tel}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <IconMapPin size={25} className="text-light" />
            <span className="text-foreground truncate">{employee.geographicZone}</span>
          </div>
        </div>
      </div>

      <p className={descriptionClassName}>
        Missions acceptées : <span className={cn(labelClassName, 'font-bold')}>{countMissions('accepted')}</span>
      </p>
      <p className={descriptionClassName}>
        Missions complétées : <span className={cn(labelClassName, 'font-bold')}>{countMissions('completed')}</span>
      </p>

      {employee.message && employee.status === 'pending' && (
        <div>
          <h4 className={descriptionClassName}>Message :</h4>
          <div className="bg-secondary/10 rounded-md text-foreground">{employee.message}</div>
        </div>
      )}

      <div className={containerClassName}>
        Date d&apos;inscription :<span className={labelClassName}>{formatDate(new Date(employee.createdAt))}</span>
      </div>
    </FullScreenModal>
  );
}
