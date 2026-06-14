'use client';

import Label from '@/app/components/label';
import { cn, descriptionClassName, errorClassName, inputFieldClassName, rowClassName } from '@/app/utils/className';
import { IconCalendar, IconChevronDown, IconClock } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

interface CustomDateTimeInputProps {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error: string;
  onError: (error: string) => void;
  onInvalidDate?: () => void;
  onBlur?: (value: string) => void;
  onEscape?: () => void;
  onEnter?: () => void;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  row?: boolean;
  tooltip?: ReactNode;
  minimal?: boolean;
  autoFocus?: boolean;
}

const calendarButtonClassName =
  'p-1 hover:bg-secondary/50 rounded transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center cursor-pointer';

const CustomDateTimeInput = forwardRef<{ focus: () => void }, CustomDateTimeInputProps>(
  (
    {
      id,
      label,
      value,
      onChange,
      error,
      onError,
      onInvalidDate,
      onBlur,
      onEscape,
      onEnter,
      disabled = false,
      required = false,
      min,
      max,
      className = '',
      row = false,
      tooltip,
      minimal = false,
      autoFocus = false,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [focusedSegment, setFocusedSegment] = useState<'day' | 'month' | 'year' | 'hour' | 'minute' | null>(null);
    const [typedDigits, setTypedDigits] = useState('');
    const [currentDate, setCurrentDate] = useState<Date>(value ? new Date(value) : new Date());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const containerRef = useRef<HTMLDivElement>(null);
    const customInputRef = useRef<HTMLDivElement>(null);
    const calendarButtonRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        setFocusedSegment('day');
        setIsFocused(true);
        setIsOpen(false);
        requestAnimationFrame(() => customInputRef.current?.focus());
      },
    }));

    // Convert to ISO string for onChange (using local timezone)
    const toISOString = (date: Date): string => {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    // Update current date when value changes
    useEffect(() => {
      if (value) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          setCurrentDate(parsed);
          setSelectedYear(parsed.getFullYear());
          setSelectedMonth(parsed.getMonth());
        }
      }
    }, [value]);

    // Auto-focus when autoFocus prop changes
    useEffect(() => {
      if (autoFocus) {
        setFocusedSegment('day');
        setIsFocused(true);
        setIsOpen(false);
        requestAnimationFrame(() => customInputRef.current?.focus());
      }
    }, [autoFocus]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setIsFocused(false);
          if (onBlur) onBlur(toISOString(currentDate));
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [currentDate, onBlur]);

    const handleToggle = () => {
      if (!disabled && !minimal) {
        setIsOpen(!isOpen);
        setIsFocused(true);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setIsFocused(false);
        setFocusedSegment(null);
        setTypedDigits('');
        if (onEscape) onEscape();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isOpen) {
          setIsOpen(false);
        } else {
          setIsOpen(false);
          setIsFocused(false);
          setFocusedSegment(null);
          setTypedDigits('');
          if (onEnter) onEnter();
        }
      } else if (e.key === 'ArrowDown' && !isOpen && !minimal && (!isFocused || !focusedSegment)) {
        e.preventDefault();
        handleToggle();
      } else if (isFocused && !isOpen && focusedSegment) {
        // Handle number input
        if (/^\d$/.test(e.key)) {
          e.preventDefault();
          const newDigits = typedDigits + e.key;
          setTypedDigits(newDigits);

          const segments: Array<'day' | 'month' | 'year' | 'hour' | 'minute'> = [
            'day',
            'month',
            'year',
            'hour',
            'minute',
          ];
          const maxDigits = focusedSegment === 'year' ? 4 : 2;

          if (newDigits.length >= maxDigits) {
            const value = parseInt(newDigits);
            const newDate = new Date(currentDate);

            switch (focusedSegment) {
              case 'day':
                if (value >= 1 && value <= 31) newDate.setDate(value);
                break;
              case 'month':
                if (value >= 1 && value <= 12) newDate.setMonth(value - 1);
                break;
              case 'year':
                newDate.setFullYear(value);
                break;
              case 'hour':
                if (value >= 0 && value <= 23) newDate.setHours(value);
                break;
              case 'minute':
                if (value >= 0 && value <= 59) newDate.setMinutes(value);
                break;
            }

            // Check if new date is before min
            if (min) {
              const minDate = new Date(min);
              if (newDate < minDate) {
                if (onInvalidDate) onInvalidDate();
                setTypedDigits('');
                return;
              }
            }

            setCurrentDate(newDate);
            onChange(toISOString(newDate));
            setSelectedYear(newDate.getFullYear());
            setSelectedMonth(newDate.getMonth());
            setTypedDigits('');

            // Move to next segment
            const currentIndex = segments.indexOf(focusedSegment);
            const nextIndex = currentIndex < segments.length - 1 ? currentIndex + 1 : 0;
            setFocusedSegment(segments[nextIndex]);
          }
        } else {
          // Handle input field navigation
          const segments: Array<'day' | 'month' | 'year' | 'hour' | 'minute'> = [
            'day',
            'month',
            'year',
            'hour',
            'minute',
          ];
          const currentIndex = focusedSegment ? segments.indexOf(focusedSegment) : -1;

          if (e.key === 'ArrowRight') {
            e.preventDefault();
            setTypedDigits('');
            const nextIndex = currentIndex < segments.length - 1 ? currentIndex + 1 : 0;
            setFocusedSegment(segments[nextIndex]);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setTypedDigits('');
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : segments.length - 1;
            setFocusedSegment(segments[prevIndex]);
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            setTypedDigits('');
            if (focusedSegment) {
              const delta = e.key === 'ArrowUp' ? 1 : -1;
              const newDate = new Date(currentDate);

              switch (focusedSegment) {
                case 'day':
                  newDate.setDate(newDate.getDate() + delta);
                  break;
                case 'month':
                  newDate.setMonth(newDate.getMonth() + delta);
                  break;
                case 'year':
                  newDate.setFullYear(newDate.getFullYear() + delta);
                  break;
                case 'hour':
                  newDate.setHours(newDate.getHours() + delta);
                  break;
                case 'minute':
                  newDate.setMinutes(newDate.getMinutes() + delta);
                  break;
              }

              // Check if new date is before min
              if (min) {
                const minDate = new Date(min);
                if (newDate < minDate) {
                  if (onInvalidDate) onInvalidDate();
                  return;
                }
              }

              setCurrentDate(newDate);
              onChange(toISOString(newDate));
              setSelectedYear(newDate.getFullYear());
              setSelectedMonth(newDate.getMonth());
            }
          }
        }
      }
    };

    const handleDateClick = (day: number) => {
      const newDate = new Date(selectedYear, selectedMonth, day, currentDate.getHours(), currentDate.getMinutes());

      // Validate against min and max
      if (min) {
        const minDate = new Date(min);
        if (newDate < minDate) {
          if (onInvalidDate) onInvalidDate();
          return;
        }
      }
      if (max) {
        const maxDate = new Date(max);
        if (newDate > maxDate) {
          if (onInvalidDate) onInvalidDate();
          return;
        }
      }

      setCurrentDate(newDate);
      onChange(toISOString(newDate));
      onError('');
    };

    const handleTimeChange = (hours: number, minutes: number) => {
      const newDate = new Date(selectedYear, selectedMonth, currentDate.getDate(), hours, minutes);

      // Validate against min and max
      if (min) {
        const minDate = new Date(min);
        if (newDate < minDate) {
          if (onInvalidDate) onInvalidDate();
          return;
        }
      }
      if (max) {
        const maxDate = new Date(max);
        if (newDate > maxDate) {
          if (onInvalidDate) onInvalidDate();
          return;
        }
      }

      setCurrentDate(newDate);
      onChange(toISOString(newDate));
      onError('');
    };

    const handleMonthChange = (delta: number) => {
      let newMonth = selectedMonth + delta;
      let newYear = selectedYear;
      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      } else if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }
      setSelectedMonth(newMonth);
      setSelectedYear(newYear);
    };

    const handleYearChange = (delta: number) => {
      setSelectedYear(selectedYear + delta);
    };

    // Generate calendar days
    const generateCalendar = () => {
      const firstDay = new Date(selectedYear, selectedMonth, 1);
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
      const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
      const totalDays = lastDay.getDate();

      const days = [];
      for (let i = 0; i < startDay; i++) {
        days.push(<div key={`empty-${i}`} className="p-2" />);
      }
      for (let day = 1; day <= totalDays; day++) {
        const isCurrentDate =
          day === currentDate.getDate() &&
          selectedMonth === currentDate.getMonth() &&
          selectedYear === currentDate.getFullYear();
        days.push(
          <button
            key={day}
            type="button"
            onClick={() => handleDateClick(day)}
            className={cn(
              'p-2 rounded-full hover:bg-secondary/50 transition-all duration-200 min-h-[40px] cursor-pointer',
              isCurrentDate && 'bg-primary text-white hover:bg-primary/90 shadow-md',
            )}
          >
            {day}
          </button>,
        );
      }
      return days;
    };

    // Month names in French
    const monthNames = [
      'Janv.',
      'Fév.',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juil.',
      'Août',
      'Sept.',
      'Oct.',
      'Nov.',
      'Déc.',
    ];

    const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    const segmentClassName = 'pl-1 pr-[5px] rounded transition-colors cursor-pointer';

    return (
      <div className={row ? 'flex flex-col m-0 p-0' : className} ref={containerRef}>
        <div className={row ? rowClassName : ''}>
          <Label id={id} required={required} tooltip={tooltip}>
            {label}
          </Label>
          <div className={cn('relative', row ? className : 'w-full', minimal && 'flex items-center')}>
            <div
              ref={customInputRef}
              id={id}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onClick={() => {
                if (!disabled) {
                  setIsFocused(true);
                  if (!minimal) handleToggle();
                }
              }}
              onFocus={() => {
                if (!disabled) {
                  setIsFocused(true);
                  if (!focusedSegment) setFocusedSegment('day');
                }
              }}
              onBlur={e => {
                if (!e.relatedTarget || !containerRef.current?.contains(e.relatedTarget as Node)) {
                  setIsFocused(false);
                  setFocusedSegment(null);
                  if (onBlur) onBlur(toISOString(currentDate));
                }
              }}
              className={cn(
                minimal
                  ? 'bg-transparent text-foreground outline-none cursor-pointer text-base flex items-center gap-0'
                  : cn(
                      inputFieldClassName(error),
                      isFocused && 'border-primary',
                      'flex items-center gap-0 cursor-text',
                      row && 'min-w-[240px]',
                    ),
              )}
            >
              <span
                className={cn(segmentClassName, focusedSegment === 'day' && isFocused && 'bg-primary/30')}
                onClick={e => {
                  e.stopPropagation();
                  setFocusedSegment('day');
                  setIsOpen(false);
                }}
              >
                {String(currentDate.getDate()).padStart(2, '0')}
              </span>
              <span>/</span>
              <span
                className={cn(segmentClassName, focusedSegment === 'month' && isFocused && 'bg-primary/30')}
                onClick={e => {
                  e.stopPropagation();
                  setFocusedSegment('month');
                  setIsOpen(false);
                }}
              >
                {String(currentDate.getMonth() + 1).padStart(2, '0')}
              </span>
              <span>/</span>
              <span
                className={cn(segmentClassName, focusedSegment === 'year' && isFocused && 'bg-primary/30')}
                onClick={e => {
                  e.stopPropagation();
                  setFocusedSegment('year');
                  setIsOpen(false);
                }}
              >
                {currentDate.getFullYear()}
              </span>
              <span>à</span>
              <span
                className={cn(segmentClassName, focusedSegment === 'hour' && isFocused && 'bg-primary/30')}
                onClick={e => {
                  e.stopPropagation();
                  setFocusedSegment('hour');
                  setIsOpen(false);
                }}
              >
                {String(currentDate.getHours()).padStart(2, '0')}
              </span>
              <span>:</span>
              <span
                className={cn(segmentClassName, focusedSegment === 'minute' && isFocused && 'bg-primary/30')}
                onClick={e => {
                  e.stopPropagation();
                  setFocusedSegment('minute');
                  setIsOpen(false);
                }}
              >
                {String(currentDate.getMinutes()).padStart(2, '0')}
              </span>
            </div>
            {!minimal && (
              <button
                ref={calendarButtonRef}
                type="button"
                onClick={handleToggle}
                disabled={disabled}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
                aria-label="Ouvrir le calendrier"
              >
                <IconChevronDown
                  size={18}
                  className={cn('transition-transform cursor-pointer', isOpen && 'rotate-180')}
                />
              </button>
            )}

            {isOpen && !disabled && !minimal && (
              <div
                className={cn(
                  'absolute z-50 min-w-[240px] max-w-[320px] bg-background border border-foreground/10 rounded-2xl shadow-2xl p-1',
                  'max-h-[70vh] overflow-y-auto backdrop-blur-xl bg-background/95 top-full mt-2',
                )}
              >
                {/* Calendar */}
                <div className="mb-3">
                  {/* Month/Year selector */}
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleMonthChange(-1)} className={calendarButtonClassName}>
                          <IconChevronDown size={16} className="rotate-90" />
                        </button>
                        <span className="font-medium text-center text-sm w-9">{monthNames[selectedMonth]}</span>
                        <button type="button" onClick={() => handleMonthChange(1)} className={calendarButtonClassName}>
                          <IconChevronDown size={16} className="-rotate-90" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date();
                          setCurrentDate(today);
                          onChange(toISOString(today));
                          setSelectedYear(today.getFullYear());
                          setSelectedMonth(today.getMonth());
                        }}
                        className={calendarButtonClassName}
                        title="Aujourd'hui"
                      >
                        <IconCalendar size={24} />
                      </button>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleYearChange(-1)} className={calendarButtonClassName}>
                          <IconChevronDown size={16} className="rotate-90" />
                        </button>
                        <span className="font-medium text-center text-sm">{selectedYear}</span>
                        <button type="button" onClick={() => handleYearChange(1)} className={calendarButtonClassName}>
                          <IconChevronDown size={16} className="-rotate-90" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1 text-sm">
                    {daysOfWeek.map(day => (
                      <div key={day} className="p-2 text-center text-foreground/40 font-medium text-xs">
                        {day}
                      </div>
                    ))}
                    {generateCalendar()}
                  </div>
                </div>

                {/* Time picker */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <IconClock size={14} className="text-foreground/40" />
                    <span className={descriptionClassName}>Heure</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-foreground/40 mb-1 block">Heures</label>
                      <select
                        value={currentDate.getHours()}
                        onChange={e => handleTimeChange(parseInt(e.target.value), currentDate.getMinutes())}
                        className="w-full bg-secondary/10 border border-foreground/10 rounded-xl p-2 text-foreground focus:outline-none"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {String(i).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-foreground/40 mb-1 block">Minutes</label>
                      <select
                        value={currentDate.getMinutes()}
                        onChange={e => handleTimeChange(currentDate.getHours(), parseInt(e.target.value))}
                        className="w-full bg-secondary/10 border border-foreground/10 rounded-xl p-2 text-foreground focus:outline-none"
                      >
                        {Array.from({ length: 60 }, (_, i) => (
                          <option key={i} value={i}>
                            {String(i).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {error && <p className={errorClassName}>{error}</p>}
      </div>
    );
  },
);

CustomDateTimeInput.displayName = 'CustomDateTimeInput';

export default CustomDateTimeInput;
