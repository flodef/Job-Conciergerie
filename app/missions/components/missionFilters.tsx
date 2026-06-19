'use client';

import MultiSelect from '@/app/components/multiSelect';
import Select from '@/app/components/select';
import Switch from '@/app/components/switch';
import { filterButtonClassName, rowClassName, secondaryButtonClassName } from '@/app/utils/className';
import { IconDeviceFloppy, IconRefresh, IconX } from '@tabler/icons-react';
import { cn } from '@/app/utils/className';
import { useLocalStorage } from '@/app/utils/localStorage';
import React from 'react';

export type MissionFiltersType = {
  conciergeries: string[];
  statuses: string[];
  missionStatuses: string[];
  zones: string[];
  employees: string[];
};

interface MissionFiltersProps {
  availableConciergeries: string[];
  availableZones: string[];
  availableTimePeriods: string[];
  availableMissionStatuses?: string[];
  availableEmployees?: string[];
  selectedConciergeries: string[];
  setSelectedConciergeries: React.Dispatch<React.SetStateAction<string[]>>;
  selectedStatuses: string[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  selectedMissionStatuses: string[];
  setSelectedMissionStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  selectedZones: string[];
  setSelectedZones: React.Dispatch<React.SetStateAction<string[]>>;
  selectedEmployees?: string[];
  setSelectedEmployees?: React.Dispatch<React.SetStateAction<string[]>>;
  saveFiltersToLocalStorage?: () => void;
  savedFilters?: MissionFiltersType;
  isConciergerie: boolean;
  onClose?: () => void;
  onToggleAllMissions?: (expand: boolean) => void;
  missionsExpandedByDefault?: boolean;
  setMissionsExpandedByDefault?: React.Dispatch<React.SetStateAction<boolean | undefined>>;
}

// Reusable reset button component
const FilterResetButton = ({ onClick, changed }: { onClick: () => void; changed: boolean }) => (
  <button onClick={onClick} className={filterButtonClassName(changed)} disabled={!changed} aria-label="Réinitialiser">
    <IconRefresh size={24} />
  </button>
);

export default function MissionFilters({
  availableConciergeries,
  availableZones,
  availableTimePeriods,
  availableMissionStatuses,
  availableEmployees,
  selectedConciergeries,
  setSelectedConciergeries,
  selectedStatuses,
  setSelectedStatuses,
  selectedMissionStatuses,
  setSelectedMissionStatuses,
  selectedZones,
  setSelectedZones,
  selectedEmployees,
  setSelectedEmployees,
  saveFiltersToLocalStorage,
  savedFilters,
  isConciergerie,
  onClose,
  onToggleAllMissions,
  missionsExpandedByDefault: propMissionsExpandedByDefault,
  setMissionsExpandedByDefault: propSetMissionsExpandedByDefault,
}: MissionFiltersProps) {
  const [localMissionsExpandedByDefault, setLocalMissionsExpandedByDefault] = useLocalStorage<boolean>(
    'missions_expanded_by_default',
    false,
  );
  const missionsExpandedByDefault = propMissionsExpandedByDefault ?? localMissionsExpandedByDefault;
  const setMissionsExpandedByDefault = propSetMissionsExpandedByDefault ?? setLocalMissionsExpandedByDefault;
  const statusLabels: Record<string, string> = {
    available: 'Disponible',
    accepted: 'Acceptée',
    completed: 'Terminée',
    expired: 'Expirée',
    started: 'En cours',
  };

  // Function to compare arrays (order doesn't matter)
  const compareArrays = (arr1: string[], arr2: string[]) => {
    if (arr1.length !== arr2.length) return true;
    const set1 = new Set(arr1);
    return arr2.some(item => !set1.has(item));
  };

  // Check if individual filter categories have changed
  const conciergeriesChanged = React.useMemo(() => {
    if (!savedFilters) return false;
    return compareArrays(selectedConciergeries, savedFilters.conciergeries);
  }, [selectedConciergeries, savedFilters]);

  const statusesChanged = React.useMemo(() => {
    if (!savedFilters) return false;
    return compareArrays(selectedStatuses, savedFilters.statuses);
  }, [selectedStatuses, savedFilters]);

  const missionStatusesChanged = React.useMemo(() => {
    if (!savedFilters) return false;
    return compareArrays(selectedMissionStatuses, savedFilters.missionStatuses);
  }, [selectedMissionStatuses, savedFilters]);

  const zonesChanged = React.useMemo(() => {
    if (!savedFilters) return false;
    return compareArrays(selectedZones, savedFilters.zones);
  }, [selectedZones, savedFilters]);

  const employeesChanged = React.useMemo(() => {
    if (!savedFilters || !selectedEmployees) return false;
    return compareArrays(selectedEmployees, savedFilters.employees || []);
  }, [selectedEmployees, savedFilters]);

  // Check if any filters have been changed from saved values
  const filtersChanged = React.useMemo(() => {
    return conciergeriesChanged || statusesChanged || missionStatusesChanged || zonesChanged || employeesChanged;
  }, [conciergeriesChanged, statusesChanged, missionStatusesChanged, zonesChanged, employeesChanged]);

  const handleToggleMissionsExpanded = (expand: boolean) => {
    setMissionsExpandedByDefault(expand);
    onToggleAllMissions?.(expand);
  };

  return (
    <div className="px-4 pb-4 bg-background rounded-lg shadow-md flex flex-col gap-1">
      {/* Mission expansion setting */}
      <Switch
        id="missions-expanded-default"
        label="Déplier les missions"
        enabled={missionsExpandedByDefault ?? false}
        onToggle={handleToggleMissionsExpanded}
        className="my-0"
      />

      {/* Conciergeries filter */}
      {availableConciergeries.length > 0 && (
        <div className={cn(rowClassName, 'gap-2 my-0')}>
          <MultiSelect
            id="conciergeries-filter"
            label="Conciergerie"
            values={selectedConciergeries}
            onChange={setSelectedConciergeries}
            options={availableConciergeries.map(conciergerie => ({
              value: conciergerie,
              label: conciergerie,
            }))}
            disabled={false}
            required
          />
          <FilterResetButton
            onClick={() => setSelectedConciergeries(savedFilters?.conciergeries || [])}
            changed={conciergeriesChanged}
          />
        </div>
      )}

      {/* Time period filter */}
      {availableTimePeriods.length > 0 && (
        <div className={cn(rowClassName, 'gap-2 my-0')}>
          <MultiSelect
            id="time-period-filter"
            label="Période"
            values={selectedStatuses}
            onChange={setSelectedStatuses}
            options={availableTimePeriods.map(period => ({ value: period, label: period }))}
            disabled={false}
            required
          />
          <FilterResetButton
            onClick={() => setSelectedStatuses(savedFilters?.statuses || [])}
            changed={statusesChanged}
          />
        </div>
      )}

      {/* Mission status filter */}
      {availableMissionStatuses && availableMissionStatuses.length > 0 && (
        <div className={cn(rowClassName, 'gap-2 my-0')}>
          <Select
            id="mission-status-filter"
            label="Etat de la mission"
            value={selectedMissionStatuses[0] || 'all'}
            onChange={value => setSelectedMissionStatuses(value === 'all' ? [] : [value])}
            options={[
              { value: 'all', label: 'Tous' },
              ...Object.keys(statusLabels)
                .filter(
                  status =>
                    availableMissionStatuses.includes(status) &&
                    (isConciergerie || (status !== 'started' && status !== 'expired')),
                )
                .map(status => ({
                  value: status,
                  label: statusLabels[status] || status,
                })),
            ]}
            disabled={false}
            required
          />
          <FilterResetButton
            onClick={() => setSelectedMissionStatuses(savedFilters?.missionStatuses || ['available'])}
            changed={missionStatusesChanged}
          />
        </div>
      )}

      {/* Employee filter - conciergerie only */}
      {availableEmployees &&
        availableEmployees.length > 0 &&
        setSelectedEmployees &&
        selectedEmployees !== undefined && (
          <div className={cn(rowClassName, 'gap-2 my-0')}>
            <MultiSelect
              id="employee-filter"
              label="Prestataire"
              values={selectedEmployees}
              onChange={setSelectedEmployees}
              options={availableEmployees.map(employee => ({ value: employee, label: employee }))}
              disabled={false}
              required
            />
            <FilterResetButton
              onClick={() => setSelectedEmployees(savedFilters?.employees || [])}
              changed={employeesChanged}
            />
          </div>
        )}

      {/* Geographic zones filter */}
      {availableZones.length > 0 && (
        <div className={cn(rowClassName, 'gap-2 my-0')}>
          <MultiSelect
            id="zones-filter"
            label="Zone géographique"
            values={selectedZones}
            onChange={setSelectedZones}
            options={availableZones.map(zone => ({
              value: zone,
              label: zone,
            }))}
            disabled={false}
            required
          />
          <FilterResetButton onClick={() => setSelectedZones(savedFilters?.zones || [])} changed={zonesChanged} />
        </div>
      )}

      {/* Save and Reset all filters buttons */}
      <div className="pt-2 border-t border-foreground/10 flex gap-2">
        {/* Save filters button */}
        {saveFiltersToLocalStorage && (
          <button
            onClick={() => {
              saveFiltersToLocalStorage();
              onClose?.();
            }}
            disabled={!filtersChanged}
            className={cn(
              secondaryButtonClassName,
              filtersChanged ? 'bg-primary text-background' : 'bg-foreground/5 text-foreground/40 cursor-not-allowed',
            )}
          >
            <IconDeviceFloppy size={20} />
            Enregistrer filtres
          </button>
        )}

        {/* Reset all filters button */}
        <button
          onClick={() => {
            setSelectedConciergeries(savedFilters?.conciergeries || []);
            setSelectedStatuses(savedFilters?.statuses || []);
            setSelectedMissionStatuses(savedFilters?.missionStatuses || ['available']);
            setSelectedZones(savedFilters?.zones || []);
            setSelectedEmployees?.(savedFilters?.employees || []);
          }}
          disabled={!filtersChanged}
          className={cn(
            secondaryButtonClassName,
            filtersChanged
              ? 'bg-foreground/10 text-foreground'
              : 'bg-foreground/5 text-foreground/40 cursor-not-allowed',
          )}
        >
          <IconX size={20} />
          Réinitialiser tout
        </button>
      </div>
    </div>
  );
}
