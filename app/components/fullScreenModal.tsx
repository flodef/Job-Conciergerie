'use client';

import { CloseButton } from '@/app/components/button';
import { clsx } from 'clsx/lite';
import { ReactNode } from 'react';

interface FullScreenModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer: ReactNode;
  disabled: boolean;
  className?: string;
}

export default function FullScreenModal({
  title,
  children,
  onClose,
  className,
  footer,
  disabled,
}: FullScreenModalProps) {
  return (
    <div
      className={clsx(
        'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4',
        className,
      )}
    >
      {/* Fixed header with title and close button */}
      <div className="sticky top-0 z-10 bg-background p-4 border-b border-secondary flex justify-between items-center rounded-t-lg">
        <h2 className="text-xl font-bold overflow-hidden">{title}</h2>
        <CloseButton onClose={!disabled ? onClose : () => {}} />
      </div>

      {/* Scrollable content area */}
      <div
        className={clsx(
          'flex-1 overflow-y-auto px-4 py-2 space-y-2',
          disabled && 'pointer-events-none opacity-50 cursor-not-allowed',
        )}
      >
        {children}
      </div>

      {/* The FormActions component will be rendered as part of children, 
            but will be positioned at the bottom if it has the className="sticky bottom-0" */}
      <div className={clsx('sticky bottom-0', disabled && 'pointer-events-none opacity-50 cursor-not-allowed')}>
        {footer}
      </div>
    </div>
  );
}
