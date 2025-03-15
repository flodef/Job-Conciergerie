'use client';

import { IconX } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import React from 'react';

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
}: MissionFiltersProps) {
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
            {selectedConciergeries.length > 0 && (
              <button
                onClick={() => setSelectedConciergeries([])}
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
          {selectedStatuses.length > 0 && (
            <button
              onClick={() => setSelectedStatuses([])}
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
          {selectedTakenStatus.length > 0 && (
            <button
              onClick={() => setSelectedTakenStatus([])}
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
          {selectedZones.length > 0 && (
            <button
              onClick={() => setSelectedZones([])}
              className="px-3 py-1.5 rounded-lg text-sm bg-foreground/10 text-foreground flex items-center gap-1"
            >
              <IconX size={14} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Reset all filters button */}
      {(selectedConciergeries.length > 0 ||
        selectedStatuses.length > 0 ||
        selectedTakenStatus.length > 0 ||
        selectedZones.length > 0) && (
        <div className="pt-2 border-t border-foreground/10">
          <button
            onClick={() => {
              setSelectedConciergeries([]);
              setSelectedStatuses([]);
              setSelectedTakenStatus([]);
              setSelectedZones([]);
            }}
            className="px-3 py-1.5 rounded-lg text-sm bg-foreground/10 text-foreground flex items-center gap-1"
          >
            <IconX size={14} /> Réinitialiser tous les filtres
          </button>
        </div>
      )}
    </div>
  );
}
