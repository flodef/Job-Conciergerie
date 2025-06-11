'use client';

import { CloseButton } from '@/app/components/button';
import { clsx } from 'clsx/lite';
import { ReactNode } from 'react';
import Tooltip from './tooltip';

interface FullScreenModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer: ReactNode;
  disabled: boolean;
  tooltip?: string | ReactNode;
  className?: string;
}

export default function FullScreenModal({
  title,
  children,
  onClose,
  className,
  footer,
  disabled,
  tooltip,
}: FullScreenModalProps) {
  return (
    <div
      className={clsx(
        'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4',
        className,
      )}
    >
      <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Fixed header with title and close button */}
        <div className="flex-shrink-0 z-20 bg-background p-4 border-b border-secondary flex justify-between items-center rounded-t-lg">
          <div className="flex items-center">
            <h2 className="text-xl font-bold overflow-hidden">{title}</h2>
            {tooltip && <Tooltip>{tooltip}</Tooltip>}
          </div>
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

        {/* Footer area */}
        {footer && (
          <div
            className={clsx(
              'flex-shrink-0 z-20 bg-background border-t border-secondary',
              disabled && 'pointer-events-none opacity-50 cursor-not-allowed',
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
