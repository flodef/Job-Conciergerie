'use client';

import Tooltip from '@/app/components/tooltip';
import { labelClassName } from '@/app/utils/className';
import type { ReactNode } from 'react';

interface LabelProps {
  id: string;
  children: ReactNode;
  tooltip?: ReactNode;
  required?: boolean;
}

const Label = ({ id, children, tooltip, required = true }: LabelProps) => {
  return (
    children && (
      <div className="flex items-center mt-1.5">
        <Tooltip
          trigger={
            <label htmlFor={id} className={labelClassName}>
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
