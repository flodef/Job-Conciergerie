'use client';

import { ReactNode } from 'react';
import FormActions from './formActions';

type ConfirmationModalProps = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  title: string;
  message?: string;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
};

export default function ConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  onClose,
  title,
  message,
  children,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  isDangerous = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  // Handle close/cancel action
  const handleCancel = () => {
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  // Handle confirm action
  const handleConfirm = () => {
    onConfirm();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full px-6 pt-4 animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>

        <div className="text-foreground/80 pb-2">
          {message && <p>{message}</p>}
          {children}
        </div>

        <FormActions
          onCancel={handleCancel}
          onSubmit={handleConfirm}
          submitType="button"
          submitText={confirmText}
          cancelText={cancelText}
          isDangerous={isDangerous}
        />
      </div>
    </div>
  );
}
