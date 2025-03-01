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

  return (
    <div className={`fixed top-4 inset-x-2 text-foreground text-center py-2 rounded-lg ${typeStyles[type]}`}>
      {typeIcon[type]}
      {message}
    </div>
  );
};
