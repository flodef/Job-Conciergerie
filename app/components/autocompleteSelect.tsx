'use client';

import Label from '@/app/components/label';
import { errorClassName, optionClassName, optionsClassName, selectClassName } from '@/app/utils/className';
import { shouldOpenUpward } from '@/app/utils/select';
import { IconCheck, IconChevronDown, IconX } from '@tabler/icons-react';
import { cn } from '@/app/utils/className';
import { ForwardedRef, forwardRef, ReactNode, useEffect, useImperativeHandle, useRef, useState } from 'react';

type SelectOption = {
  value: string;
  label: string;
};

type AutocompleteSelectProps = {
  id: string;
  label: ReactNode;
  value: string | null;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  error?: boolean | string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  row?: boolean;
  tooltip?: ReactNode;
  maxItems?: number; // Maximum number of items to show in dropdown
  forceOpenUpward?: boolean; // Force dropdown to open upward
};

const AutocompleteSelect = forwardRef(
  (
    {
      id,
      label,
      value,
      onChange,
      options,
      placeholder = 'Sélectionner...',
      className = '',
      error = false,
      disabled = false,
      required = false,
      clearable = true,
      row = false,
      tooltip,
      maxItems,
      forceOpenUpward = false,
    }: AutocompleteSelectProps,
    forwardedRef: ForwardedRef<HTMLDivElement>,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [openUpward, setOpenOpenUpward] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const selectRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(forwardedRef, () => selectRef.current as HTMLDivElement);

    // Filter options based on search query
    const filteredOptions = searchQuery
      ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
      : options;

    // Get selected option label
    const selectedLabel = value ? options.find(opt => opt.value === value)?.label || value : null;

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setIsFocused(false);
          setSearchQuery('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when opening
    useEffect(() => {
      if (isOpen && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setSearchQuery('');
    };

    const checkPosition = () => {
      if (forceOpenUpward) {
        setOpenOpenUpward(true);
        return;
      }
      if (selectRef.current) {
        setOpenOpenUpward(
          shouldOpenUpward({
            elementRef: selectRef.current,
            itemCount: filteredOptions.length,
          }),
        );
      }
    };

    const handleOpen = () => {
      if (!disabled) {
        checkPosition();
        setIsOpen(true);
        setIsFocused(true);
        // Pre-fill search with current selection for quick editing
        if (value) {
          setSearchQuery(selectedLabel || '');
        }
      }
    };

    return (
      <div className={row ? 'flex items-center gap-2 w-full' : 'w-full'}>
        <Label id={id} required={required} tooltip={tooltip}>
          {label}
        </Label>
        <div className={cn('relative flex-1 min-w-0', className)} ref={selectRef}>
          {/* Display/Input field */}
          <div
            id={id}
            tabIndex={disabled ? -1 : 0}
            className={selectClassName(error, disabled, isFocused, isOpen)}
            onClick={handleOpen}
            onFocus={() => setIsFocused(true)}
            onBlur={() => !isOpen && setIsFocused(false)}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={`${id}-options`}
          >
            {isOpen ? (
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-foreground min-w-0"
                placeholder={placeholder}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className={cn('flex-1 truncate', !value && 'text-foreground/50')}>
                {selectedLabel || placeholder}
              </span>
            )}
            <div className="flex items-center gap-1 shrink-0">
              {clearable && value && !isOpen && (
                <button
                  onClick={handleClear}
                  className="p-0.5 hover:bg-secondary/50 rounded transition-colors"
                  aria-label="Clear selection"
                >
                  <IconX size={16} className="text-light" />
                </button>
              )}
              <IconChevronDown
                size={18}
                className={cn('transition-transform duration-200', isOpen && 'transform rotate-180')}
              />
            </div>
          </div>

          {/* Dropdown */}
          {isOpen && !disabled && (
            <div
              id={`${id}-options`}
              className={optionsClassName(openUpward)}
              style={{ maxHeight: maxItems ? `${maxItems * 40}px` : '202px' }}
              role="listbox"
            >
              {filteredOptions.length === 0 ? (
                <div className="p-2 text-foreground/50 text-center">Aucune option trouvée</div>
              ) : (
                filteredOptions.map(option => {
                  const isSelected = option.value === value;
                  return (
                    <div
                      key={option.value}
                      className={optionClassName(isSelected)}
                      onClick={() => handleSelect(option.value)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className={cn(isSelected && 'font-medium text-primary')}>{option.label}</span>
                      {isSelected && <IconCheck size={18} className="text-primary" />}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        {error && <p className={errorClassName}>{error}</p>}
      </div>
    );
  },
);

AutocompleteSelect.displayName = 'AutocompleteSelect';

export default AutocompleteSelect;
