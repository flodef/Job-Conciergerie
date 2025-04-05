'use client';

import MultiSelect from '@/app/components/multiSelect';
import { filterButtonClassName, rowClassName, secondaryButtonClassName } from '@/app/utils/className';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import React from 'react';

export type MissionFiltersType = {
  conciergeries: string[];
  statuses: string[];
  missionStatuses: string[];
  zones: string[];
};

interface MissionFiltersProps {
  availableConciergeries: string[];
  availableZones: string[];
  selectedConciergeries: string[];
  setSelectedConciergeries: React.Dispatch<React.SetStateAction<string[]>>;
  selectedStatuses: string[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  selectedMissionStatuses: string[];
  setSelectedMissionStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  selectedZones: string[];
  setSelectedZones: React.Dispatch<React.SetStateAction<string[]>>;
  saveFiltersToLocalStorage?: () => void;
  savedFilters?: MissionFiltersType;
}

export default function MissionFilters({
  availableConciergeries,
  availableZones,
  selectedConciergeries,
  setSelectedConciergeries,
  selectedStatuses,
  setSelectedStatuses,
  selectedMissionStatuses,
  setSelectedMissionStatuses,
  selectedZones,
  setSelectedZones,
  saveFiltersToLocalStorage,
  savedFilters,
}: MissionFiltersProps) {
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

  // Check if any filters have been changed from saved values
  const filtersChanged = React.useMemo(() => {
    return conciergeriesChanged || statusesChanged || missionStatusesChanged || zonesChanged;
  }, [conciergeriesChanged, statusesChanged, missionStatusesChanged, zonesChanged]);
  return (
    <div className="px-4 pb-4 bg-background rounded-lg shadow-md flex flex-col gap-2">
      {/* Conciergeries filter */}
      {availableConciergeries.length > 0 && (
        <div className={clsx(rowClassName, 'my-[0px]')}>
          <MultiSelect
            id="conciergeries-filter"
            label="Conciergeries"
            values={selectedConciergeries}
            onChange={setSelectedConciergeries}
            options={availableConciergeries.map(conciergerie => ({
              value: conciergerie,
              label: conciergerie,
            }))}
            disabled={false}
            required
          />
          <button
            onClick={() => setSelectedConciergeries(savedFilters?.conciergeries || [])}
            className={filterButtonClassName(conciergeriesChanged)}
            disabled={!conciergeriesChanged}
          >
            <IconX size={14} /> Réinitialiser
          </button>
        </div>
      )}

      {/* Time period filter */}
      <div className={clsx(rowClassName, 'my-[0px]')}>
        <MultiSelect
          id="time-period-filter"
          label="Période"
          values={selectedStatuses}
          onChange={setSelectedStatuses}
          options={[
            { value: 'current', label: 'Actuelles' },
            { value: 'archived', label: 'Archivées' },
          ]}
          disabled={false}
          required
        />
        <button
          onClick={() => setSelectedStatuses(savedFilters?.statuses || ['current'])}
          className={filterButtonClassName(statusesChanged)}
          disabled={!statusesChanged}
        >
          <IconX size={14} /> Réinitialiser
        </button>
      </div>

      {/* Mission status filter */}
      <div className={clsx(rowClassName, 'my-[0px]')}>
        <MultiSelect
          id="mission-status-filter"
          label="Statut"
          values={selectedMissionStatuses}
          onChange={setSelectedMissionStatuses}
          options={[
            { value: 'available', label: 'Disponibles' },
            { value: 'accepted', label: 'Acceptées' },
            { value: 'started', label: 'Démarrées' },
            { value: 'completed', label: 'Terminées' },
          ]}
          disabled={false}
          required
        />
        <button
          onClick={() => setSelectedMissionStatuses(savedFilters?.missionStatuses || ['available'])}
          className={filterButtonClassName(missionStatusesChanged)}
          disabled={!missionStatusesChanged}
        >
          <IconX size={14} /> Réinitialiser
        </button>
      </div>

      {/* Geographic zones filter */}
      <div className={clsx(rowClassName, 'my-[0px]')}>
        <MultiSelect
          id="zones-filter"
          label="Zones géographiques"
          values={selectedZones}
          onChange={setSelectedZones}
          options={availableZones.map(zone => ({
            value: zone,
            label: zone,
          }))}
          disabled={false}
          required
        />
        <button
          onClick={() => setSelectedZones(savedFilters?.zones || [])}
          className={filterButtonClassName(zonesChanged)}
          disabled={!zonesChanged}
        >
          <IconX size={14} /> Réinitialiser
        </button>
      </div>

      {/* Save and Reset all filters buttons */}

      <div className="pt-2 border-t border-foreground/10 flex gap-2">
        {/* Save filters button */}
        {saveFiltersToLocalStorage && (
          <button
            onClick={saveFiltersToLocalStorage}
            disabled={!filtersChanged}
            className={clsx(
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
            setSelectedStatuses(savedFilters?.statuses || ['current']);
            setSelectedMissionStatuses(savedFilters?.missionStatuses || ['available']);
            setSelectedZones(savedFilters?.zones || []);
          }}
          disabled={!filtersChanged}
          className={clsx(
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
