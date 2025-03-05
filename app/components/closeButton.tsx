'use client';

import { IconX } from '@tabler/icons-react';
import clsx from 'clsx';

type CloseButtonProps = {
  onClose: (e?: React.MouseEvent) => void;
  className?: string;
};

export default function CloseButton({ onClose, className = '' }: CloseButtonProps) {
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
