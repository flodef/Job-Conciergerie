'use client';

import Tooltip from '@/app/components/tooltip';
import { labelClassName } from '@/app/utils/className';
import { ReactNode } from 'react';

interface LabelProps {
  id: string;
  required: boolean;
  children: ReactNode;
  tooltip?: ReactNode;
}

const Label = ({ id, required, children, tooltip }: LabelProps) => {
  return (
    children && (
      <div className="flex items-center">
        <label htmlFor={id} className={labelClassName}>
          {children} {!required && ' (facultatif)'}
        </label>
        {tooltip && <Tooltip>{tooltip}</Tooltip>}
      </div>
    )
  );
};

Label.displayName = 'Label';

export default Label;
