'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { buttonClassName, spinningClassName } from '@/app/utils/className';
import { IconX } from '@tabler/icons-react';
import clsx from 'clsx/lite';

export type ButtonStyle = 'primary' | 'secondary' | 'dangerous';
export type ButtonType = 'button' | 'submit' | 'reset';

export function Button({
  onClick,
  type = 'button',
  style = 'primary',
  className = '',
  children,
  disabled = false,
  loading = false,
  loadingText = 'Traitement...',
}: {
  onClick: () => void;
  type?: ButtonType;
  style?: ButtonStyle;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
}) {
  return (
    <button
      className={clsx(buttonClassName(style), className)}
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
    >
      {loading && !disabled ? (
        <>
          <span className={spinningClassName}></span>
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function RefreshButton({
  shouldDisconnect = false,
  className = '',
}: {
  shouldDisconnect?: boolean;
  className?: string;
}) {
  const { refreshData, disconnect } = useAuth();

  return (
    <Button
      className={clsx('mt-4 justify-self-center', className)}
      onClick={shouldDisconnect ? disconnect : refreshData}
    >
      Réessayer
    </Button>
  );
}

type CloseButtonProps = {
  onClose: (e?: React.MouseEvent) => void;
  className?: string;
};

export function CloseButton({ onClose, className = '' }: CloseButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(e);
  };

  return (
    <button
      className={clsx('text-foreground hover:scale-110 transition-transform', className)}
      onClick={handleClick}
      aria-label={'Fermer'}
    >
      <IconX size={24} stroke={2} />
    </button>
  );
}
