'use client';

import { useMissions } from '@/app/contexts/missionsProvider';
import { Conciergerie, Mission } from '@/app/types/types';
import { getColorValueByName } from '@/app/utils/color';
import { formatDateRange } from '@/app/utils/date';
import { useEffect, useState } from 'react';

type MissionCardProps = {
  mission: Mission;
  onClick: () => void;
  onEdit: () => void;
};

export default function MissionCard({ mission, onClick, onEdit }: MissionCardProps) {
  const { getHomeById, getEmployeeById, getConciergerieByName } = useMissions();
  const [conciergerie, setConciergerie] = useState<Conciergerie>();

  const home = getHomeById(mission.homeId);
  const conciergerieColor = getColorValueByName(conciergerie?.colorName);
  const employee = getEmployeeById(mission.employeeId);

  // Fetch conciergerie data when mission changes
  useEffect(() => {
    const conciergerieData = getConciergerieByName(home?.conciergerieName || '');
    setConciergerie(conciergerieData);
  }, [getConciergerieByName, home?.conciergerieName]);

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
            {employee.firstName} {employee.familyName}
          </div>
        </div>
      )}

      <h3 className="font-medium text-foreground">{`${home.title} (${home.geographicZone})`}</h3>

      <div className="flex flex-wrap gap-1 mt-2">
        {mission.tasks.map(task => (
          <span
            key={mission.id + task.label}
            className="px-2 py-0.5 text-background rounded-full text-xs"
            style={{ backgroundColor: conciergerieColor }}
          >
            {task.label}
          </span>
        ))}
      </div>

      <div className="mt-3 text-sm text-light">
        <div className="flex justify-between items-center">
          <span>{formatDateRange(new Date(mission.startDateTime), new Date(mission.endDateTime))}</span>
        </div>
      </div>
    </div>
  );
}
