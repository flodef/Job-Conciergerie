'use client';

import { IconDeviceFloppy, IconX } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import React from 'react';

export type MissionFiltersType = {
  conciergeries: string[];
  statuses: string[];
  takenStatus: string[];
  zones: string[];
};

interface MissionFiltersProps {
  availableConciergeries: string[];
  availableZones: string[];
  selectedConciergeries: string[];
  setSelectedConciergeries: React.Dispatch<React.SetStateAction<string[]>>;
  selectedStatuses: string[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTakenStatus: string[];
  setSelectedTakenStatus: React.Dispatch<React.SetStateAction<string[]>>;
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
  selectedTakenStatus,
  setSelectedTakenStatus,
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

  const takenStatusChanged = React.useMemo(() => {
    if (!savedFilters) return false;
    return compareArrays(selectedTakenStatus, savedFilters.takenStatus);
  }, [selectedTakenStatus, savedFilters]);

  const zonesChanged = React.useMemo(() => {
    if (!savedFilters) return false;
    return compareArrays(selectedZones, savedFilters.zones);
  }, [selectedZones, savedFilters]);

  // Check if any filters have been changed from saved values
  const filtersChanged = React.useMemo(() => {
    return conciergeriesChanged || statusesChanged || takenStatusChanged || zonesChanged;
  }, [conciergeriesChanged, statusesChanged, takenStatusChanged, zonesChanged]);
  return (
    <div className="px-4 pb-4 bg-background rounded-lg shadow-md flex flex-col gap-2">
      {/* Conciergeries filter */}
      {availableConciergeries.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Conciergeries</h3>
          <div className="flex flex-wrap gap-2">
            {availableConciergeries.map(conciergerie => (
              <button
                key={conciergerie}
                onClick={() => {
                  setSelectedConciergeries(prev =>
                    prev.includes(conciergerie) ? prev.filter(c => c !== conciergerie) : [...prev, conciergerie],
                  );
                }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm',
                  selectedConciergeries.includes(conciergerie)
                    ? 'bg-primary text-background'
                    : 'bg-foreground/10 text-foreground',
                )}
              >
                {conciergerie}
              </button>
            ))}
            {conciergeriesChanged && (
              <button
                onClick={() => setSelectedConciergeries(savedFilters?.conciergeries || [])}
                className="px-3 py-1.5 rounded-lg text-sm bg-foreground/10 text-foreground flex items-center gap-1"
              >
                <IconX size={14} /> Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      {/* Time period filter */}
      <div>
        <h3 className="text-sm font-medium mb-2">Période</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedStatuses(prev =>
                prev.includes('current') ? prev.filter(s => s !== 'current') : [...prev, 'current'],
              );
            }}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm',
              selectedStatuses.includes('current') ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
            )}
          >
            Actuelles
          </button>
          <button
            onClick={() => {
              setSelectedStatuses(prev =>
                prev.includes('archived') ? prev.filter(s => s !== 'archived') : [...prev, 'archived'],
              );
            }}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm',
              selectedStatuses.includes('archived') ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
            )}
          >
            Archivées
          </button>
          {statusesChanged && (
            <button
              onClick={() => setSelectedStatuses(savedFilters?.statuses || ['current'])}
              className="px-3 py-1.5 rounded-lg text-sm bg-foreground/10 text-foreground flex items-center gap-1"
            >
              <IconX size={14} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Taken status filter */}
      <div>
        <h3 className="text-sm font-medium mb-2">Statut</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedTakenStatus(prev =>
                prev.includes('taken') ? prev.filter(s => s !== 'taken') : [...prev, 'taken'],
              );
            }}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm',
              selectedTakenStatus.includes('taken') ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
            )}
          >
            Prises
          </button>
          <button
            onClick={() => {
              setSelectedTakenStatus(prev =>
                prev.includes('notTaken') ? prev.filter(s => s !== 'notTaken') : [...prev, 'notTaken'],
              );
            }}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm',
              selectedTakenStatus.includes('notTaken')
                ? 'bg-primary text-background'
                : 'bg-foreground/10 text-foreground',
            )}
          >
            Disponibles
          </button>
          {takenStatusChanged && (
            <button
              onClick={() => setSelectedTakenStatus(savedFilters?.takenStatus || ['notTaken'])}
              className="px-3 py-1.5 rounded-lg text-sm bg-foreground/10 text-foreground flex items-center gap-1"
            >
              <IconX size={14} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Geographic zones filter */}
      <div>
        <h3 className="text-sm font-medium mb-2">Zones géographiques</h3>
        <div className="flex flex-wrap gap-2">
          {availableZones.map(zone => (
            <button
              key={zone}
              onClick={() => {
                setSelectedZones(prev => (prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]));
              }}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm',
                selectedZones.includes(zone) ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
              )}
            >
              {zone}
            </button>
          ))}
          {zonesChanged && (
            <button
              onClick={() => setSelectedZones(savedFilters?.zones || [])}
              className="px-3 py-1.5 rounded-lg text-sm bg-foreground/10 text-foreground flex items-center gap-1"
            >
              <IconX size={14} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Save and Reset all filters buttons */}

      <div className="pt-2 border-t border-foreground/10 flex gap-2">
        {/* Save filters button */}
        {saveFiltersToLocalStorage && (
          <button
            onClick={saveFiltersToLocalStorage}
            disabled={!filtersChanged}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1',
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
            setSelectedTakenStatus(savedFilters?.takenStatus || ['notTaken']);
            setSelectedZones(savedFilters?.zones || []);
          }}
          disabled={!filtersChanged}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1',
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
