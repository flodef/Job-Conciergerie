import { cn } from '@/app/utils/className';
import type { ReactNode } from 'react';

/**
 * Sizes a field to its text content: an invisible sizer carries `text` in the
 * flow and sets the width (capped by the container) while the real control is
 * absolutely positioned on top via `children`. The overlay avoids the input's
 * intrinsic ~20ch width forcing a minimum. For selects, `text` should be the
 * longest option label (see longestOptionLabel in utils/select).
 */
export const AutoSize = ({
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
  <span className={cn('relative block w-fit max-w-full min-w-0', className)}>
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
