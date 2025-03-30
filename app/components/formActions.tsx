import { Button } from '@/app/components/button';
import clsx from 'clsx/lite';

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
        'flex justify-end gap-4 bg-background border-t border-secondary px-4 py-4 rounded-b-lg',
        className,
      )}
    >
      <Button onClick={onCancel} style="secondary" disabled={isSubmitting}>
        {cancelText}
      </Button>
      <Button
        type={submitType}
        onClick={onSubmit || (() => {})}
        style={isDangerous ? 'dangerous' : 'primary'}
        disabled={disabled}
        loading={isSubmitting}
      >
        {submitText}
      </Button>
    </div>
  );
}
