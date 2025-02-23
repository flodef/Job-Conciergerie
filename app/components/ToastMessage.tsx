export enum ToastType {
  Success,
  Error,
  Warning,
}

interface ToastProps {
  type: ToastType;
  message: string;
}

export const ToastMessage = ({ type, message }: ToastProps) => {
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

  const position = type === ToastType.Success ? 'bottom-4' : 'top-4';

  return (
    <div className={`fixed ${position} inset-x-2 text-white text-center py-2 rounded-lg ${typeStyles[type]}`}>
      {typeIcon[type]}
      {message}
    </div>
  );
};
