'use client';

import { IconPlus } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import { ReactNode } from 'react';

type FloatingActionButtonProps = {
  onClick: () => void;
  icon?: ReactNode;
  className?: string;
};

export default function FloatingActionButton({
  onClick,
  icon = <IconPlus size={30} />,
  className,
}: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary text-background flex items-center justify-center shadow-lg',
        'hover:bg-primary/90 transition-colors z-10',
        className,
      )}
    >
      {icon}
    </button>
  );
}
