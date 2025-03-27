'use client';

import { inputClassName } from '@/app/utils/className';
import { IconSearch } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import { ChangeEvent } from 'react';

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  className?: string;
}

export default function SearchInput({
  placeholder = 'Rechercher...',
  value,
  onChange,
  onClear,
  className = '',
}: SearchInputProps) {
  return (
    <div className={clsx('relative mb-4', className)}>
      <input type="text" placeholder={placeholder} value={value} onChange={onChange} className={inputClassName} />
      <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/50" size={18} />
      {value && onClear && (
        <button onClick={onClear} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground/50">
          ✕
        </button>
      )}
    </div>
  );
}
