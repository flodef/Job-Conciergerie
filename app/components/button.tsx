'use client';

import { IconX } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import { useAuth } from '@/app/contexts/authProvider';

export function RefreshButton({
  shouldDisconnect = false,
  className = '',
}: {
  shouldDisconnect?: boolean;
  className?: string;
}) {
  const { refreshData, disconnect } = useAuth();

  return (
    <button
      className={clsx('mt-4 px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 transition-opacity', className)}
      onClick={shouldDisconnect ? disconnect : refreshData}
    >
      Réessayer
    </button>
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
