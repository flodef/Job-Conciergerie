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
      <label htmlFor={id} className={labelClassName}>
        {children} {!required && ' (facultatif)'}
        {tooltip && <Tooltip>{tooltip}</Tooltip>}
      </label>
    )
  );
};

Label.displayName = 'Label';

export default Label;
