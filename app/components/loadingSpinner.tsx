'use client';

import { clsx } from 'clsx/lite';

type LoadingSpinnerProps = {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  text?: string;
};

export default function LoadingSpinner({ size = 'medium', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <div
        className={clsx(
          'animate-spin rounded-full border-solid border-primary border-t-transparent',
          sizeClasses[size]
        )}
      />
      {text && <p className="mt-2 text-foreground/70">{text}</p>}
    </div>
  );
}
