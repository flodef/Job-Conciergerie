import React from 'react';
import clsx from 'clsx';

type FormActionsProps = {
  onCancel: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  submitText?: string;
  cancelText?: string;
  className?: string;
  isDangerous?: boolean;
  submitType?: 'submit' | 'button';
  disabled?: boolean;
};

export default function FormActions({
  onCancel,
  onSubmit,
  isSubmitting = false,
  submitText = 'Enregistrer',
  cancelText = 'Annuler',
  className = '',
  isDangerous = false,
  submitType = 'submit',
  disabled = false,
}: FormActionsProps) {
  return (
    <div
      className={clsx(
        'flex justify-end gap-4 pt-4 pb-2',
        'sticky bottom-0 bg-background border-t border-secondary mt-4 px-4 -mx-4 rounded-b-lg',
        className,
      )}
    >
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80"
        disabled={isSubmitting}
      >
        {cancelText}
      </button>
      <button
        type={submitType}
        onClick={onSubmit}
        className={clsx(
          'px-4 py-2 rounded-lg flex items-center justify-center',
          isDangerous ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-primary hover:bg-primary/90 text-background',
          (isSubmitting || disabled) && 'opacity-50 cursor-not-allowed',
        )}
        disabled={isSubmitting || disabled}
      >
        {isSubmitting ? (
          <>
            <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2"></span>
            Traitement...
          </>
        ) : (
          submitText
        )}
      </button>
    </div>
  );
}
