type ConfirmationModalProps = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
};

export default function ConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Accepter',
  cancelText = 'Annuler',
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="mb-6">{message}</p>
        <div className="flex gap-4 justify-end">
          <button onClick={onCancel} className="px-4 py-2 bg-secondary text-foreground hover:bg-gray-100 rounded-lg">
            {cancelText}
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-primary text-foreground hover:bg-primary/90 rounded-lg">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
