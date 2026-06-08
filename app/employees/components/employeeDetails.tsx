'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import FullScreenModal from '@/app/components/fullScreenModal';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { getUserKey, useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { Employee, Mission, MissionStatus } from '@/app/types/dataTypes';
import {
  actionButtonBarClassName,
  actionButtonClassName,
  cn,
  containerClassName,
  descriptionClassName,
  labelClassName,
} from '@/app/utils/className';
import { formatDate } from '@/app/utils/date';
import { countEmployeeMissions, updateEmployeeStatus } from '@/app/utils/employee';
import { IconCheck, IconMail, IconMapPin, IconPhone, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';

type EmployeeDetailsProps = {
  employee: Employee;
  onClose: () => void;
  mission?: Mission;
};

export default function EmployeeDetails({ employee, onClose, mission }: EmployeeDetailsProps) {
  const { deleteEmployee, updateUserData, userData } = useAuth();
  const { missions, removeSecondProvider, updateMission } = useMissions();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRemoveFromMissionModalOpen, setIsRemoveFromMissionModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [toast, setToast] = useState<Toast>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to count missions by status
  const countMissions = (status: MissionStatus) => {
    const employeeId = getUserKey(employee);
    if (!employeeId) return 0;

    return missions.filter(mission => mission.employeeId === employeeId && mission.status === status).length;
  };

  const handleStatusChange = (newStatus: 'accepted' | 'rejected') => {
    setIsSubmitting(true);
    if (newStatus === 'rejected') setIsRejectModalOpen(false);
    updateEmployeeStatus(employee, newStatus, userData, missions, updateUserData)
      .then(({ updatedEmployee, emailSent }) => {
        setToast({
          type: newStatus === 'accepted' ? ToastType.Success : ToastType.Info,
          message: `${updatedEmployee.firstName} ${updatedEmployee.familyName} a été ${
            newStatus === 'accepted' ? 'accepté' : 'rejeté'
          }${emailSent ? ". L'employé a été notifié par email." : '.'}`,
        });
      })
      .catch(error => {
        setToast({
          type: ToastType.Error,
          message: error.toString(),
          error,
        });
        setIsSubmitting(false);
      });
  };

  const handleDelete = () => {
    setIsSubmitting(true);
    setIsDeleteModalOpen(false);
    deleteEmployee(employee).then(isSuccess => {
      setToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess ? 'Employé supprimé !' : "Erreur lors de la suppression de l'employé",
      });
      if (!isSuccess) setIsSubmitting(false);
    });
  };

  const handleRemoveFromMission = () => {
    if (!mission) return;

    setIsSubmitting(true);
    setIsRemoveFromMissionModalOpen(false);

    const employeeId = getUserKey(employee);
    if (!employeeId) {
      setToast({ type: ToastType.Error, message: "Impossible d'identifier le prestataire" });
      setIsSubmitting(false);
      return;
    }

    const showResult = ({ success }: { success: boolean }) => {
      setToast({
        type: success ? ToastType.Success : ToastType.Error,
        message: success ? 'Prestataire retiré de la mission' : 'Erreur lors du retrait du prestataire',
      });
      if (success) onClose();
      else setIsSubmitting(false);
    };

    if (mission.employeeId === employeeId) {
      updateMission({ ...mission, employeeId: null, status: null }).then(showResult);
    } else if (mission.employeeId2 === employeeId) {
      removeSecondProvider(mission.id).then(showResult);
    } else {
      setToast({ type: ToastType.Error, message: "Le prestataire n'est pas assigné à cette mission" });
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className={actionButtonBarClassName}>
      {mission ? (
        <button
          onClick={() => setIsRemoveFromMissionModalOpen(true)}
          className={cn(actionButtonClassName, 'bg-orange-100 text-orange-700')}
        >
          <IconX />
          Retirer
        </button>
      ) : (
        <>
          {(employee.status === 'accepted' || employee.status === 'pending') && (
            <button
              onClick={() => setIsRejectModalOpen(true)}
              className={cn(actionButtonClassName, 'bg-red-100 text-red-700')}
            >
              <IconX />
              Rejeter
            </button>
          )}
          {(employee.status === 'rejected' || employee.status === 'pending') && (
            <button
              onClick={() => handleStatusChange('accepted')}
              className={cn(actionButtonClassName, 'bg-green-100 text-green-700')}
            >
              <IconCheck />
              Accepter
            </button>
          )}
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className={cn(actionButtonClassName, 'bg-red-100 text-red-700')}
          >
            <IconTrash />
            Supprimer
          </button>
        </>
      )}
    </div>
  );

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
        <FullScreenModal
          title={`${employee.firstName} ${employee.familyName}`}
          onClose={onClose}
          footer={footer}
          disabled={isSubmitting}
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

          <ConfirmationModal
            isOpen={isRemoveFromMissionModalOpen}
            title="Retirer de la mission"
            message="Êtes-vous sûr de vouloir retirer ce prestataire de la mission ?"
            onConfirm={handleRemoveFromMission}
            onCancel={() => setIsRemoveFromMissionModalOpen(false)}
            confirmText="Retirer"
            isDangerous
          />
          <ConfirmationModal
            isOpen={isRejectModalOpen}
            title="Rejeter le prestataire"
            message={
              employee
                ? `Vous êtes sur le point de rejeter ${employee.firstName} ${employee.familyName}.${
                    countEmployeeMissions(employee, missions) > 0
                      ? ` Cet employé sera retiré de ses ${countEmployeeMissions(employee, missions)} mission(s).`
                      : ''
                  } Il ne pourra plus accéder à l'application.`
                : ''
            }
            onConfirm={() => handleStatusChange('rejected')}
            onCancel={() => setIsRejectModalOpen(false)}
            confirmText="Rejeter"
            isDangerous
          />
          <ConfirmationModal
            isOpen={isDeleteModalOpen}
            title="Supprimer l'employé"
            message="Êtes-vous sûr de vouloir supprimer cet employé de l'application ? ATTENTION : Cette action est irréversible !!"
            onConfirm={handleDelete}
            onCancel={() => setIsDeleteModalOpen(false)}
            confirmText="Supprimer"
            isDangerous
          />
        </FullScreenModal>
      )}
    </>
  );
}
