'use client';

import { CloseButton } from '@/app/components/button';
import { cn } from '@/app/utils/className';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Tooltip from './tooltip';

interface FullScreenModalProps {
  title: string | ReactNode;
  children: ReactNode;
  onClose: () => void;
  footer: ReactNode;
  disabled: boolean;
  tooltip?: string | ReactNode;
  className?: string;
  /** If true, close button will call closeAllModals instead of closeModal */
  closeAll?: boolean;
  /** If true, skip enter/exit animations (for smooth view switching within modal) */
  skipAnimation?: boolean;
}

export default function FullScreenModal({
  title,
  children,
  onClose,
  className,
  footer,
  disabled,
  tooltip,
  skipAnimation = false,
}: FullScreenModalProps) {
  const [isVisible, setIsVisible] = useState(skipAnimation);

  // Trigger enter animation on mount (skip if skipAnimation is true)
  useEffect(() => {
    if (skipAnimation) {
      setIsVisible(true);
      return;
    }
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, [skipAnimation]);

  // Close immediately. The exit animation is intentionally skipped because
  // onClose may just stack another modal (e.g. an unsaved-changes confirmation)
  // rather than unmount, in which case a fade-out would be inconsistent with
  // other entry points (like the footer cancel button).
  const handleClose = () => {
    onClose();
  };

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4',
        'transition-opacity duration-200 ease-in-out',
        isVisible ? 'opacity-100' : 'opacity-0',
        className,
      )}
      onClick={!disabled ? handleClose : undefined}
    >
      <div
        className={cn(
          'relative bg-background rounded-lg shadow-lg max-w-md w-full flex flex-col max-h-[90vh] overflow-hidden',
          'transition-all duration-200 ease-in-out',
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed header with title and close button */}
        <div className="shrink-0 z-20 bg-background p-4 border-b border-secondary flex justify-between items-center rounded-t-lg">
          <div className="flex items-center">
            <Tooltip
              size="large"
              className="text-foreground"
              trigger={<h2 className="text-xl font-bold overflow-hidden">{title}</h2>}
              isDisabled={!tooltip}
            >
              {tooltip}
            </Tooltip>
          </div>
          <CloseButton onClose={!disabled ? handleClose : () => {}} />
        </div>

        {/* Scrollable content area */}
        <div
          className={cn(
            'flex-1 overflow-y-auto px-4 py-2 space-y-2',
            disabled && 'pointer-events-none opacity-50 cursor-not-allowed',
          )}
        >
          {children}
        </div>

        {/* Footer area */}
        {footer && (
          <div
            className={cn(
              'shrink-0 z-20 bg-background border-t border-secondary',
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
