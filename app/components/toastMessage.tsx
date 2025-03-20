import { useEffect } from 'react';

export enum ToastType {
  Success,
  Error,
  Warning,
}

export interface ToastProps {
  type: ToastType;
  message: string;
  error?: unknown;
}

interface ToastMessageProps {
  toast?: ToastProps;
  onClose?: () => void;
}

export const ToastMessage = ({ toast, onClose }: ToastMessageProps) => {
  const typeStyles = {
    [ToastType.Success]: 'bg-green-500 animate-fade-in-up',
    [ToastType.Error]: 'bg-[#fb8c8c] animate-shake',
    [ToastType.Warning]: 'bg-yellow-500 animate-fade-in-up',
  };
  const typeIcon = {
    [ToastType.Success]: '✅ ',
    [ToastType.Error]: '❌ ',
    [ToastType.Warning]: '⚠️ ',
  };

  useEffect(() => {
    if (toast?.error) console.error(toast.message, toast.error);
  }, [toast?.message, toast?.error]);

  // Auto-close the toast after 3 seconds if onClose is provided
  if (onClose) {
    setTimeout(onClose, 3000);
  }

  return (
    toast && (
      <div className={`fixed z-50 top-4 inset-x-2 text-black text-center py-2 rounded-lg ${typeStyles[toast.type]}`}>
        {typeIcon[toast.type]}
        {toast.message}
      </div>
    )
  );
};
