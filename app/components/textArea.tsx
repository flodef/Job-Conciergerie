import Label from '@/app/components/label';
import { cn, errorClassName, inputFieldClassName, textAreaCharCountClassName } from '@/app/utils/className';
import { handleChange, handleInputBlur } from '@/app/utils/form';
import { getMaxLength } from '@/app/utils/regex';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import type { ForwardRefRenderFunction, ReactNode } from 'react';
import { forwardRef, useEffect, useRef, useState } from 'react';

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
  rows?: number;
  tooltip?: ReactNode;
  regex: RegExp;
  forceRecalc?: boolean;
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
    rows = 1,
    tooltip,
    regex,
    forceRecalc,
  },
  ref,
) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMultiLine, setIsMultiLine] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !isCollapsed) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
      setIsMultiLine(textarea.scrollHeight > 40);
    } else if (textarea && isCollapsed) {
      textarea.style.height = '40px';
    }
  }, [value, forceRecalc, isCollapsed]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <Label id={id} required={required} tooltip={tooltip}>
          {label}
        </Label>
        {isMultiLine && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1 hover:bg-foreground/10 rounded cursor-pointer transition-colors"
            disabled={disabled}
            tabIndex={-1}
          >
            {isCollapsed ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
          </button>
        )}
      </div>
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
          onBlur={e => handleInputBlur(e, onChange, onError, regex)}
          className={cn(inputFieldClassName(error), 'pb-2')}
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
