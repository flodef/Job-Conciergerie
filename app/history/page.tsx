'use client';

import { Toast, ToastMessage } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { Home, Mission } from '@/app/types/dataTypes';
import { formatDate, formatDateRange } from '@/app/utils/date';
import { getColorValueByName } from '@/app/utils/color';
import { formatHour, formatNumber } from '@/app/utils/task';
import { sortMissions } from '@/app/utils/missionFilters';
import { MissionSortField } from '@/app/types/dataTypes';
import {
  IconAdjustmentsHorizontal,
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconSortAscending,
  IconSortDescending,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';

type SortDirection = 'asc' | 'desc';

const SORT_LABELS: Record<MissionSortField, string> = {
  date: 'Date',
  conciergerie: 'Conciergerie',
  geographicZone: 'Zone',
  homeTitle: 'Bien',
};

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center bg-secondary/10 rounded-xl p-3 gap-1 flex-1 min-w-0">
      <div className="text-primary">{icon}</div>
      <span className="text-xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-light text-center">{label}</span>
    </div>
  );
}

function MissionRow({ mission, home, color }: { mission: Mission; home: Home | undefined; color: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-secondary rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/10 transition-colors"
        onClick={() => setIsOpen(prev => !prev)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{home?.title ?? 'Bien inconnu'}</p>
            <p className="text-sm text-light">{formatDate(new Date(mission.startDateTime))}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-sm text-light">{formatHour(mission.hours)}</span>
          {isOpen ? <IconChevronUp size={16} className="text-light" /> : <IconChevronDown size={16} className="text-light" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-1 text-sm border-t border-secondary pt-2">
          <p className="text-light">
            <span className="font-medium text-foreground">Dates :</span>{' '}
            {formatDateRange(new Date(mission.startDateTime), new Date(mission.endDateTime))}
          </p>
          {home?.geographicZone && (
            <p className="text-light">
              <span className="font-medium text-foreground">Zone :</span> {home.geographicZone}
            </p>
          )}
          <p className="text-light">
            <span className="font-medium text-foreground">Conciergerie :</span> {mission.conciergerieName}
          </p>
          <p className="text-light">
            <span className="font-medium text-foreground">Tâches :</span> {mission.tasks.join(', ')}
          </p>
          <p className="text-light">
            <span className="font-medium text-foreground">Durée :</span> {formatHour(mission.hours)}
          </p>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { missions, isLoading: missionsLoading } = useMissions();
  const { homes } = useHomes();
  const { employeeName, isLoading: authLoading, findConciergerie } = useAuth();

  const [toast, setToast] = useState<Toast>();
  const [sortField, setSortField] = useState<MissionSortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedConciergeries, setSelectedConciergeries] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const isLoading = authLoading || missionsLoading;

  // Filter to completed missions for this employee only
  const completedMissions = useMemo(
    () => missions.filter(m => m.status === 'completed' && m.employeeId === employeeName),
    [missions, employeeName],
  );

  // Available conciergeries from completed missions
  const availableConciergeries = useMemo(
    () => [...new Set(completedMissions.map(m => m.conciergerieName))].sort(),
    [completedMissions],
  );

  // Apply conciergerie filter then sort
  const sortedMissions = useMemo(() => {
    const filtered =
      selectedConciergeries.length > 0
        ? completedMissions.filter(m => selectedConciergeries.includes(m.conciergerieName))
        : completedMissions;
    return sortMissions(filtered, sortField, sortDirection, homes);
  }, [completedMissions, selectedConciergeries, sortField, sortDirection, homes]);

  // Stats
  const totalHours = useMemo(
    () => completedMissions.reduce((sum, m) => sum + m.hours, 0),
    [completedMissions],
  );
  const uniqueHomes = useMemo(
    () => new Set(completedMissions.map(m => m.homeId)).size,
    [completedMissions],
  );
  const uniqueConciergeries = useMemo(
    () => new Set(completedMissions.map(m => m.conciergerieName)).size,
    [completedMissions],
  );

  const handleSortField = (field: MissionSortField) => {
    if (field === sortField) setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const toggleConciergerie = (name: string) =>
    setSelectedConciergeries(prev => (prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]));

  if (isLoading) return null;

  return (
    <div className="p-4 space-y-4">
      {toast && <ToastMessage toast={toast} onClose={() => setToast(undefined)} />}

      {/* Stats */}
      {completedMissions.length > 0 && (
        <div className="flex gap-3">
          <StatCard label="Missions" value={String(completedMissions.length)} icon={<IconBriefcase size={20} />} />
          <StatCard label="Heures" value={formatHour(totalHours)} icon={<IconClock size={20} />} />
          <StatCard label="Biens" value={formatNumber(uniqueHomes)} icon={<IconCalendar size={20} />} />
          <StatCard label="Conciergeries" value={formatNumber(uniqueConciergeries)} icon={<IconBuilding size={20} />} />
        </div>
      )}

      {/* Sort & Filter bar */}
      {completedMissions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(Object.keys(SORT_LABELS) as MissionSortField[]).map(field => (
              <button
                key={field}
                onClick={() => handleSortField(field)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm shrink-0 transition-colors ${
                  sortField === field
                    ? 'bg-primary text-white'
                    : 'bg-secondary/20 text-foreground hover:bg-secondary/40'
                }`}
              >
                {SORT_LABELS[field]}
                {sortField === field &&
                  (sortDirection === 'asc' ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />)}
              </button>
            ))}
            {availableConciergeries.length > 1 && (
              <button
                onClick={() => setShowFilters(prev => !prev)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm shrink-0 transition-colors ml-auto ${
                  selectedConciergeries.length > 0 ? 'bg-primary text-white' : 'bg-secondary/20 text-foreground hover:bg-secondary/40'
                }`}
              >
                <IconAdjustmentsHorizontal size={14} />
                {selectedConciergeries.length > 0 ? `Filtre (${selectedConciergeries.length})` : 'Filtres'}
              </button>
            )}
          </div>

          {/* Conciergerie filter chips */}
          {showFilters && availableConciergeries.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {availableConciergeries.map(name => {
                const conciergerie = findConciergerie(name);
                const color = getColorValueByName(conciergerie?.colorName);
                const isSelected = selectedConciergeries.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleConciergerie(name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors border ${
                      isSelected ? 'text-white border-transparent' : 'bg-background border-secondary text-foreground'
                    }`}
                    style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? 'white' : color }}
                    />
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mission list */}
      {sortedMissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-light">
          <IconBriefcase size={48} className="opacity-30" />
          <p className="text-center">
            {completedMissions.length === 0
              ? 'Aucune mission terminée pour le moment.'
              : 'Aucune mission ne correspond aux filtres sélectionnés.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedMissions.map(mission => {
            const home = homes.find(h => h.id === mission.homeId);
            const conciergerie = findConciergerie(mission.conciergerieName);
            const color = getColorValueByName(conciergerie?.colorName);
            return <MissionRow key={mission.id} mission={mission} home={home} color={color} />;
          })}
        </div>
      )}
    </div>
  );
}
