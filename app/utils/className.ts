import clsx from 'clsx/lite';

export const selectClassName = (error: boolean | string, disabled: boolean, isFocused: boolean, isOpen: boolean) =>
  clsx(
    'w-full p-2 rounded-lg bg-background text-foreground flex justify-between items-center cursor-pointer',
    'focus-visible:outline-none focus-within:outline-none',
    error && 'border-red-500',
    disabled && 'opacity-50 cursor-not-allowed',
    !disabled && (isFocused || isOpen) ? 'border-primary border-2' : 'border-secondary border',
  );

export const rowClassName = () => 'flex flex-row justify-between my-4 gap-4 items-center';

export const labelClassName = () => 'text-base font-medium text-foreground';

export const inputFieldClassName = (error: boolean | string) =>
  clsx(
    'w-full px-3 py-2 rounded-lg bg-background text-foreground',
    error
      ? 'border-red-500 focus-visible:outline-red-500 border-2'
      : 'border-secondary focus-visible:outline-primary border',
  );

export const inputClassName = () =>
  clsx('w-full p-2 pl-10 border border-secondary rounded-md focus:ring-primary focus:border-primary focus:border-2');
