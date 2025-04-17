import Label from '@/app/components/label';
import { errorClassName, inputFieldClassName, rowClassName, textAreaCharCountClassName } from '@/app/utils/className';
import { handleChange } from '@/app/utils/form';
import { getMaxLength } from '@/app/utils/regex';
import { ForwardRefRenderFunction, ReactNode, forwardRef } from 'react';

interface TextAreaProps {
  id: string;
  label: ReactNode;
  value: string | undefined;
  onChange: (value: string) => void;
  error: string;
  onError: (error: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  row?: boolean;
  rows?: number;
  tooltip?: ReactNode;
  regex: RegExp;
}

const TextAreaComponent: ForwardRefRenderFunction<HTMLTextAreaElement, TextAreaProps> = (
  {
    id,
    label,
    value = '',
    onChange,
    error,
    onError,
    disabled = false,
    required = false,
    placeholder = '',
    className = '',
    row = false,
    rows = 4,
    tooltip,
    regex,
  },
  ref,
) => {
  return (
    <div className={row ? rowClassName : className}>
      <Label id={id} required={required} tooltip={tooltip}>
        {label}
      </Label>
      <div className="relative">
        <textarea
          id={id}
          name={label?.toString() || id}
          ref={ref}
          value={value}
          onChange={e => handleChange(e, onChange, onError, regex)}
          className={inputFieldClassName(error)}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          rows={rows}
        />
        {error ? (
          <p className={errorClassName}>{error}</p>
        ) : (
          <div className={textAreaCharCountClassName}>
            {value?.length || 0}/{getMaxLength(regex)}
          </div>
        )}
      </div>
    </div>
  );
};

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(TextAreaComponent);

export default TextArea;
