import { twMerge, type ClassNameValue } from 'tailwind-merge';
import type { ButtonStyle } from '@/app/components/button';

export const DROPDOWN_ITEM_HEIGHT = 41;
export const DEFAULT_MAX_ITEMS = 5;
export const DEFAULT_DROPDOWN_MAX_HEIGHT = DEFAULT_MAX_ITEMS * DROPDOWN_ITEM_HEIGHT;

export const cn = (...inputs: ClassNameValue[]) => twMerge(inputs);

export const rowClassName = 'flex flex-row justify-between my-2 gap-4 items-center';
export const titleClassName = 'text-lg font-medium';
export const textClassName = 'text-sm font-medium text-foreground';
export const textPulseClassName = textClassName + ' italic animate-pulse';
export const descriptionClassName = 'text-sm font-medium text-light';
export const containerClassName = descriptionClassName + ' flex items-center gap-1';
export const labelClassName = 'text-base font-medium text-foreground whitespace-nowrap';
export const errorClassName = 'text-red-500 text-sm';
export const textAreaCharCountClassName = 'text-right text-sm text-foreground/50 -mt-1.5';
export const inputClassName =
  'w-full px-2 py-1 pl-9 border-2 border-secondary rounded-md focus:ring-primary focus:border-primary focus-visible:outline-none focus-within:outline-none';
export const spinningClassName =
  'w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2';
export const secondaryButtonClassName = 'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 cursor-pointer';
export const rightSideButtonClassName = secondaryButtonClassName + ' bg-foreground/10 text-foreground self-end mb-1.5';
export const actionButtonBarClassName =
  'flex justify-end gap-2 bg-background border-t border-secondary px-2 py-2 rounded-b-lg cursor-pointer';
export const actionButtonClassName = 'flex flex-col items-center p-2 w-20 rounded-lg hover:opacity-80 cursor-pointer';

export const iconButtonClassName = (type?: ButtonStyle) =>
  cn(
    'p-1 rounded-full hover:bg-light/30 transition-colors cursor-pointer disabled:text-light disabled:cursor-not-allowed',
    type === 'primary' && 'hover:bg-primary/30 text-primary',
    type === 'secondary' && 'hover:bg-secondary/30 text-secondary',
    type === 'success' && 'hover:bg-green-500/30 text-green-500',
    type === 'dangerous' && 'hover:bg-red-500/30 text-red-500',
    type === 'inferno' && 'hover:bg-red-700/30 text-red-700',
  );

export const buttonClassName = (type: ButtonStyle) =>
  cn(
    'px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
    type === 'primary' && 'text-background bg-primary hover:bg-primary/80',
    type === 'secondary' && 'text-foreground bg-secondary hover:bg-secondary/80',
    type === 'success' && 'text-background bg-green-500 hover:bg-green-500/80',
    type === 'dangerous' && 'text-background bg-red-500 hover:bg-red-500/80',
    type === 'inferno' && 'text-background bg-red-700 hover:bg-red-700/80',
  );
export const selectClassName = (error: boolean | string, disabled: boolean, isFocused: boolean, isOpen: boolean) =>
  cn(
    'w-full px-2 py-1 rounded-lg bg-background text-foreground flex justify-between items-center cursor-pointer min-w-0',
    'focus-visible:outline-none focus-within:outline-none border-2',
    error && 'border-red-500',
    disabled && 'opacity-50 cursor-not-allowed',
    !disabled && (isFocused || isOpen) ? 'border-primary' : 'border-secondary',
  );
export const inputFieldClassName = (error: boolean | string) =>
  cn(
    'w-full px-2 py-1 rounded-lg bg-background text-foreground border-2 cursor-pointer focus-visible:outline-none focus-within:outline-none',
    error ? 'border-red-500' : 'border-secondary focus:border-primary',
  );
export const filterButtonClassName = (shouldAppear: boolean) =>
  cn(
    rightSideButtonClassName,
    'transition-all duration-500 ease-in-out px-1.5 mb-0',
    shouldAppear
      ? 'bg-foreground/10 text-foreground w-8'
      : 'bg-foreground/5 text-foreground/40 w-0 px-0 overflow-hidden',
  );
export const optionsClassName = 'w-full bg-background border border-foreground/20 rounded-lg shadow-lg overflow-auto';
export const optionClassName = (isHighlighted: boolean, isSelected?: boolean) =>
  cn(
    'p-2 cursor-pointer hover:bg-primary/10 flex items-center justify-between',
    isHighlighted && 'bg-primary/10',
    isSelected && 'font-medium text-primary bg-primary/10',
  );
export const getDropdownMaxHeight = (maxItems?: number) => ({
  maxHeight: maxItems ? `${maxItems * DROPDOWN_ITEM_HEIGHT}px` : `${DEFAULT_DROPDOWN_MAX_HEIGHT}px`,
});
