import Label from '@/app/components/label';
import { errorClassName, inputFieldClassName, rowClassName } from '@/app/utils/className';
import { handleChange } from '@/app/utils/form';
import { ForwardRefRenderFunction, ReactNode, forwardRef } from 'react';

interface DateTimeInputProps {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error: string;
  onError: (error: string) => void;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  row?: boolean;
  tooltip?: ReactNode;
}

const DateTimeInputComponent: ForwardRefRenderFunction<HTMLInputElement, DateTimeInputProps> = (
  {
    id,
    label,
    value,
    onChange,
    error,
    onError,
    disabled = false,
    required = false,
    min,
    max,
    className = '',
    row = false,
    tooltip,
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
        className={inputFieldClassName(error)}
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
