'use client';

import { ReactNode } from 'react';
import { labelClassName } from '@/app/utils/className';

interface LabelProps {
  id: string;
  required: boolean;
  children: ReactNode;
}

const Label = ({ id, required, children }: LabelProps) => {
  return (
    children && (
      <label htmlFor={id} className={labelClassName}>
        {children} {!required && ' (facultatif)'}
      </label>
    )
  );
};

Label.displayName = 'Label';

export default Label;
