'use client';

import AutocompleteSelect from '@/app/components/autocompleteSelect';
import { rowClassName } from '@/app/utils/className';
import { getMonthYearLabel } from '@/app/utils/date';

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

export default function HistoryFilters({
  availableConciergeries,
  availableTimePeriods,
  selectedConciergerie,
  setSelectedConciergerie,
  selectedTimePeriod,
  setSelectedTimePeriod,
}: HistoryFiltersProps) {
  const handleConciergerieChange = (value: string | null) => {
    setSelectedConciergerie(value);
    if (value === null) setSelectedTimePeriod(null);
  };

  const handleTimePeriodChange = (value: string | null) => {
    setSelectedTimePeriod(value);
    if (value === null) setSelectedConciergerie(null);
  };

  return (
    <div className="flex flex-col">
      {/* Conciergerie filter */}
      {availableConciergeries.length > 0 && (
        <div className={rowClassName}>
          <AutocompleteSelect
            id="conciergerie-filter"
            label="Conciergerie"
            value={selectedConciergerie}
            onChange={handleConciergerieChange}
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
          onChange={handleTimePeriodChange}
          options={availableTimePeriods.map(period => ({
            value: period,
            label: getMonthYearLabel(period),
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
