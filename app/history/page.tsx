'use client';

import Accordion from '@/app/components/accordion';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import HistoryFilters from '@/app/history/components/historyFilters';
import type { Home, Mission } from '@/app/types/dataTypes';
import { getColorValueByName } from '@/app/utils/color';
import { formatDate, formatDateRange } from '@/app/utils/date';
import { formatHours, formatNumber, getMissionHoursPerProvider, getMissionProviderCount } from '@/app/utils/task';
import {
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconChartLine,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconFilter,
  IconRefresh,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { cn, descriptionClassName, iconButtonClassName, textClassName, titleClassName } from '../utils/className';

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
  const hoursPerProvider = getMissionHoursPerProvider(mission);
  const isDuo = getMissionProviderCount(mission) === 2;

  return (
    <div className="border border-secondary rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/10 transition-colors cursor-pointer"
        onClick={() => setIsOpen(prev => !prev)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <div className="min-w-0">
            <p className={cn(titleClassName, 'truncate')}>{home?.title ?? 'Bien inconnu'}</p>
            <p className={descriptionClassName}>{formatDate(new Date(mission.startDateTime))}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={descriptionClassName}>{formatHours(hoursPerProvider)}</span>
          {isOpen ? (
            <IconChevronUp size={16} className={descriptionClassName} />
          ) : (
            <IconChevronDown size={16} className={descriptionClassName} />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-1 text-sm border-t border-secondary pt-2">
          <p className={descriptionClassName}>
            <span className={textClassName}>Dates :</span>{' '}
            {formatDateRange(new Date(mission.startDateTime), new Date(mission.endDateTime))}
          </p>
          {home?.geographicZone && (
            <p className={descriptionClassName}>
              <span className={textClassName}>Zone :</span> {home.geographicZone}
            </p>
          )}
          <p className={descriptionClassName}>
            <span className={textClassName}>Conciergerie :</span> {mission.conciergerieName}
          </p>
          <p className={descriptionClassName}>
            <span className={textClassName}>Tâches :</span> {mission.tasks.join(', ')}
          </p>
          <p className={descriptionClassName}>
            <span className={textClassName}>Durée :</span> {formatHours(hoursPerProvider)}
            {isDuo && <span className="text-light ml-1">(binôme)</span>}
          </p>
        </div>
      )}
    </div>
  );
}

// Format month key to MM/YY format (e.g., "2026-01" -> "01/26")
const formatShortMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  return `${month}/${year.slice(2)}`;
};

// Helper to get month name in French with first letter capitalized
const getMonthName = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const formatted = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  // Ensure first letter is uppercase
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

