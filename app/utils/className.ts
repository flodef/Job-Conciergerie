import clsx from 'clsx/lite';
import { ButtonStyle } from '@/app/components/button';

export const rowClassName = 'flex flex-row justify-between my-4 gap-4 items-center';
export const descriptionClassName = 'text-sm font-medium text-light';
export const labelClassName = 'text-base font-medium text-foreground';
export const errorClassName = 'text-red-500 text-sm mt-1';
export const textAreaCharCountClassName = 'text-right text-sm text-foreground/50 -mt-1.5';
export const inputClassName =
  'w-full p-2 pl-9 border-2 border-secondary rounded-md focus:ring-primary focus:border-primary focus-visible:outline-none focus-within:outline-none';
export const spinningClassName =
  'w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2';
export const secondaryButtonClassName = 'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1';
export const rightSideButtonClassName = secondaryButtonClassName + ' bg-foreground/10 text-foreground self-end mb-1.5';
export const actionButtonBarClassName =
  'flex justify-end gap-2 bg-background border-t border-secondary px-2 py-2 rounded-b-lg';
export const actionButtonClassName = 'flex flex-col items-center p-2 w-20 rounded-lg hover:opacity-80';

export const buttonClassName = (type: ButtonStyle) =>
  clsx(
    'px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50',
    type === 'primary' && 'text-background bg-primary hover:bg-primary/80',
    type === 'secondary' && 'text-foreground bg-secondary hover:bg-secondary/80',
    type === 'dangerous' && 'text-background bg-red-500 hover:bg-red-600',
    type === 'inferno' && 'text-background bg-red-700 hover:bg-red-800',
  );
export const selectClassName = (error: boolean | string, disabled: boolean, isFocused: boolean, isOpen: boolean) =>
  clsx(
    'w-full p-2 rounded-lg bg-background text-foreground flex justify-between items-center cursor-pointer',
    'focus-visible:outline-none focus-within:outline-none border-2',
    error && 'border-red-500',
    disabled && 'opacity-50 cursor-not-allowed',
    !disabled && (isFocused || isOpen) ? 'border-primary' : 'border-secondary',
  );
export const inputFieldClassName = (error: boolean | string) =>
  clsx(
    'w-full px-3 py-2 rounded-lg bg-background text-foreground border-2',
    error ? 'border-red-500 focus-visible:outline-red-500' : 'border-secondary focus-visible:outline-primary',
  );
export const filterButtonClassName = (shouldAppear: boolean) =>
  clsx(
    rightSideButtonClassName,
    'transition-all duration-500 ease-in-out',
    shouldAppear
      ? 'bg-foreground/10 text-foreground w-[115px]'
      : 'bg-foreground/5 text-foreground/40 w-0 px-[0px] overflow-hidden',
  );
export const optionsClassName = (openUpward: boolean) =>
  clsx(
    'absolute z-50 w-full bg-background border border-foreground/20 rounded-lg shadow-lg max-h-[202px] overflow-auto',
    openUpward ? 'bottom-full mb-1' : 'top-full mt-1',
  );
export const optionClassName = (isHighlighted: boolean, isSelected?: boolean) =>
  clsx(
    'p-2 cursor-pointer hover:bg-primary/10 flex items-center justify-between',
    isHighlighted && 'bg-primary/10',
    isSelected && 'font-medium text-primary bg-primary/10',
  );
