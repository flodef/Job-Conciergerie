import Label from '@/app/components/label';
import { cn, errorClassName, inputFieldClassName, rowClassName } from '@/app/utils/className';
import { handleChange } from '@/app/utils/form';
import { ForwardRefRenderFunction, ReactNode, forwardRef } from 'react';

interface DateTimeInputProps {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error: string;
  onError: (error: string) => void;
  onBlur?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  row?: boolean;
  tooltip?: ReactNode;
  minimal?: boolean;
}

const DateTimeInputComponent: ForwardRefRenderFunction<HTMLInputElement, DateTimeInputProps> = (
  {
    id,
    label,
    value,
    onChange,
    error,
    onError,
    onBlur,
    disabled = false,
    required = false,
    min,
    max,
    className = '',
    row = false,
    tooltip,
    minimal = false,
  },
  ref,
) => {
  return (
    <div className={row ? rowClassName : className}>
      <Label id={id} required={required} tooltip={tooltip}>
        {label}
      </Label>
      <input
        type="datetime-local"
        lang="fr"
        id={id}
        name={label?.toString() || id}
        ref={ref}
        value={value}
        onChange={e => handleChange(e, onChange, onError)}
        onBlur={onBlur ? () => onBlur(value) : undefined}
        className={
          minimal
            ? 'bg-transparent text-foreground outline-none border-none focus:border-2 focus:border-primary cursor-pointer text-base pr-8 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
            : cn(
                inputFieldClassName(error),
                'border-2',
                '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0',
              )
        }
        disabled={disabled}
        required={required}
        min={min}
        max={max}
      />
      {error && <p className={errorClassName}>{error}</p>}
    </div>
  );
};

const DateTimeInput = forwardRef<HTMLInputElement, DateTimeInputProps>(DateTimeInputComponent);

export default DateTimeInput;
