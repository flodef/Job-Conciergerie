'use client';

import Label from '@/app/components/label';
import {
  cn,
  errorClassName,
  getDropdownMaxHeight,
  optionClassName,
  optionsClassName,
  selectClassName,
} from '@/app/utils/className';
import { shouldOpenUpward } from '@/app/utils/select';
import { useScrollIndicators } from '@/app/utils/useScrollIndicators';
import { IconCheck, IconChevronDown, IconX } from '@tabler/icons-react';
import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  onError?: (error: string) => void;
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
      onError = () => {},
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
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const selectRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { ref: optionsRef, canScrollUp, canScrollDown } = useScrollIndicators(isOpen);

    useImperativeHandle(forwardedRef, () => selectRef.current as HTMLDivElement);

    const isReadonly = options.length === 1;

    // Auto-select when only one option
    useEffect(() => {
      if (isReadonly && value !== options[0].value) {
        onChange(options[0].value);
      }
    }, [isReadonly, options, value, onChange]);

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

    // Reset highlighted index when filtered options change
    useEffect(() => {
      setHighlightedIndex(-1);
    }, [searchQuery]);

    // Scroll highlighted option into view
    useEffect(() => {
      if (highlightedIndex >= 0 && optionsRef.current) {
        const item = optionsRef.current.children[highlightedIndex] as HTMLElement;
        item?.scrollIntoView({ block: 'nearest' });
      }
    }, [highlightedIndex, optionsRef]);

    const handleSelect = (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIndex(-1);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setSearchQuery('');
      setHighlightedIndex(-1);
      if (!isReadonly) {
        // Open dropdown and focus input after clearing
        checkPosition();
        setIsOpen(true);
        setIsFocused(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          handleOpen();
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex(i => Math.min(i + 1, filteredOptions.length - 1));
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          handleOpen();
          setHighlightedIndex(filteredOptions.length - 1);
        } else {
          setHighlightedIndex(i => Math.max(i - 1, 0));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!isOpen) {
          handleOpen();
        } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        } else {
          setIsOpen(false);
          setIsFocused(false);
          setSearchQuery('');
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && searchQuery === '' && value) {
        onChange(null);
        setHighlightedIndex(-1);
      }
    };

    const checkPosition = () => {
      if (forceOpenUpward) {
        setOpenOpenUpward(true);
      } else if (selectRef.current) {
        setOpenOpenUpward(
          shouldOpenUpward({
            elementRef: selectRef.current,
            itemCount: filteredOptions.length,
          }),
        );
      }
      if (selectRef.current) {
        const rect = selectRef.current.getBoundingClientRect();
        const top = openUpward ? rect.top : rect.bottom;
        setDropdownPosition({ top, left: rect.left, width: rect.width });
      }
    };

    const handleOpen = () => {
      if (!disabled) {
        checkPosition();
        setIsOpen(true);
        setIsFocused(true);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    // Reset dropdown position when closed
    useEffect(() => {
      if (!isOpen) setDropdownPosition(null);
    }, [isOpen]);

    const handleChevronClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled) {
        if (isOpen) {
          setIsOpen(false);
          setIsFocused(false);
          setSearchQuery('');
        } else {
          handleOpen();
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
            tabIndex={-1}
            className={selectClassName(error, isReadonly || disabled, isFocused, isOpen)}
            onClick={isReadonly ? undefined : handleOpen}
            onFocus={() => !isReadonly && setIsFocused(true)}
            onBlur={e => {
              if (!isReadonly && (!e.relatedTarget || !selectRef.current?.contains(e.relatedTarget as Node))) {
                setIsFocused(false);
                setIsOpen(false);
              }
              onError(
                required && !value ? `Veuillez sélectionner ${label?.toString().toLowerCase() || 'une option'}` : '',
              );
            }}
            role={isReadonly ? undefined : 'combobox'}
            aria-expanded={isReadonly ? undefined : isOpen}
            aria-haspopup={isReadonly ? undefined : 'listbox'}
            aria-controls={isReadonly ? undefined : `${id}-options`}
          >
            {isOpen ? (
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
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
              {clearable && value && (isReadonly || !isOpen) && (
                <button
                  onClick={handleClear}
                  className="p-0.5 hover:bg-secondary/50 rounded transition-colors cursor-pointer"
                  aria-label="Clear selection"
                >
                  <IconX size={16} className="text-light" />
                </button>
              )}
              {!isReadonly && (
                <IconChevronDown
                  size={18}
                  className={cn('cursor-pointer transition-transform duration-200', isOpen && 'transform rotate-180')}
                  onClick={handleChevronClick}
                />
              )}
            </div>
          </div>

          {/* Dropdown */}
          {isOpen &&
            !disabled &&
            dropdownPosition &&
            createPortal(
              <div
                className="fixed z-50"
                style={{
                  top: openUpward ? dropdownPosition.top - 4 : dropdownPosition.top + 4,
                  left: dropdownPosition.left,
                  width: dropdownPosition.width,
                }}
              >
                <div
                  id={`${id}-options`}
                  ref={optionsRef}
                  className={optionsClassName}
                  style={getDropdownMaxHeight(maxItems)}
                  role="listbox"
                >
                  {filteredOptions.length === 0 ? (
                    <div className="p-2 text-foreground/50 text-center">Aucune option trouvée</div>
                  ) : (
                    filteredOptions.map((option, i) => {
                      const isSelected = option.value === value;
                      const isHighlighted = i === highlightedIndex;
                      return (
                        <div
                          key={option.value}
                          className={cn(optionClassName(isSelected), isHighlighted && !isSelected && 'bg-secondary/30')}
                          onMouseDown={() => handleSelect(option.value)}
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
                {canScrollUp && (
                  <div
                    className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center pointer-events-none bg-linear-to-b from-background to-transparent rounded-t-lg"
                    style={{ zIndex: 51 }}
                  >
                    <IconChevronDown size={18} className="text-foreground/60 rotate-180" />
                  </div>
                )}
                {canScrollDown && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-center pointer-events-none bg-linear-to-t from-background to-transparent rounded-b-lg"
                    style={{ zIndex: 51 }}
                  >
                    <IconChevronDown size={18} className="text-foreground/60" />
                  </div>
                )}
              </div>,
              document.body,
            )}
        </div>
        {error && <p className={errorClassName}>{error}</p>}
      </div>
    );
  },
);

AutocompleteSelect.displayName = 'AutocompleteSelect';

export default AutocompleteSelect;
