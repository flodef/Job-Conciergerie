import { AutoSize } from '@/app/components/autoSizeField';
import Label from '@/app/components/label';
import { cn, errorClassName, inputFieldClassName, rowClassName } from '@/app/utils/className';
import { handleInputBlur, handleChange, handleKeyDown } from '@/app/utils/form';
import {
  createRegexFilter,
  emailPartialRegex,
  emailRegex,
  frenchPhonePartialRegex,
  frenchPhoneRegex,
  getMaxLength,
  inputLengthRegex,
} from '@/app/utils/regex';
import type { ForwardRefRenderFunction, ReactNode } from 'react';
import { forwardRef } from 'react';

const phoneFilter = createRegexFilter(frenchPhonePartialRegex);
const emailFilter = createRegexFilter(emailPartialRegex);
const nameFilter = (value: string) => value.replace(/\d/g, '');

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
  const maxLength = getMaxLength(regex) || (type === 'tel' ? 10 : 152);
  const filter = id.startsWith('tel')
    ? phoneFilter
    : id.startsWith('email')
      ? emailFilter
      : id.startsWith('firstName') || id.startsWith('familyName')
        ? nameFilter
        : undefined;

  return (
    <div className={row ? rowClassName : className}>
      <Label id={id} required={required} tooltip={tooltip}>
        {label}
      </Label>
      <div className="flex-1 min-w-0 flex flex-col items-end">
        <AutoSize text={value?.toString() || placeholder} sizerClassName={inputFieldClassName('')} className="min-w-32">
          <input
            type={type}
            id={id}
            name={label?.toString() || id}
            ref={ref}
            value={value}
            onKeyDown={e => handleKeyDown(e, filter)}
            onChange={e => handleChange(e, onChange, onError, regex, filter)}
            onBlur={e => handleInputBlur(e, onChange, onError, regex)}
            className={cn(inputFieldClassName(error), 'absolute inset-0')}
            disabled={disabled}
            placeholder={placeholder}
            required={required}
            maxLength={maxLength}
          />
        </AutoSize>
        {error && <p className={cn(errorClassName, 'max-w-full text-right')}>{error}</p>}
      </div>
    </div>
  );
};

const Input = forwardRef<HTMLInputElement, InputProps>(InputComponent);

export default Input;
