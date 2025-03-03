'use client';

import { ReactNode } from 'react';

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
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        
        <div className="mb-6 text-foreground/80">
          {message && <p>{message}</p>}
          {children}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-md bg-secondary/20 hover:bg-secondary/30 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-md text-white transition-colors ${
              isDangerous
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-primary hover:bg-primary/80'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
