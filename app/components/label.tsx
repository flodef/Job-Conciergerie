'use client';

import Tooltip from '@/app/components/tooltip';
import { cn, labelClassName } from '@/app/utils/className';
import type { ReactNode } from 'react';

interface LabelProps {
  id: string;
  children: ReactNode;
  tooltip?: ReactNode;
  required?: boolean;
  className?: string;
}

const Label = ({ id, children, tooltip, required = true, className }: LabelProps) => {
  return (
    children && (
      <div className="flex items-center mt-1.5">
        <Tooltip
          trigger={
            <label htmlFor={id} className={cn(labelClassName, className)}>
              {children} {!required && ' (facultatif)'}
            </label>
          }
          isDisabled={!tooltip}
        >
          {tooltip}
        </Tooltip>
      </div>
    )
  );
};

Label.displayName = 'Label';

export default Label;
