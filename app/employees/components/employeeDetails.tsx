'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import FullScreenModal from '@/app/components/fullScreenModal';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { Employee } from '@/app/types/dataTypes';
import {
  actionButtonBarClassName,
  actionButtonClassName,
  descriptionClassName,
  labelClassName,
} from '@/app/utils/className';
import { formatDate } from '@/app/utils/date';
import { IconMail, IconMapPin, IconPhone, IconTrash } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import { useState } from 'react';

type EmployeeDetailsProps = {
  employee: Employee;
  onClose: () => void;
};

export default function EmployeeDetails({ employee, onClose }: EmployeeDetailsProps) {
  const { getUserKey, deleteEmployee } = useAuth();
  const { missions } = useMissions();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState<Toast>();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const footer = (
    <div className={actionButtonBarClassName}>
      <button
        onClick={() => setIsDeleteModalOpen(true)}
        className={clsx(actionButtonClassName, 'bg-red-100 text-red-700')}
      >
        <IconTrash />
        Supprimer
      </button>
    </div>
  );

  return (
    <>
      <ToastMessage
        toast={toast}
        onClose={() => {
          setToast(undefined);
          if (toast?.type === ToastType.Success) onClose();
        }}
      />

      <FullScreenModal
        title={`${employee.firstName} ${employee.familyName}`}
        onClose={onClose}
        footer={footer}
        disabled={isSubmitting}
      >
        {isDeleteModalOpen && (
          <ConfirmationModal
            title="Supprimer l'employé"
            message="Êtes-vous sûr de vouloir supprimer cet employé ? Cette action est irréversible."
            onConfirm={handleDelete}
            onCancel={() => setIsDeleteModalOpen(false)}
            isOpen={isDeleteModalOpen}
          />
        )}
        <div>
          <div className={clsx(descriptionClassName, 'flex items-center gap-1')}>
            Statut :
            <span
              className={clsx(
                'font-bold',
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

        <div className="flex flex-col gap-4">
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

        <div className={clsx(descriptionClassName, 'flex items-center gap-1')}>
          Missions complétées :
          <span className={labelClassName}>
            {
              missions.filter(mission => getUserKey(employee) === mission.employeeId && mission.status === 'completed')
                .length
            }
          </span>
        </div>

        {employee.message && employee.status === 'pending' && (
          <div>
            <h4 className={descriptionClassName}>Message :</h4>
            <div className="bg-secondary/10 rounded-md text-foreground">{employee.message}</div>
          </div>
        )}

        <div className={clsx(descriptionClassName, 'flex items-center gap-1')}>
          Date d&apos;inscription :<span className={labelClassName}>{formatDate(new Date(employee.createdAt))}</span>
        </div>
      </FullScreenModal>
    </>
  );
}