// Interactive line chart component for monthly hours with manual SVG
function MonthlyHoursChart({
  missions,
  selectedPoint,
  onPointSelect,
  onReset,
}: {
  missions: Mission[];
  selectedPoint: string | null;
  onPointSelect: (month: string | null) => void;
  onReset: () => void;
}) {
  // Group missions by month
  const monthlyData = useMemo(() => {
    const data = new Map<string, { hours: number; count: number }>();

    missions.forEach(mission => {
      const date = new Date(mission.startDateTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = data.get(monthKey) || { hours: 0, count: 0 };
      data.set(monthKey, {
        hours: existing.hours + getMissionHoursPerProvider(mission),
        count: existing.count + 1,
      });
    });

    // Sort by month
    return Array.from(data.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, stats]) => ({
        month,
        label: formatShortMonthLabel(month),
        ...stats,
      }));
  }, [missions]);

  if (monthlyData.length === 0) return null;

  // Calculate adaptive legend interval (aim for ~5 labels)
  const legendInterval = Math.max(1, Math.ceil(monthlyData.length / 5));

  // Selected month info
  const selectedData = selectedPoint ? monthlyData.find(d => d.month === selectedPoint) : null;

  if (monthlyData.length === 1) {
    // Single data point - show as a dot with value
    const { month, hours } = monthlyData[0];
    return (
      <div className="bg-secondary/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className={textClassName}>
            {selectedData
              ? `${getMonthName(selectedData.month)} - ${formatHours(selectedData.hours)}`
              : 'Heures par mois'}
          </h3>
          {selectedPoint && (
            <button onClick={onReset} className={iconButtonClassName('secondary')} title="Réinitialiser">
              <IconRefresh size={16} className="text-light" />
            </button>
          )}
        </div>
        <div className="h-24 flex items-center justify-center">
          <button
            onClick={() => onPointSelect(selectedPoint === month ? null : month)}
            className="flex flex-col items-center gap-2 cursor-pointer"
          >
            <div
              className={`w-4 h-4 rounded-full transition-all ${selectedPoint === month ? 'bg-primary scale-125' : 'bg-primary/60'}`}
            />
            <span className={descriptionClassName}>{formatHours(hours)}</span>
          </button>
        </div>
      </div>
    );
  }

  const maxHours = Math.max(...monthlyData.map(d => d.hours));

  // Calculate points for dots with equal spacing
  const padding = 2; // 2% padding on right side only
  const points = monthlyData.map((d, i) => {
    const x = monthlyData.length > 1 ? (i / (monthlyData.length - 1)) * (100 - padding) : 50;
    const y = maxHours > 0 ? 100 - (d.hours / maxHours) * 100 : 100;
    return { x, y, ...d };
  });

  return (
    <div className="bg-secondary/5 rounded-xl">
      {/* Header with selected month info and reset button */}
      <div className="flex items-center justify-between mb-3 h-7">
        <h3 className={textClassName}>
          {selectedData
            ? `${getMonthName(selectedData.month)} - ${formatHours(selectedData.hours)}`
            : 'Heures par mois'}
        </h3>
        {selectedPoint && (
          <button
            onClick={() => onPointSelect(null)}
            className={iconButtonClassName('secondary')}
            title="Réinitialiser la sélection"
          >
            <IconRefresh size={16} className="text-light" />
          </button>
        )}
      </div>

      {/* Chart area with legends */}
      <div className="flex gap-4">
        {/* Y-axis legend (hours) on left - 0 at bottom */}
        <div className="flex flex-col justify-between py-1">
          {[1, 0.75, 0.5, 0.25, 0].map(ratio => {
            const hourValue = Math.round(maxHours * ratio);
            return (
              <span key={ratio} className="text-xs text-light text-right">
                {hourValue}h
              </span>
            );
          })}
        </div>

        {/* Chart */}
        <div className="relative h-32 flex-1">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full overflow-visible"
          >
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(y => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="currentColor"
                strokeWidth="0.15"
                className="text-foreground/10"
              />
            ))}

            {/* Vertical reference line for selected point */}
            {selectedPoint && (
              <line
                x1={points.find(p => p.month === selectedPoint)?.x}
                y1="0"
                x2={points.find(p => p.month === selectedPoint)?.x}
                y2="100"
                stroke="currentColor"
                strokeWidth="0.3"
                strokeDasharray="1 1"
                className="text-primary/30"
              />
            )}
          </svg>

          {/* Data points - HTML/CSS circles for perfect roundness */}
          {points.map(point => (
            <button
              key={point.month}
              onClick={() => onPointSelect(selectedPoint === point.month ? null : point.month)}
              className="absolute transition-all duration-200 hover:scale-110 cursor-pointer"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className={`rounded-full transition-all duration-200 ${
                  selectedPoint === point.month ? 'bg-primary scale-125' : 'bg-primary/60'
                }`}
                style={{
                  width: selectedPoint === point.month ? '16px' : '12px',
                  height: selectedPoint === point.month ? '16px' : '12px',
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* X-axis legend (months) at bottom - absolutely positioned to match dots */}
      <div className="relative h-4 mt-2 ml-8">
        {points.map((point, i) => {
          const shouldShow = i % legendInterval === 0 || i === monthlyData.length - 1;
          const isSelected = selectedPoint === point.month;
          return shouldShow ? (
            <button
              key={point.month}
              onClick={() => onPointSelect(isSelected ? null : point.month)}
              className={cn(
                'absolute text-xs transition-colors -translate-x-1/2 cursor-pointer',
                isSelected ? 'text-primary font-medium' : 'text-light hover:text-foreground',
              )}
              style={{ left: `${point.x}%` }}
            >
              {point.label}
            </button>
          ) : null;
        })}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { missions, isLoading: missionsLoading } = useMissions();
  const { homes } = useHomes();
  const { employeeName, isLoading: authLoading, findConciergerie } = useAuth();

  const [selectedConciergerie, setSelectedConciergerie] = useState<string | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string | null>(null);
  // Note: selectedTimePeriod is used for both the filter dropdown and graph selection

  const isLoading = authLoading || missionsLoading;

  // Filter to completed missions for this employee only (status is always "completed" for history)
  const completedMissions = useMemo(
    () =>
      missions.filter(
        m => m.status === 'completed' && (m.employeeId === employeeName || m.employeeId2 === employeeName),
      ),
    [missions, employeeName],
  );

  // Get month key from mission date (YYYY-MM format for sorting)
  const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  // Available conciergeries (filtered by selected time period if any)
  const availableConciergeries = useMemo(() => {
    let missionsToFilter = completedMissions;

    // If a time period is selected, only show conciergeries with missions in that period
    if (selectedTimePeriod) {
      missionsToFilter = completedMissions.filter(m => {
        const date = new Date(m.startDateTime);
        return getMonthKey(date) === selectedTimePeriod;
      });
    }

    return [...new Set(missionsToFilter.map(m => m.conciergerieName))].sort();
  }, [completedMissions, selectedTimePeriod]);

  // Available time periods (filtered by selected conciergerie if any)
  const availableTimePeriods = useMemo(() => {
    let missionsToFilter = completedMissions;

    // If a conciergerie is selected, only show periods with missions for that conciergerie
    if (selectedConciergerie) {
      missionsToFilter = completedMissions.filter(m => m.conciergerieName === selectedConciergerie);
    }

    const periods = new Set<string>();
    missionsToFilter.forEach(m => {
      const date = new Date(m.startDateTime);
      periods.add(getMonthKey(date));
    });
    // Sort from newest to oldest (descending)
    return Array.from(periods).sort((a, b) => b.localeCompare(a));
  }, [completedMissions, selectedConciergerie]);

  // Apply all filters
  const filteredMissions = useMemo(() => {
    let filtered = completedMissions;

    // Filter by conciergerie
    if (selectedConciergerie) {
      filtered = filtered.filter(m => m.conciergerieName === selectedConciergerie);
    }

    // Filter by time period (month)
    if (selectedTimePeriod) {
      filtered = filtered.filter(m => {
        const date = new Date(m.startDateTime);
        return getMonthKey(date) === selectedTimePeriod;
      });
    }

    return filtered;
  }, [completedMissions, selectedConciergerie, selectedTimePeriod]);

  // Stats based on filtered missions (recalculate)
  const stats = useMemo(() => {
    const totalHours = filteredMissions.reduce((sum, m) => sum + getMissionHoursPerProvider(m), 0);
    const uniqueHomes = new Set(filteredMissions.map(m => m.homeId)).size;
    const uniqueConciergeries = new Set(filteredMissions.map(m => m.conciergerieName)).size;
    return {
      missions: filteredMissions.length,
      hours: totalHours,
      homes: uniqueHomes,
      conciergeries: uniqueConciergeries,
    };
  }, [filteredMissions]);

  if (isLoading) return null;

  return (
    <div className="p-4 space-y-4">
      {/* Stats - recalculate based on filtered missions */}
      {filteredMissions.length > 0 && (
        <div className="flex gap-3">
          <StatCard
            label={stats.missions > 1 ? 'Missions' : 'Mission'}
            value={String(stats.missions)}
            icon={<IconBriefcase size={20} />}
          />
          <StatCard
            label={stats.hours > 1 ? 'Heures' : 'Heure'}
            value={formatNumber(stats.hours)}
            icon={<IconClock size={20} />}
          />
          <StatCard
            label={stats.homes > 1 ? 'Biens' : 'Bien'}
            value={formatNumber(stats.homes)}
            icon={<IconCalendar size={20} />}
          />
          <StatCard
            label={stats.conciergeries > 1 ? 'Conciergeries' : 'Conciergerie'}
            value={formatNumber(stats.conciergeries)}
            icon={<IconBuilding size={20} />}
          />
        </div>
      )}

      {/* Accordions: Graph and Filters */}
      {completedMissions.length > 0 && (
        <Accordion
          items={[
            {
              title: 'Graphique des heures',
              icon: <IconChartLine size={18} />,
              content: (
                <MonthlyHoursChart
                  missions={completedMissions}
                  selectedPoint={selectedTimePeriod}
                  onPointSelect={month => {
                    setSelectedConciergerie(null);
                    setSelectedTimePeriod(month);
                  }}
                  onReset={() => {
                    setSelectedTimePeriod(null);
                    setSelectedConciergerie(null);
                  }}
                />
              ),
            },
            {
              title: 'Filtres',
              icon: <IconFilter size={18} />,
              subtitle:
                filteredMissions.length > 0
                  ? `${filteredMissions.length} mission${filteredMissions.length > 1 ? 's' : ''}`
                  : undefined,
              content: (
                <HistoryFilters
                  availableConciergeries={availableConciergeries}
                  availableTimePeriods={availableTimePeriods}
                  selectedConciergerie={selectedConciergerie}
                  setSelectedConciergerie={setSelectedConciergerie}
                  selectedTimePeriod={selectedTimePeriod}
                  setSelectedTimePeriod={setSelectedTimePeriod}
                />
              ),
            },
          ]}
          variant="card"
          defaultOpenIndex={0}
        />
      )}

      {/* Mission list */}
      {filteredMissions.length === 0 ? (
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
          {filteredMissions.map(mission => {
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
