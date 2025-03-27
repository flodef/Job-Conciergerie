'use client';

import { selectClassName } from '@/app/utils/className';
import { shouldOpenUpward } from '@/app/utils/dropdownPosition';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import { ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

type MultiSelectOption = {
  value: string;
  label: string;
};

type MultiSelectProps = {
  id: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  className?: string;
  error?: boolean;
  disabled?: boolean;
  allOption?: boolean; // Whether to include an "All" option
};

const MultiSelect = forwardRef(
  (
    {
      id,
      values,
      onChange,
      options,
      className = '',
      error = false,
      disabled = false,
      allOption = true,
    }: MultiSelectProps,
    forwardedRef: ForwardedRef<HTMLDivElement>,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

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

        onChange(newValues);
      }
    };

    // Determine the display value based on the selected values
    const displayValue = () => {
      if (values.length === 0) {
        return 'Tous'; // Default to "All" if nothing selected
      }

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
      <div className={clsx('relative w-full', className)} ref={selectRef}>
        <div
          id={id}
          className={selectClassName(error, disabled, isFocused, isOpen)}
          onClick={() => {
            if (!disabled) {
              checkPosition();
              setIsOpen(!isOpen);
            }
          }}
          tabIndex={disabled ? -1 : 0}
          onFocus={() => {
            checkPosition();
            setIsFocused(true);
            setIsOpen(true);
          }} // Add focus when the component gains focus
          onBlur={() => {
            setIsFocused(false);
            setIsOpen(false);
          }} // Remove focus when the component loses focus
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${id}-options`}
        >
          <span className={clsx(values.length === 0 && 'text-foreground/50')}>{displayValue()}</span>
          <IconChevronDown
            size={18}
            className={clsx('transition-transform duration-200', isOpen && 'transform rotate-180')}
          />
        </div>

        {isOpen && !disabled && (
          <div
            id={`${id}-options`}
            className={clsx(
              'absolute z-50 w-full bg-background border border-foreground/20 rounded-lg shadow-lg max-h-[202px] overflow-auto',
              openUpward ? 'bottom-full mb-1' : 'top-full mt-1',
            )}
            role="listbox"
            aria-multiselectable="true"
          >
            {allOptions.length === 0 ? (
              <div className="p-2 text-foreground/50 text-center">Aucune option disponible</div>
            ) : (
              allOptions.map(option => {
                const isSelected = option.value === 'all' ? values.length === 0 : values.includes(option.value);

                return (
                  <div
                    key={option.value}
                    className={clsx(
                      'p-2 cursor-pointer hover:bg-primary/10 flex items-center justify-between',
                      isSelected && 'bg-primary/10',
                    )}
                    onClick={() => toggleOption(option.value)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className={clsx(isSelected && 'font-medium text-primary')}>{option.label}</span>
                    {isSelected && <IconCheck size={18} className="text-primary" />}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  },
);

// Add display name for better debugging
MultiSelect.displayName = 'MultiSelect';

export default MultiSelect;
