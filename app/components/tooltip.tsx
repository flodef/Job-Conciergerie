'use client';

import type { Size } from '@/app/types/types';
import { cn } from '@/app/utils/className';
import type { IconProps } from '@tabler/icons-react';
import { IconInfoCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type TooltipProps = {
  children: string | ReactNode;
  trigger?: ReactNode;
  size?: Size;
  icon?: React.ComponentType<IconProps>;
  orientation?: 'vertical' | 'horizontal';
  onClick?: () => void;
  className?: string;
  isDisabled?: boolean;
};

export default function Tooltip({
  children,
  trigger,
  size = 'medium',
  icon: Icon = IconInfoCircle,
  orientation = 'vertical',
  onClick,
  className = '',
  isDisabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const sizeClasses = {
    small: 'text-xs p-1.5',
    medium: 'text-sm p-2',
    large: 'text-base p-3',
  };

  const widthClasses = {
    small: 'w-[200px] max-w-[calc(100vw-20px)]',
    medium: 'w-[300px] max-w-[calc(100vw-20px)]',
    large: 'w-[400px] max-w-[calc(100vw-20px)]',
  };

  const iconSize = {
    small: 14,
    medium: 18,
    large: 24,
  }[size];

  const calculatePosition = useCallback(() => {
    const ref = trigger ? triggerRef : buttonRef;
    if (!ref?.current) return { top: 0, left: 0 };

    const rect = ref.current.getBoundingClientRect();
    const padding = 10;
    // Cap width to viewport (mirrors the CSS max-w-[calc(100vw-20px)])
    const tooltipWidth = Math.min({ small: 200, medium: 300, large: 400 }[size], window.innerWidth - padding * 2);
    const tooltipHeight = tooltipRef.current?.offsetHeight || 100;

    let top: number;
    let left: number;

    if (orientation === 'vertical') {
      // Calculate vertical position (prefer above if enough space)
      const spaceAbove = rect.top;
      const positionAbove = spaceAbove >= tooltipHeight + padding;
      top = positionAbove ? rect.top - tooltipHeight - padding : rect.bottom + padding;

      // Clamp vertical position to stay within viewport
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

      // Calculate horizontal position (centered on trigger)
      left = rect.left + (rect.width - tooltipWidth) / 2;

      // If centered position would go off right edge, align right edge with viewport
      if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding;
      }

      // If that would go off left edge, align left edge with viewport
      if (left < padding) {
        left = padding;
      }
    } else {
      // Calculate horizontal position (prefer left if enough space)
      const spaceLeft = rect.left;
      const positionLeft = spaceLeft >= tooltipWidth + padding;
      left = positionLeft ? rect.left - tooltipWidth - padding : rect.right + padding;

      // Clamp horizontal position to stay within viewport
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

      // Calculate vertical position (centered on trigger)
      top = rect.top + (rect.height - tooltipHeight) / 2;

      // Clamp vertical position to stay within viewport
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
    }

    return { top, left };
  }, [orientation, trigger, size]);

  useEffect(() => {
    if (isVisible) {
      const newPosition = calculatePosition();
      setPosition(newPosition);
    }
  }, [isVisible, calculatePosition]);

  const handleInteraction = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsVisible(!isVisible);
      onClick?.();
    },
    [isVisible, onClick],
  );

  const handleMouseEnter = useCallback(() => setIsVisible(true), []);
  const handleMouseLeave = useCallback(() => setIsVisible(false), []);

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className={`fixed z-100 bg-background text-foreground rounded-md shadow-lg border border-secondary ${sizeClasses[size]} ${widthClasses[size]}`}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      {children}
    </div>
  );

  return (
    <div className="inline-flex items-center ml-1">
      {trigger && (
        <div
          ref={triggerRef}
          className={cn(className, 'cursor-help')}
          onClick={handleInteraction}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {trigger}
        </div>
      )}

      {!isDisabled && (
        <button
          ref={buttonRef}
          type="button"
          className={cn('hover:text-foreground focus:outline-none cursor-help mx-1', className)}
          onClick={handleInteraction}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label="Information"
        >
          <Icon size={iconSize} />
        </button>
      )}

      {!isDisabled && isVisible && createPortal(tooltipContent, document.body)}
    </div>
  );
}
