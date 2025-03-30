import { useEffect } from 'react';

export enum ToastType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
}

export interface Toast {
  type: ToastType;
  message: string;
  error?: unknown;
}

interface ToastMessageProps {
  toast: Toast | undefined;
  onClose?: () => void;
}

export const ToastMessage = ({ toast, onClose }: ToastMessageProps) => {
  const typeStyles: Record<ToastType, string> = {
    [ToastType.Success]: 'bg-green-500 animate-fade-in-up',
    [ToastType.Error]: 'bg-[#fb8c8c] animate-shake',
    [ToastType.Warning]: 'bg-yellow-500 animate-fade-in-up',
  };

  const typeIcon: Record<ToastType, string> = {
    [ToastType.Success]: '✅ ',
    [ToastType.Error]: '❌ ',
    [ToastType.Warning]: '⚠️ ',
  };

  // Log errors
  useEffect(() => {
    if (toast?.error) {
      console.error(toast.message, toast.error);
    }
  }, [toast?.message, toast?.error]);

  // Auto-close after 3 seconds
  useEffect(() => {
    if (!toast || !onClose) return;

    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    // Cleanup timeout on unmount or toast change
    return () => clearTimeout(timer);
  }, [toast, onClose]); // Depend on `toast` to reset timer when it changes

  return (
    toast && (
      <div className={`fixed z-[100] top-4 inset-x-2 text-black text-center py-2 rounded-lg ${typeStyles[toast.type]}`}>
        {typeIcon[toast.type]}
        {toast.message}
      </div>
    )
  );
};
