'use client';

import { CloseButton } from '@/app/components/button';
import { cn } from '@/app/utils/className';
import { ReactNode, useEffect, useRef, useState } from 'react';
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
  const [isVisible, setIsVisible] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger enter animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  // Handle close with exit animation
  const handleClose = () => {
    setIsVisible(false);
    closeTimerRef.current = setTimeout(onClose, 200); // Wait for animation to complete
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
            <h2 className="text-xl font-bold overflow-hidden">{title}</h2>
            {tooltip && <Tooltip>{tooltip}</Tooltip>}
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
