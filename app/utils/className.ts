import clsx from 'clsx/lite';
import { ButtonStyle } from '@/app/components/button';

export const rowClassName = 'flex flex-row justify-between my-4 gap-4 items-center';
export const labelClassName = 'text-base font-medium text-foreground mb-1';
export const errorClassName = 'text-red-500 text-sm mt-1';
export const textAreaCharCountClassName = 'text-right text-sm text-foreground/50 -mt-1.5';
export const inputClassName =
  'w-full p-2 pl-10 border-2 border-secondary rounded-md focus:ring-primary focus:border-primary focus-visible:outline-none focus-within:outline-none';
export const spinningClassName =
  'w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2';

export const buttonClassName = (type: ButtonStyle) =>
  clsx(
    'px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:cursor-not-allowed',
    type === 'primary' && 'text-background bg-primary hover:bg-primary/80 disabled:bg-primary/50',
    type === 'secondary' && 'text-foreground bg-secondary hover:bg-secondary/80 disabled:bg-secondary/50',
    type === 'dangerous' && 'text-background bg-red-500 hover:bg-red-600 disabled:bg-red-500/50',
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
