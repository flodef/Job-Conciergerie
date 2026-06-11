'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import { useCallback } from 'react';
import { useModal } from '@/app/contexts/modalProvider';

interface UseUnsavedChangesConfirmationOptions {
  checkFormChanged: () => boolean;
  onClose: () => void;
  onCancel?: () => void;
}

/**
 * Hook that provides handlers for cancel/close actions with unsaved changes confirmation.
 * When the form has unsaved changes, it shows a confirmation modal before proceeding.
 */
export function useUnsavedChangesConfirmation({
  checkFormChanged,
  onClose,
  onCancel,
}: UseUnsavedChangesConfirmationOptions) {
  const { openModal, closeModal, closeAllModals } = useModal();

  const closeAndCancel = useCallback(() => {
    onClose();
    onCancel?.();
  }, [onClose, onCancel]);

  const showConfirmationModal = useCallback(
    (onConfirm: () => void, onCancel?: () => void) => {
      const id = openModal(() => (
        <ConfirmationModal
          isOpen
          title="Modifications non enregistrées"
          message="Vous avez des modifications non enregistrées. Voulez-vous vraiment fermer ?"
          confirmText="Fermer"
          cancelText="Annuler"
          onCancel={onCancel ? () => closeModal(id) : undefined}
          onConfirm={onConfirm}
          onClose={onCancel ? undefined : () => closeModal(id)}
        />
      ));
    },
    [openModal, closeModal],
  );

  const handleCancel = useCallback(() => {
    if (checkFormChanged()) {
      showConfirmationModal(closeAndCancel);
    } else {
      closeAndCancel();
    }
  }, [checkFormChanged, closeAndCancel, showConfirmationModal]);

  const handleClose = useCallback(() => {
    if (checkFormChanged()) {
      showConfirmationModal(closeAllModals, () => closeModal);
    } else {
      closeAllModals();
    }
  }, [checkFormChanged, closeAllModals, showConfirmationModal, closeModal]);

  return { handleCancel, handleClose, closeAndCancel };
}
