'use client';

import AutocompleteSelect from '@/app/components/autocompleteSelect';
import { rowClassName } from '@/app/utils/className';
import React from 'react';

export type HistoryFiltersType = {
  conciergerie: string | null;
  timePeriod: string | null;
};

interface HistoryFiltersProps {
  availableConciergeries: string[];
  availableTimePeriods: string[];
  selectedConciergerie: string | null;
  setSelectedConciergerie: (value: string | null) => void;
  selectedTimePeriod: string | null;
  setSelectedTimePeriod: (value: string | null) => void;
}

// Format period key to Month yyyy format with capitalized month (e.g., "2026-01" -> "Janvier 2026")
const formatPeriodLabel = (periodKey: string): string => {
  const [year, month] = periodKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const formatted = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  // Ensure first letter is uppercase
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export default function HistoryFilters({
  availableConciergeries,
  availableTimePeriods,
  selectedConciergerie,
  setSelectedConciergerie,
  selectedTimePeriod,
  setSelectedTimePeriod,
}: HistoryFiltersProps) {
  return (
    <div className="flex flex-col">
      {/* Conciergerie filter */}
      {availableConciergeries.length > 0 && (
        <div className={rowClassName}>
          <AutocompleteSelect
            id="conciergerie-filter"
            label="Conciergerie"
            value={selectedConciergerie}
            onChange={setSelectedConciergerie}
            options={availableConciergeries.map(conciergerie => ({
              value: conciergerie,
              label: conciergerie,
            }))}
            placeholder="Toutes les conciergeries"
            disabled={false}
            required
            clearable
            row
            maxItems={2}
          />
        </div>
      )}

      {/* Time period filter */}
      <div className={rowClassName}>
        <AutocompleteSelect
          id="time-period-filter"
          label="Période"
          value={selectedTimePeriod}
          onChange={setSelectedTimePeriod}
          options={availableTimePeriods.map(period => ({
            value: period,
            label: formatPeriodLabel(period),
          }))}
          placeholder="Toutes les périodes"
          disabled={availableTimePeriods.length === 0}
          required={availableTimePeriods.length > 0}
          clearable
          row
          maxItems={3}
          forceOpenUpward
        />
      </div>
    </div>
  );
}
