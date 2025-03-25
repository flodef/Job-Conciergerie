'use client';

import { shouldOpenUpward } from '@/app/utils/dropdownPosition';
import { IconChevronDown } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import { useEffect, useRef, useState, forwardRef, ForwardedRef, useImperativeHandle } from 'react';

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | SelectOption[];
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
};

const Select = forwardRef(
  (
    {
      id,
      value,
      onChange,
      options,
      placeholder = 'Sélectionner une option',
      className = '',
      error = false,
      disabled = false,
    }: SelectProps,
    forwardedRef: ForwardedRef<HTMLDivElement>,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);

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

    // Handle keyboard navigation
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter' && highlightedIndex >= 0) {
          e.preventDefault();
          const selectedOption = options[highlightedIndex];
          const value = typeof selectedOption === 'object' ? selectedOption.value : selectedOption;
          onChange(value);
          setIsOpen(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, highlightedIndex, options, onChange]);

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

    const handleSelect = (option: string) => {
      onChange(option);
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
      if (!value) return placeholder;

      // If options are objects with value and label
      if (typeof options[0] === 'object') {
        const option = (options as SelectOption[]).find(opt => opt.value === value);
        return option ? option.label : value;
      }

      // If options are just strings
      return value;
    })();

    return (
      <div className={clsx('relative w-full', className)} ref={selectRef}>
        <div
          id={id}
          className={clsx(
            'w-full p-2 rounded-lg bg-background text-foreground flex justify-between items-center cursor-pointer',
            'focus-visible:outline-none focus-within:outline-none',
            error && 'border-red-500 focus-visible:outline-red-500 border-2',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && (isFocused || isOpen) ? 'border-primary border-2' : 'border-secondary border',
          )}
          onClick={() => {
            if (!disabled) {
              // Check position before opening
              if (!isOpen && selectRef.current) {
                setOpenUpward(
                  shouldOpenUpward({
                    elementRef: selectRef.current,
                    itemCount: options.length,
                  }),
                );
              }
              setIsOpen(!isOpen);
            }
          }}
          tabIndex={disabled ? -1 : 0}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Remove focus when the component loses focus
            setIsFocused(false);
          }}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${id}-options`}
        >
          <span className={clsx(!value && 'text-foreground/50')}>{displayValue}</span>
          <IconChevronDown
            size={18}
            className={clsx('transition-transform duration-200', isOpen && 'transform rotate-180')}
          />
        </div>

        {isOpen && !disabled && (
          <div
            id={`${id}-options`}
            ref={optionsRef}
            className={clsx(
              'absolute z-50 w-full bg-background border border-foreground/20 rounded-lg shadow-lg max-h-[202px] overflow-auto',
              openUpward ? 'bottom-full mb-1' : 'top-full mt-1',
            )}
            role="listbox"
          >
            {options.map((option: string | SelectOption, index: number) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;

              return (
                <div
                  key={optionValue}
                  className={clsx(
                    'p-2 cursor-pointer hover:bg-primary/10',
                    highlightedIndex === index && 'bg-primary/10',
                    optionValue === value && 'font-medium text-primary bg-primary/10',
                  )}
                  onClick={() => handleSelect(optionValue)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={optionValue === value}
                >
                  {optionLabel}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);

// Add display name for better debugging
Select.displayName = 'Select';

export default Select;
