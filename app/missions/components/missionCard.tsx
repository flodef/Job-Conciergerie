'use client';

import HomeTitle from '@/app/components/homeTitle';
import { getUserKey, useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { Conciergerie, Mission } from '@/app/types/dataTypes';
import { getColorValueByName } from '@/app/utils/color';
import { formatDateRange } from '@/app/utils/date';
import { getEmployeeFullName } from '@/app/utils/employee';
import { formatHour, getMissionProviderCount } from '@/app/utils/task';
import { useEffect, useState } from 'react';

type MissionCardProps = {
  mission: Mission;
  onClick: () => void;
  onEdit: () => void;
};

export default function MissionCard({ mission, onClick, onEdit }: MissionCardProps) {
  const { findConciergerie, findEmployee, isConciergerie } = useAuth();
  const { homes } = useHomes();
  const [conciergerie, setConciergerie] = useState<Conciergerie>();

  const home = homes.find(h => h.id === mission.homeId);
  const conciergerieColor = getColorValueByName(conciergerie?.colorName);
  const employee = findEmployee(mission.employeeId);
  const employee2 = findEmployee(mission.employeeId2) || findConciergerie(mission.employeeId2);
  const providerCount = getMissionProviderCount(mission);

  // Check if mission is fully accepted
  const isFullyAccepted = home?.allowDuo ? providerCount === 2 : providerCount === 1;

  // Get reserved employees (excluding those who have already accepted the mission)
  const reservedEmployees = mission.allowedEmployees
    ?.filter(id => id !== mission.employeeId && id !== mission.employeeId2)
    .map(findEmployee)
    .map(employee => employee && getEmployeeFullName(employee, true));

  // Fetch conciergerie data when mission changes
  useEffect(() => {
    const conciergerieData = findConciergerie(home?.conciergerieName ?? null);
    setConciergerie(conciergerieData);
  }, [home?.conciergerieName, findConciergerie]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the default context menu
    if (onEdit) {
      onEdit();
    }
  };

  if (!home) return null;

  return (
    <div
      className={`relative bg-background p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200 ${
        employee ? 'opacity-50' : ''
      }`}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      style={{ borderLeft: `6px solid ${conciergerieColor}` }}
    >
      <div
        className="absolute top-0 right-0 w-14 h-14 flex items-center justify-center overflow-hidden"
        aria-label={`${mission.hours} heures`}
      >
        <div
          className="absolute top-0 right-0 w-0 h-0 border-t-56 border-l-56 border-t-[conciergerieColor] border-l-transparent rounded-tr-lg"
          style={{
            borderTopColor: conciergerieColor,
            borderLeftColor: 'transparent',
          }}
        ></div>
        <span className="absolute top-2 right-1 w-7 text-xs text-center font-bold text-background z-10">
          {formatHour(mission.hours)}
        </span>
      </div>

      {/* Diagonal label for taken missions */}
      {employee && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center"
          aria-hidden="true"
        >
          <div
            className="absolute text-sm font-bold text-foreground bg-secondary/70 px-1 py-0.5 uppercase tracking-wider whitespace-nowrap"
            style={{
              transform: 'rotate(15deg) scale(0.9)',
              transformOrigin: 'center',
              width: '140%',
              textAlign: 'center',
            }}
          >
            {getUserKey(employee)}
            {employee2 && ` + ${getUserKey(employee2)}`}
          </div>
        </div>
      )}

      {/* Binôme status badge */}
      {home.allowDuo && <div className="absolute top-0 left-0 font-bold px-1 py-1">{providerCount}/2</div>}

      <div className="mx-3 text-center">
        <HomeTitle home={home} />
      </div>

      <div className="flex flex-wrap gap-1 mt-2">
        {mission.tasks.map(task => (
          <span
            key={mission.id + task}
            className="px-2 py-0.5 text-background font-bold rounded-full text-xs"
            style={{ backgroundColor: conciergerieColor }}
          >
            {task}
          </span>
        ))}
      </div>

      <div className="mt-3 text-sm text-light">
        <div className="flex justify-between items-center">
          <span>{formatDateRange(new Date(mission.startDateTime), new Date(mission.endDateTime))}</span>
        </div>
        {isConciergerie && reservedEmployees?.length && !isFullyAccepted && (
          <div className="flex items-center gap-1 mt-1 truncate">
            <span className="font-medium">Réservé à :</span>
            <span className="truncate">{reservedEmployees.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
