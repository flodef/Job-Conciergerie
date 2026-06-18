'use client';

import type { MissionSortField } from '@/app/types/dataTypes';
import { cn } from '@/app/utils/className';
import { IconSortAscending, IconSortDescending } from '@tabler/icons-react';

export const SORT_LABELS: Record<MissionSortField, string> = {
  date: 'Date',
  conciergerie: 'Conciergerie',
  geographicZone: 'Zone',
  homeTitle: 'Bien',
};

type SortDirection = 'asc' | 'desc';

interface MissionSortBarProps {
  sortField: MissionSortField;
  sortDirection: SortDirection;
  onSortChange: (field: MissionSortField, direction: SortDirection) => void;
  availableFields?: MissionSortField[];
  className?: string;
}

export default function MissionSortBar({
  sortField,
  sortDirection,
  onSortChange,
  availableFields = ['date', 'conciergerie', 'geographicZone', 'homeTitle'],
  className = '',
}: MissionSortBarProps) {
  const handleSortField = (field: MissionSortField) => {
    if (field === sortField) {
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, field === 'date' ? 'desc' : 'asc');
    }
  };

  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto pb-1', className)}>
      {availableFields.map(field => (
        <button
          key={field}
          onClick={() => handleSortField(field)}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm shrink-0 transition-colors cursor-pointer',
            sortField === field ? 'bg-primary text-white' : 'bg-secondary/20 text-foreground hover:bg-secondary/40',
          )}
        >
          {SORT_LABELS[field]}
          {sortField === field &&
            (sortDirection === 'asc' ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />)}
        </button>
      ))}
    </div>
  );
}
