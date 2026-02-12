'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { buttonClassName, spinningClassName } from '@/app/utils/className';
import { IconX } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import { useState } from 'react';

export type ButtonStyle = 'primary' | 'secondary' | 'dangerous' | 'inferno';
export type ButtonType = 'button' | 'submit' | 'reset';

export function Button({
  onClick,
  type = 'button',
  style = 'primary',
  className = '',
  children,
  disabled = false,
  loading = false,
  loadingText = 'En cours...',
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
          <span className="whitespace-nowrap">{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function RefreshButton({
  shouldDisconnect = false,
  disabled = false,
  className = '',
  onRefresh,
}: {
  shouldDisconnect?: boolean;
  disabled?: boolean;
  className?: string;
  onRefresh?: () => Promise<unknown> | void;
}) {
  const { refreshData, disconnect } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (shouldDisconnect) {
      disconnect();
      return;
    }

    if (!onRefresh) {
      refreshData();
      return;
    }

    setLoading(true);
    const result = onRefresh();
    if (!result) {
      setLoading(false);
      refreshData();
      return;
    }

    result.finally(() => {
      setLoading(false);
      setTimeout(refreshData, 1500);
    });
  };

  return (
    <Button
      className={clsx('mt-4 mx-auto cursor-pointer', className)}
      style={shouldDisconnect ? 'dangerous' : 'primary'}
      onClick={handleClick}
      disabled={disabled}
      loading={loading}
    >
      {shouldDisconnect ? 'Se déconnecter' : 'Réessayer'}
    </Button>
  );
}

type CloseButtonProps = {
  onClose: (e?: React.MouseEvent) => void;
  size?: number;
  disabled?: boolean;
  className?: string;
};

export function CloseButton({ onClose, size = 24, disabled = false, className = '' }: CloseButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(e);
  };

  return (
    <button
      className={clsx('text-foreground hover:scale-110 transition-transform cursor-pointer z-50', className)}
      onClick={!disabled ? handleClick : undefined}
      aria-label={'Fermer'}
    >
      <IconX size={size} />
    </button>
  );
}
