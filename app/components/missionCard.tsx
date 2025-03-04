'use client';

import { Mission } from '../types/types';

type MissionCardProps = {
  mission: Mission;
  onClick: () => void;
  onEdit?: () => void;
};

export default function MissionCard({ mission, onClick, onEdit }: MissionCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Get the conciergerie color from the mission data
  const conciergerieColor = mission.conciergerie?.color || 'var(--color-default)';
  const isTaken = !!mission.employee;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the default context menu
    if (onEdit) {
      onEdit();
    }
  };

  return (
    <div
      className={`relative bg-background p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200 ${
        isTaken ? 'opacity-50' : ''
      }`}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      style={{ borderLeft: `6px solid ${conciergerieColor}` }}
    >
      {/* Diagonal label for taken missions */}
      {isTaken && (
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
            {mission.employee?.name}
          </div>
        </div>
      )}

      <h3 className="font-medium text-foreground">{mission.home.title}</h3>

      <div className="flex flex-wrap gap-1 mt-2">
        {mission.objectives.map(objective => (
          <span
            key={objective}
            className="px-2 py-0.5 bg-default/10 text-foreground rounded-full text-xs"
            style={{ backgroundColor: conciergerieColor }}
          >
            {objective}
          </span>
        ))}
      </div>

      <div className="mt-3 text-sm text-light">
        <div className="flex justify-between items-center">
          <span>Date: {formatDate(mission.date)}</span>
        </div>
      </div>
    </div>
  );
}
