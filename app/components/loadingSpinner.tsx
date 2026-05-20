'use client';

import { cn } from '@/app/utils/className';
import { Size } from '@/app/types/types';

type LoadingSpinnerProps = {
  size?: Size;
  text?: string;
  fullPage?: boolean;
  className?: string;
};

export default function LoadingSpinner({ size = 'large', text, fullPage = true, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center', fullPage ? 'h-full' : '', className)}>
      <div
        className={cn('animate-spin rounded-full border-solid border-primary border-t-transparent', sizeClasses[size])}
      />
      {text && <p className="mt-2 text-foreground/70">{text}</p>}
    </div>
  );
}
