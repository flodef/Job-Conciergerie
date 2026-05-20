'use client';

import { cn } from '@/app/utils/className';
import { InputHTMLAttributes, forwardRef } from 'react';
import { IconCheck } from '@tabler/icons-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  labelClassName?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, checked, onChange, label, className, labelClassName, disabled, ...props }, ref) => {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="relative flex items-center">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
            disabled={disabled}
            className="opacity-0 absolute h-5 w-5 cursor-pointer"
            {...props}
          />
          <div
            className={cn(
              'border-2 rounded h-5 w-5 flex shrink-0 justify-center items-center',
              checked ? 'bg-primary border-primary' : 'border-secondary',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            {checked && <IconCheck size={20} color="white" stroke={5} />}
          </div>
        </div>
        {label && (
          <label
            htmlFor={id}
            className={cn('select-none', disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer', labelClassName)}
          >
            {label}
          </label>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
