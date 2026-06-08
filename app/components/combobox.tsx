'use client';

import Label from '@/app/components/label';
import { SelectOption } from '@/app/types/types';
import { cn, errorClassName, optionClassName, rowClassName, selectClassName } from '@/app/utils/className';
import { shouldOpenUpward } from '@/app/utils/select';
import { useScrollIndicators } from '@/app/utils/useScrollIndicators';
import { IconChevronDown, IconSearch } from '@tabler/icons-react';
import { ForwardedRef, forwardRef, ReactNode, useEffect, useImperativeHandle, useRef, useState } from 'react';

type ComboboxProps = {
  id: string;
  label: ReactNode;
  value: string | number | undefined;
  onChange: (value: string) => void;
  options: string[] | number[] | SelectOption[];
  placeholder?: string;
  className?: string;
  error?: boolean | string;
  disabled: boolean;
  required?: boolean;
  row?: boolean;
  tooltip?: ReactNode;
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
      tooltip,
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
    const { ref: scrollRef, canScrollUp, canScrollDown } = useScrollIndicators(isOpen);

    // Forward the internal inputRef to the parent component
    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
      (typeof option === 'object' ? option.label : option).toString().toLowerCase().includes(searchTerm.toLowerCase()),
    );

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
            const optionValue = typeof selectedOption === 'object' ? selectedOption.value : selectedOption;
            onChange(optionValue.toString());
            setSearchTerm('');
            setIsOpen(false);
          } else if (filteredOptions.length > 0) {
            // Select the first option if none is highlighted
            const selectedOption = filteredOptions[0];
            const optionValue = typeof selectedOption === 'object' ? selectedOption.value : selectedOption;
            onChange(optionValue.toString());
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

    const handleSelect = (option: string | number) => {
      onChange(option.toString());
      setSearchTerm('');
      setIsOpen(false);
      setIsFocused(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      setIsOpen(true);
      setHighlightedIndex(-1);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!isOpen) {
          checkPosition();
          setIsOpen(true);
          setIsFocused(true);
        }
      }
    };

    // Determine the display value based on the selected value
    const displayValue = (() => {
      if (!value?.toString().trim()) return placeholder;

      // If options are objects with value and label
      if (typeof options[0] === 'object') {
        const option = (options as SelectOption[]).find(opt => opt.value === value);
        return option ? option.label : value;
      }

      // If options are just strings
      return value;
    })();

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
        <Label id={id} required={required} tooltip={tooltip}>
          {label}
        </Label>
        <div className={cn('relative w-full', className)} ref={comboboxRef}>
          <div className={selectClassName(error, disabled, isFocused, isOpen)}>
            <IconSearch size={18} className="text-foreground/50 mr-2" />
            <input
              id={id}
              ref={inputRef}
              type="text"
              className="grow w-full bg-transparent outline-none text-foreground"
              placeholder={displayValue?.toString().trim() || placeholder}
              value={isOpen ? searchTerm : displayValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onClick={() => {
                if (!disabled) {
                  checkPosition();
                  setIsOpen(!isOpen);
                  setIsFocused(true);
                }
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={e => {
                if (!e.relatedTarget || !comboboxRef.current?.contains(e.relatedTarget as Node)) {
                  setIsFocused(false);
                  setIsOpen(false);
                }
              }}
              autoComplete="off"
              disabled={disabled}
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-controls={`${id}-options`}
            />
            <button
              type="button"
              onClick={() => !disabled && setIsOpen(!isOpen)}
              className="focus:outline-none cursor-pointer"
              tabIndex={-1}
            >
              <IconChevronDown
                size={18}
                className={cn('transition-transform duration-200', isOpen && 'transform rotate-180')}
              />
            </button>
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
                ref={el => {
                  optionsRef.current = el;
                  scrollRef.current = el;
                }}
                className="w-full bg-background border border-foreground/20 rounded-lg shadow-lg overflow-auto max-h-[202px]"
                role="listbox"
              >
                {filteredOptions.length === 0 ? (
                  <div className="p-2 text-foreground/50 text-center">Aucun résultat</div>
                ) : (
                  filteredOptions.map((option, index) => {
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

Combobox.displayName = 'Combobox';

export default Combobox;
