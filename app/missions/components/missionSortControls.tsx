'use client';

import { IconFilter, IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import clsx from 'clsx/lite';
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
    <div className="mb-4 space-y-4">
      {/* Sort and filter buttons */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5 items-center flex-1 overflow-hidden">
          <button
            onClick={() => changeSortField('date')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 whitespace-nowrap',
              sortField === 'date' ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
            )}
          >
            <span>Date</span>
            {sortField === 'date' &&
              (sortDirection === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />)}
          </button>
          <button
            onClick={() => changeSortField('conciergerie')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 whitespace-nowrap',
              sortField === 'conciergerie' ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
            )}
          >
            <span>Conciergerie</span>
            {sortField === 'conciergerie' &&
              (sortDirection === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />)}
          </button>
          <button
            onClick={() => changeSortField('geographicZone')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 whitespace-nowrap',
              sortField === 'geographicZone' ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
            )}
          >
            <span>Zone</span>
            {sortField === 'geographicZone' &&
              (sortDirection === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />)}
          </button>
          <button
            onClick={() => changeSortField('homeTitle')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 whitespace-nowrap',
              sortField === 'homeTitle' ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
            )}
          >
            <span>Bien</span>
            {sortField === 'homeTitle' &&
              (sortDirection === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />)}
          </button>
        </div>

        {/* Filter toggle button */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center',
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
