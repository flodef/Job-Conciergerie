'use client';

import { clsx } from 'clsx/lite';
import { useEffect, useRef, useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';

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
  borderColor?: string; // New prop for border color when focused
};

export default function Select({
  id,
  value,
  onChange,
  options,
  placeholder = 'Sélectionner une option',
  className = '',
  error = false,
  disabled = false,
  borderColor,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

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
          'w-full p-2 border-2 rounded-lg bg-background text-foreground flex justify-between items-center cursor-pointer',
          'focus-visible:outline-none',
          error && 'border-red-500',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
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
        style={(isFocused || isOpen) && borderColor 
          ? { borderColor } 
          : { borderColor: 'rgba(0, 0, 0, 0.1)' }} // Light gray transparent border when not focused
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
          className="absolute z-50 w-full mt-1 bg-background border border-foreground/20 rounded-lg shadow-lg max-h-60 overflow-auto"
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
}
