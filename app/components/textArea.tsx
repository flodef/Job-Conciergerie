import ConfirmationModal from '@/app/components/confirmationModal';
import Label from '@/app/components/label';
import { cn, errorClassName, inputFieldClassName, textAreaCharCountClassName } from '@/app/utils/className';
import { handleChange, handleInputBlur } from '@/app/utils/form';
import { getMaxLength } from '@/app/utils/regex';
import { IconChevronDown, IconChevronUp, IconTrash } from '@tabler/icons-react';
import type { ForwardRefRenderFunction, ReactNode } from 'react';
import { forwardRef, useEffect, useRef, useState } from 'react';

const TEXTAREA_MIN_HEIGHT = 32;

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
  onDelete?: () => void;
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
    onDelete,
  },
  ref,
) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleDelete = () => {
    if (value && value.length > 0) {
      setShowDeleteWarning(true);
    } else {
      onDelete?.();
    }
  };

  const confirmDelete = () => {
    setShowDeleteWarning(false);
    onDelete?.();
  };

  const isFixedHeight = rows !== 1;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !isCollapsed && !isFixedHeight) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
      setIsMultiLine(textarea.scrollHeight > TEXTAREA_MIN_HEIGHT);
    } else if (textarea && isCollapsed) {
      textarea.style.height = `${TEXTAREA_MIN_HEIGHT}px`;
    }
  }, [value, forceRecalc, isCollapsed, isFixedHeight]);

  // Auto-expand when typing while collapsed (only when focused)
  useEffect(() => {
    if (isCollapsed && isFocused && value && value.length > 0 && !isFixedHeight) {
      setIsCollapsed(false);
    }
  }, [value, isCollapsed, isFocused, isFixedHeight]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <Label id={id} required={required} tooltip={tooltip}>
          {label}
        </Label>
        {!isFixedHeight && isMultiLine && (
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
        {isFixedHeight && onDelete && value && value.length > 0 && (
          <button
            type="button"
            onClick={handleDelete}
            className="p-1 hover:bg-red-100 text-red-600 rounded cursor-pointer transition-colors"
            disabled={disabled}
            tabIndex={-1}
            title="Supprimer"
          >
            <IconTrash size={20} />
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
          onBlur={e => {
            handleInputBlur(e, onChange, onError, regex);
            setIsFocused(false);
          }}
          onFocus={() => setIsFocused(true)}
          className={cn(inputFieldClassName(error), 'pb-2')}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          rows={rows}
          style={{ resize: 'none', overflow: isFixedHeight ? 'auto' : 'hidden' }}
        />
        {error ? (
          <p className={errorClassName}>{error}</p>
        ) : (
          <div className={textAreaCharCountClassName}>
            {value?.length || 0}/{getMaxLength(regex)}
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={showDeleteWarning}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteWarning(false)}
        onClose={() => setShowDeleteWarning(false)}
        title="Supprimer la note"
        message="Êtes-vous sûr de vouloir supprimer cette note ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        isDangerous
      />
    </div>
  );
};

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(TextAreaComponent);

export default TextArea;
