'use client';

import { inputClassName } from '@/app/utils/className';
import { IconSearch, IconX } from '@tabler/icons-react';
import { cn } from '@/app/utils/className';

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SearchInput({
  placeholder = 'Rechercher...',
  value,
  onChange,
  className = '',
}: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(inputClassName, value && 'pr-8')}
        maxLength={25}
      />
      <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light" size={18} />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-light cursor-pointer"
        >
          <IconX size={18} />
        </button>
      )}
    </div>
  );
}
