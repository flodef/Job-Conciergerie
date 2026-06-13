'use client';

import Label from '@/app/components/label';
import { cn, errorClassName, optionClassName, rowClassName, selectClassName } from '@/app/utils/className';
import { shouldOpenUpward } from '@/app/utils/select';
import { useScrollIndicators } from '@/app/utils/useScrollIndicators';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

type MultiSelectOption = {
  value: string;
  label: string;
};

type MultiSelectProps = {
  id: string;
  label: ReactNode;
  values: string[] | number[];
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  className?: string;
  error?: boolean | string;
  onError?: (error: string) => void;
  disabled: boolean;
  required?: boolean;
  allOption?: boolean; // Whether to include an "All" option
  row?: boolean;
  tooltip?: ReactNode;
};

const MultiSelect = forwardRef(
  (
    {
      id,
      label,
      values,
      onChange,
      options,
      className = '',
      error = false,
      onError = () => {},
      disabled = false,
      required = false,
      allOption = true,
      row = false,
      tooltip,
    }: MultiSelectProps,
    forwardedRef: ForwardedRef<HTMLDivElement>,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const selectRef = useRef<HTMLDivElement>(null);
    const { ref: optionsRef, canScrollUp, canScrollDown } = useScrollIndicators(isOpen);

    // Forward the selectRef to the parent component
    useImperativeHandle(forwardedRef, () => selectRef.current as HTMLDivElement);

    // Add "All" option if enabled and ensure options are properly processed
    const processedOptions = options || [];

    const allOptions = allOption ? [{ value: 'all', label: 'Tous' }, ...processedOptions] : processedOptions;

    // Close the dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setIsFocused(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    const toggleOption = (optionValue: string) => {
      if (optionValue === 'all') {
        // If "All" is selected, clear all other selections
        onChange([]);
      } else {
        // If any specific option is selected, remove "All" from the selection
        let newValues = [...values];

        if (newValues.includes(optionValue)) {
          // Remove the option if it's already selected
          newValues = newValues.filter(v => v !== optionValue);
        } else {
          // Add the option if it's not selected
          newValues.push(optionValue);
        }

        onChange(newValues.map(v => v.toString()));
      }
    };

    // Scroll highlighted option into view
    useEffect(() => {
      if (highlightedIndex >= 0 && optionsRef.current) {
        const item = optionsRef.current.children[highlightedIndex] as HTMLElement;
        item?.scrollIntoView({ block: 'nearest' });
      }
    }, [highlightedIndex, optionsRef]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown' && !isOpen) {
        e.preventDefault();
        checkPosition();
        setIsOpen(true);
        setIsFocused(true);
        setHighlightedIndex(0);
      } else if (e.key === 'ArrowUp' && !isOpen) {
        e.preventDefault();
        checkPosition();
        setIsOpen(true);
        setIsFocused(true);
        setHighlightedIndex(allOptions.length - 1);
      } else if (e.key === 'Enter' && !isOpen) {
        e.preventDefault();
        checkPosition();
        setIsOpen(true);
        setIsFocused(true);
      } else if (e.key === 'ArrowDown' && isOpen) {
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, allOptions.length - 1));
      } else if (e.key === 'ArrowUp' && isOpen) {
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          toggleOption(allOptions[highlightedIndex].value);
        } else if (isOpen) {
          setIsOpen(false);
          setIsFocused(false);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setIsFocused(false);
        setHighlightedIndex(-1);
      }
    };

    // Determine the display value based on the selected values
    const displayValue = () => {
      if (values.length === 0) return 'Tous'; // Default to "All" if nothing selected

      if (values.length === 1) {
        const option = processedOptions.find(opt => opt.value === values[0]);
        return option ? option.label : values[0];
      }

      return `${values.length} sélectionnés`;
    };

    const checkPosition = () => {
      if (selectRef.current) {
        setOpenUpward(
          shouldOpenUpward({
            elementRef: selectRef.current,
            itemCount: processedOptions.length,
          }),
        );
      }
    };

    return (
      <div className={row ? rowClassName : 'w-full'}>
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
            onBlur={e => {
              if (!e.relatedTarget || !selectRef.current?.contains(e.relatedTarget as Node)) {
                setIsFocused(false);
                setIsOpen(false);
              }
              onError(
                required && !displayValue
                  ? `Veuillez sélectionner ${label?.toString().toLowerCase() || 'une option'}`
                  : '',
              );
            }}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={`${id}-options`}
          >
            <span className={cn(values.length === 0 && 'text-foreground/50')}>{displayValue()}</span>
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
              <div
                id={`${id}-options`}
                ref={optionsRef}
                className="w-full bg-background border border-foreground/20 rounded-lg shadow-lg overflow-auto max-h-[202px]"
                role="listbox"
                aria-multiselectable="true"
              >
                {allOptions.length === 0 ? (
                  <div className="p-2 text-foreground/50 text-center">Aucune option disponible</div>
                ) : (
                  allOptions.map((option, index) => {
                    const isSelected =
                      option.value === 'all'
                        ? values.length === 0
                        : values.map(v => v.toString()).includes(option.value);
                    const isHighlighted = index === highlightedIndex;

                    return (
                      <div
                        key={option.value}
                        className={cn(optionClassName(isSelected), isHighlighted && !isSelected && 'bg-secondary/30')}
                        onMouseDown={() => toggleOption(option.value)}
                        onMouseEnter={() => setHighlightedIndex(index)}
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
            </div>
          )}
        </div>
        {error && <p className={errorClassName}>{error}</p>}
      </div>
    );
  },
);

// Add display name for better debugging
MultiSelect.displayName = 'MultiSelect';

export default MultiSelect;
