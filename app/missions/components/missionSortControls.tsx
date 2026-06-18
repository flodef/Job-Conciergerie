'use client';

import { IconFilter, IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import { cn } from '@/app/utils/className';
import React from 'react';

type SortField = 'date' | 'conciergerie' | 'geographicZone' | 'homeTitle';

interface MissionSortControlsProps {
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  changeSortField: (field: SortField) => void;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  hasActiveFilters: boolean;
  filteredMissionsCount: number;
}

const sortButtonClassName = 'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 whitespace-nowrap cursor-pointer';

const SORT_FIELDS = [
  { field: 'date' as SortField, label: 'Date' },
  { field: 'conciergerie' as SortField, label: 'Conciergerie' },
  { field: 'geographicZone' as SortField, label: 'Zone' },
  { field: 'homeTitle' as SortField, label: 'Bien' },
];

export default function MissionSortControls({
  sortField,
  sortDirection,
  changeSortField,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  filteredMissionsCount,
}: MissionSortControlsProps) {
  return (
    <div className="mb-4 space-y-4 mt-2">
      {/* Sort and filter buttons */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5 items-center flex-1 overflow-hidden">
          {SORT_FIELDS.map(({ field, label }) => (
            <button
              key={field}
              onClick={() => changeSortField(field)}
              className={cn(
                sortButtonClassName,
                sortField === field ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
              )}
            >
              <span>{label}</span>
              {sortField === field &&
                (sortDirection === 'asc' ? <IconSortDescending size={16} /> : <IconSortAscending size={16} />)}
            </button>
          ))}
        </div>

        {/* Filter toggle button */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer',
              showFilters ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
              hasActiveFilters ? 'ring-1 ring-primary' : '',
            )}
            aria-label="Filtres"
          >
            <IconFilter size={20} />
            {filteredMissionsCount > 0 && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 text-sm rounded-full bg-primary text-background">
                {filteredMissionsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
