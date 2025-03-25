'use client';

import { Size } from '@/app/types/types';
import { IconInfoCircle } from '@tabler/icons-react';
import { ReactNode, useEffect, useRef, useState } from 'react';

type TooltipProps = {
  children: string | ReactNode;
  size?: Size;
};

export default function Tooltip({ children, size = 'medium' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const sizeClasses = {
    small: 'text-xs p-1.5',
    medium: 'text-sm p-2',
    large: 'text-base p-3',
  };

  const widthClasses = {
    small: 'w-[200px] max-w-full',
    medium: 'w-[300px] max-w-full',
    large: 'w-[400px] max-w-full',
  };

  const iconSize = {
    small: 14,
    medium: 18,
    large: 24,
  }[size];

  useEffect(() => {
    if (isVisible && tooltipRef.current && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      // Calculate position to ensure tooltip is visible
      let left = buttonRect.left - tooltipRect.width / 2 + buttonRect.width / 2;

      // Ensure tooltip doesn't go off the left edge of the screen
      if (left < 10) left = 10;

      // Ensure tooltip doesn't go off the right edge of the screen
      if (left + tooltipRect.width > window.innerWidth - 10) left = window.innerWidth - tooltipRect.width - 10;

      // Ensure tooltip stays in the middle if it's taking up the entire width
      if (tooltipRect.width > window.innerWidth) left = 0;

      setPosition({
        top: buttonRect.top - tooltipRect.height - 10,
        left: left,
      });
    }
  }, [isVisible]);

  return (
    <div className="inline-flex items-center ml-1">
      <button
        ref={buttonRef}
        type="button"
        className="text-foreground/70 hover:text-foreground focus:outline-none cursor-help"
        onClick={() => setIsVisible(!isVisible)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        aria-label="Information"
      >
        <IconInfoCircle size={iconSize} />
      </button>
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 bg-background text-foreground rounded-md shadow-lg border border-secondary ${sizeClasses[size]} ${widthClasses[size]}`}
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
