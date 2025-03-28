'use client';

import Label from '@/app/components/label';
import { errorClassName, rowClassName, selectClassName } from '@/app/utils/className';
import { shouldOpenUpward } from '@/app/utils/dropdownPosition';
import { IconChevronDown, IconSearch } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import { ForwardedRef, forwardRef, ReactNode, useEffect, useImperativeHandle, useRef, useState } from 'react';

type ComboboxProps = {
  id: string;
  label: ReactNode;
  value: string | number | undefined;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  error?: boolean | string;
  disabled: boolean;
  required?: boolean;
  row?: boolean;
};

const Combobox = forwardRef(
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
      disabled = false,
      required = false,
      row = false,
    }: ComboboxProps,
    forwardedRef: ForwardedRef<HTMLInputElement>,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const comboboxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);

    // Forward the internal inputRef to the parent component
    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

    // Filter options based on search term
    const filteredOptions = options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()));

    // Close the dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
          setIsOpen(false);
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
          setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (highlightedIndex >= 0) {
            const selectedOption = filteredOptions[highlightedIndex];
            onChange(selectedOption);
            setSearchTerm('');
            setIsOpen(false);
          } else if (filteredOptions.length > 0) {
            // Select the first option if none is highlighted
            onChange(filteredOptions[0]);
            setSearchTerm('');
            setIsOpen(false);
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, highlightedIndex, filteredOptions, onChange]);

    // Scroll to highlighted option
    useEffect(() => {
      if (highlightedIndex < 0 || !optionsRef.current) return;

      const highlightedOption = optionsRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedOption) {
        highlightedOption.scrollIntoView({ block: 'nearest' });
      }
    }, [highlightedIndex]);

    const handleSelect = (option: string) => {
      onChange(option);
      setSearchTerm('');
      setIsOpen(false);
      setIsFocused(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      setIsOpen(true);
      setHighlightedIndex(-1);
    };

    const checkPosition = () => {
      if (comboboxRef.current) {
        setOpenUpward(
          shouldOpenUpward({
            elementRef: comboboxRef.current,
            itemCount: filteredOptions.length,
          }),
        );
      }
    };

    return (
      <div className={row ? rowClassName : ''}>
        <Label id={id} required={required}>
          {label}
        </Label>
        <div className={clsx('relative w-full', className)} ref={comboboxRef}>
          <div className={selectClassName(error, disabled, isFocused, isOpen)}>
            <IconSearch size={18} className="text-foreground/50 mr-2" />
            <input
              id={id}
              ref={inputRef}
              type="text"
              className="flex-grow w-full bg-transparent outline-none text-foreground"
              placeholder={value?.toString() || placeholder}
              value={isOpen ? searchTerm : value}
              onChange={handleInputChange}
              onClick={() => {
                if (!disabled) {
                  checkPosition();
                  setIsOpen(!isOpen);
                  setIsFocused(true);
                }
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoComplete="off"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => !disabled && setIsOpen(!isOpen)}
              className="focus:outline-none"
              tabIndex={-1}
            >
              <IconChevronDown
                size={18}
                className={clsx('transition-transform duration-200', isOpen && 'transform rotate-180')}
              />
            </button>
          </div>

          {isOpen && !disabled && (
            <div
              ref={optionsRef}
              className={clsx(
                'absolute z-50 w-full bg-background border border-foreground/20 rounded-lg shadow-lg max-h-[202px] overflow-auto',
                openUpward ? 'bottom-full mb-1' : 'top-full mt-1',
              )}
            >
              {filteredOptions.length === 0 ? (
                <div className="p-2 text-foreground/50 text-center">Aucun résultat</div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={option}
                    className={clsx(
                      'p-2 cursor-pointer hover:bg-primary/10',
                      highlightedIndex === index && 'bg-primary/10',
                      option === value && 'font-medium text-primary bg-primary/10',
                    )}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {option}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        {error && <p className={errorClassName}>{error}</p>}
      </div>
    );
  },
);

Combobox.displayName = 'Combobox';

export default Combobox;
