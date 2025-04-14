'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import FullScreenModal from '@/app/components/fullScreenModal';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { Employee } from '@/app/types/dataTypes';
import { actionButtonBarClassName, actionButtonClassName } from '@/app/utils/className';
import { formatDate } from '@/app/utils/date';
import { IconMail, IconMapPin, IconPhone, IconTrash } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import { useState } from 'react';

type EmployeeDetailsProps = {
  employee: Employee;
  onClose: () => void;
};

export default function EmployeeDetails({ employee, onClose }: EmployeeDetailsProps) {
  const { deleteEmployee } = useAuth();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState<Toast>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = () => {
    setIsSubmitting(true);
    setIsDeleteModalOpen(false);
    deleteEmployee(employee.id).then(isSuccess => {
      setToast({
        type: isSuccess ? ToastType.Success : ToastType.Error,
        message: isSuccess ? 'Employé supprimé !' : "Erreur lors de la suppression de l'employé",
      });
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
    <FullScreenModal
      title={`${employee.firstName} ${employee.familyName}`}
      onClose={onClose}
      footer={footer}
      disabled={isSubmitting}
    >
      <ToastMessage
        toast={toast}
        onClose={() => {
          setToast(undefined);
          if (toast?.type === ToastType.Success) onClose();
        }}
      />

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
        <div className="text-sm text-foreground/70">
          Statut:{' '}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-foreground/70 mb-1">Contact</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <IconMail size={25} className="text-foreground/70" />
              <a href={`mailto:${employee.email}`} className="text-foreground hover:underline truncate">
                {employee.email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <IconPhone size={25} className="text-foreground/70" />
              <a href={`tel:${employee.tel}`} className="text-foreground hover:underline truncate">
                {employee.tel}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <IconMapPin size={25} className="text-foreground/70" />
              <span className="text-foreground truncate">{employee.geographicZone}</span>
            </div>
          </div>
        </div>
      </div>

      {employee.message && employee.status === 'pending' && (
        <div>
          <h4 className="text-sm font-medium text-foreground/70 mb-1">Message</h4>
          <div className="bg-secondary/10 rounded-md text-foreground">{employee.message}</div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-foreground/70 mb-1">Date d&apos;inscription</h4>
        <div className="text-foreground text-sm">{formatDate(new Date(employee.createdAt))}</div>
      </div>
    </FullScreenModal>
  );
}
