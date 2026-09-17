import { cn } from '@/app/utils/className';
import type { ReactNode } from 'react';

/**
 * Sizes a field to its text content: an invisible sizer sets the width in the
 * flow while the real control is absolutely positioned on top. This avoids the
 * input's intrinsic width (~size attribute) forcing a minimum width.
 */
export const AutoSizeField = ({
  text,
  sizerClassName,
  className,
  children,
}: {
  text: string;
  sizerClassName?: string;
  className?: string;
  children: ReactNode;
}) => (
  <span className={cn('relative block w-fit max-w-full min-w-32', className)}>
    <span
      aria-hidden="true"
      className={cn(
        sizerClassName,
        'invisible block w-fit max-w-full whitespace-pre overflow-hidden border-transparent',
      )}
    >
      {text || ' '}
    </span>
    {children}
  </span>
);
