'use client';

import Label from '@/app/components/label';
import type { SelectOption } from '@/app/types/types';
import {
  cn,
  errorClassName,
  optionClassName,
  optionsClassName,
  rowClassName,
  selectClassName,
} from '@/app/utils/className';
import { shouldOpenUpward } from '@/app/utils/select';
import { useScrollIndicators } from '@/app/utils/useScrollIndicators';
import { IconChevronDown } from '@tabler/icons-react';
import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

type SelectProps = {
  id: string;
  label: ReactNode;
  value: string | number;
  onChange: (value: string) => void;
  options: string[] | number[] | SelectOption[];
  placeholder?: string;
  className?: string;
  error?: boolean | string;
  onError?: (error: string) => void;
  disabled: boolean;
  required?: boolean;
  row?: boolean;
  tooltip?: ReactNode;
  maxItems?: number; // Maximum number of items to show in dropdown
};

const Select = forwardRef(
  (
    {
      id,
      label,
      value,
      onChange,
      options,
      placeholder = 'Sélectionner une option',
      className = '',
      error = false,
      onError = () => {},
      disabled = false,
      required = false,
      row = false,
      tooltip,
      maxItems,
    }: SelectProps,
    forwardedRef: ForwardedRef<HTMLDivElement>,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);
    const { ref: scrollRef, canScrollUp, canScrollDown } = useScrollIndicators(isOpen);

    // Forward the selectRef to the parent component
    useImperativeHandle(forwardedRef, () => selectRef.current as HTMLDivElement);

    // Close the dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          // Also reset focus state when clicking outside
          setIsFocused(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    const checkPosition = useCallback(() => {
      if (selectRef.current) {
        setOpenUpward(
          shouldOpenUpward({
            elementRef: selectRef.current,
            itemCount: options.length,
          }),
        );
      }
    }, [options.length]);

    // Handle keyboard navigation
    useEffect(() => {
      if (disabled) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isFocused) return;
        if (!isOpen) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
            e.preventDefault();
            checkPosition();
            setIsOpen(true);
            setHighlightedIndex(e.key === 'ArrowUp' ? options.length - 1 : 0);
          }
        } else {
          switch (e.key) {
            case 'Escape':
              e.preventDefault();
              setIsOpen(false);
              break;
            case 'ArrowDown':
              e.preventDefault();
              setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
              break;
            case 'ArrowUp':
              e.preventDefault();
              setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
              break;
            case 'Enter':
              e.preventDefault();
              if (highlightedIndex >= 0) {
                const selectedOption = options[highlightedIndex];
                const value = typeof selectedOption === 'object' ? selectedOption.value : selectedOption;
                onChange(value.toString());
                setIsOpen(false);
              }
              break;
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, highlightedIndex, options, onChange, disabled, checkPosition, isFocused]);

    // Scroll to highlighted option
    useEffect(() => {
      if (highlightedIndex < 0 || !optionsRef.current) return;

      const highlightedOption = optionsRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedOption) {
        highlightedOption.scrollIntoView({ block: 'nearest' });
      }
    }, [highlightedIndex]);

    // Set highlighted index when opening dropdown
    useEffect(() => {
      if (isOpen) {
        const selectedIndex = options.findIndex(option => option === value);
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : -1);
      }
    }, [isOpen, options, value]);

    const handleSelect = (option: string | number) => {
      onChange(option.toString());
      setIsOpen(false);
      // Keep focus state after selection
      setIsFocused(true);

      // Focus the select element after selection
      if (selectRef.current) {
        const selectElement = selectRef.current.querySelector(`#${id}`) as HTMLElement;
        if (selectElement) {
          selectElement.focus();
        }
      }
    };

    // Determine the display value based on the selected value
    const displayValue = (() => {
      if (!value.toString().trim()) return placeholder;

      // If options are objects with value and label
      if (typeof options[0] === 'object') {
        const option = (options as SelectOption[]).find(opt => opt.value === value);
        return option ? option.label : value;
      }

      // If options are just strings
      return value;
    })();

    return (
      <div className={row ? rowClassName : ''}>
        <Label id={id} required={required} tooltip={tooltip}>
          {label}
        </Label>
        <div className={cn('relative w-full', className)} ref={selectRef}>
          <div
            id={id}
            tabIndex={disabled ? -1 : 0}
            className={selectClassName(error, disabled, isFocused, isOpen)}
            onClick={() => {
              if (!disabled) {
                checkPosition();
                setIsOpen(!isOpen);
                setIsFocused(true);
              }
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              setIsOpen(false);
              onError(
                required && !displayValue
                  ? `Veuillez sélectionner ${label?.toString().toLowerCase() || 'une option'}`
                  : '',
              );
            }}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={`${id}-options`}
          >
            <span className={cn(!value && 'text-foreground/50')}>{displayValue}</span>
            <IconChevronDown
              size={18}
              className={cn('transition-transform duration-200', isOpen && 'transform rotate-180')}
            />
          </div>

          {isOpen && !disabled && (
            <div
              className={cn(
                'relative',
                openUpward ? 'bottom-full mb-1 absolute w-full' : 'top-full mt-1 absolute w-full',
              )}
              style={{ zIndex: 50 }}
            >
              {canScrollUp && (
                <div
                  className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center pointer-events-none bg-linear-to-b from-background to-transparent rounded-t-lg"
                  style={{ zIndex: 51 }}
                >
                  <IconChevronDown size={18} className="text-foreground/60 rotate-180" />
                </div>
              )}
              <div
                id={`${id}-options`}
                ref={el => {
                  optionsRef.current = el;
                  scrollRef.current = el;
                }}
                className={optionsClassName}
                style={{ maxHeight: maxItems ? `${maxItems * 40}px` : '202px' }}
                role="listbox"
              >
                {options.map((option: string | number | SelectOption, index: number) => {
                  const optionValue = typeof option === 'object' ? option.value : option;
                  const optionLabel = typeof option === 'object' ? option.label : option;

                  return (
                    <div
                      key={optionValue}
                      className={optionClassName(index === highlightedIndex, optionValue === value)}
                      onMouseDown={() => handleSelect(optionValue)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      role="option"
                      aria-selected={optionValue === value}
                    >
                      {optionLabel}
                    </div>
                  );
                })}
              </div>
              {canScrollDown && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-center pointer-events-none bg-linear-to-t from-background to-transparent rounded-b-lg"
                  style={{ zIndex: 51 }}
                >
                  <IconChevronDown size={18} className="text-foreground/60" />
                </div>
              )}
            </div>
          )}
        </div>
        {error && <p className={errorClassName}>{error}</p>}
      </div>
    );
  },
);

// Add display name for better debugging
Select.displayName = 'Select';

export default Select;
