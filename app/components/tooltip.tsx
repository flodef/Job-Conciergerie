'use client';

import { Size } from '@/app/types/types';
import { IconInfoCircle, IconProps } from '@tabler/icons-react';
import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

type TooltipProps = {
  children: string | ReactNode;
  size?: Size;
  icon?: React.ComponentType<IconProps>;
  onClick?: () => void;
};

export default function Tooltip({
  children,
  size = 'medium',
  icon: Icon = IconInfoCircle,
  orientation = 'vertical',
  onClick,
}: TooltipProps & { orientation?: 'vertical' | 'horizontal' }) {
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

  const calculatePosition = useCallback(() => {
    if (!buttonRef.current || !tooltipRef.current) return { top: 0, left: 0 };

    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = tooltipRef.current.offsetWidth;
    const tooltipHeight = tooltipRef.current.offsetHeight;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom; // Used to determine if tooltip can fit below
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right; // Used to determine if tooltip can fit to the right

    let top = 0;
    let left = 0;

    if (orientation === 'vertical') {
      const positionAbove = spaceAbove >= tooltipHeight;
      top = positionAbove ? rect.top - tooltipHeight - 10 : rect.bottom + 10;
      // Check if positioning below would fit within viewport
      if (!positionAbove && spaceBelow < tooltipHeight + 10) {
        top = window.innerHeight - tooltipHeight - 10;
      }
      left = rect.left + (rect.width - tooltipWidth) / 2;
      if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 10;
      }
      if (left < 0) {
        left = 10;
      }
    } else {
      const positionLeft = spaceLeft >= tooltipWidth;
      left = positionLeft ? rect.left - tooltipWidth - 10 : rect.right + 10;
      // Check if positioning right would fit within viewport
      if (!positionLeft && spaceRight < tooltipWidth + 10) {
        left = window.innerWidth - tooltipWidth - 10;
      }
      top = rect.top + (rect.height - tooltipHeight) / 2;
      if (top + tooltipHeight > window.innerHeight) {
        top = window.innerHeight - tooltipHeight - 10;
      }
      if (top < 0) {
        top = 10;
      }
    }

    return { top, left };
  }, [orientation]);

  useEffect(() => {
    if (isVisible) {
      const newPosition = calculatePosition();
      setPosition(newPosition);
    }
  }, [isVisible, calculatePosition]);

  return (
    <div className="inline-flex items-center ml-1">
      <button
        ref={buttonRef}
        type="button"
        className="text-light hover:text-foreground focus:outline-none cursor-help"
        onClick={() => {
          setIsVisible(!isVisible);
          onClick?.();
        }}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        aria-label="Information"
      >
        <Icon size={iconSize} />
      </button>
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-100 bg-background text-foreground rounded-md shadow-lg border border-secondary ${sizeClasses[size]} ${widthClasses[size]}`}
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
