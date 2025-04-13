import Label from '@/app/components/label';
import { errorClassName, inputFieldClassName, rowClassName } from '@/app/utils/className';
import { handleChange } from '@/app/utils/form';
import { emailRegex, frenchPhoneRegex, inputLengthRegex } from '@/app/utils/regex';
import { ForwardRefRenderFunction, ReactNode, forwardRef } from 'react';

interface InputProps {
  id: string;
  label: ReactNode;
  value: string | number | undefined;
  onChange: (value: string) => void;
  error: string;
  onError: (error: string) => void;
  disabled: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  row?: boolean;
  tooltip?: ReactNode;
}

const InputComponent: ForwardRefRenderFunction<HTMLInputElement, InputProps> = (
  {
    id,
    label,
    value,
    onChange,
    error,
    onError,
    disabled = false,
    required = false,
    placeholder = '',
    className = '',
    row = false,
    tooltip,
  },
  ref,
) => {
  const type = id.startsWith('tel') ? 'tel' : id.startsWith('email') ? 'email' : 'text';
  const regex = id.startsWith('tel') ? frenchPhoneRegex : id.startsWith('email') ? emailRegex : inputLengthRegex;

  return (
    <div className={row ? rowClassName : className}>
      <Label id={id} required={required} tooltip={tooltip}>
        {label}
      </Label>
      <input
        type={type}
        id={id}
        name={label?.toString() || id}
        ref={ref}
        value={value}
        onChange={e => handleChange(e, onChange, onError, regex)}
        className={inputFieldClassName(error)}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
      />
      {error && <p className={errorClassName}>{error}</p>}
    </div>
  );
};

const Input = forwardRef<HTMLInputElement, InputProps>(InputComponent);

export default Input;
