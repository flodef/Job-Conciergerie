import Label from '@/app/components/label';
import { errorClassName, inputFieldClassName, rowClassName, textAreaCharCountClassName } from '@/app/utils/className';
import { handleChange } from '@/app/utils/form';
import { getMaxLength } from '@/app/utils/regex';
import type { ForwardRefRenderFunction, ReactNode } from 'react';
import { forwardRef, useEffect, useRef } from 'react';

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
  onBlur?: () => void;
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
    rows = 1,
    tooltip,
    regex,
    onBlur,
  },
  ref,
) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  const handleBlur = () => {
    if (value !== value.trim()) {
      onChange(value.trim());
    }
    onBlur?.();
  };

  return (
    <div className={row ? rowClassName : className}>
      <Label id={id} required={required} tooltip={tooltip}>
        {label}
      </Label>
      <div className="relative">
        <textarea
          id={id}
          name={label?.toString() || id}
          ref={node => {
            textareaRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          value={value}
          onChange={e => handleChange(e, onChange, onError, regex)}
          onBlur={handleBlur}
          className={inputFieldClassName(error)}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          rows={rows}
          style={{ resize: 'none', overflow: 'hidden' }}
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
