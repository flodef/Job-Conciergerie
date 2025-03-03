'use client';

import { IconInfoCircle } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

type TooltipProps = {
  text: string;
  size?: 'small' | 'medium';
};

export default function Tooltip({ text, size = 'medium' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const sizeClasses = {
    small: 'text-xs p-1.5',
    medium: 'text-sm p-2',
  };

  const widthClasses = {
    small: 'w-[200px]',
    medium: 'w-[300px]',
  };

  const iconSize = size === 'small' ? 14 : 18;

  useEffect(() => {
    if (isVisible && tooltipRef.current && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Calculate position to ensure tooltip is visible
      let left = buttonRect.left - (tooltipRect.width / 2) + (buttonRect.width / 2);
      
      // Ensure tooltip doesn't go off the left edge of the screen
      if (left < 10) {
        left = 10;
      }
      
      // Ensure tooltip doesn't go off the right edge of the screen
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      
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
        className="text-foreground/70 hover:text-foreground focus:outline-none"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
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
          {text}
        </div>
      )}
    </div>
  );
}
