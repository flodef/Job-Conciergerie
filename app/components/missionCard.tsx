'use client';

import { Mission } from '../types/mission';

type MissionCardProps = {
  mission: Mission;
  onClick: () => void;
};

export default function MissionCard({ mission, onClick }: MissionCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div
      className="bg-background p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
      onClick={onClick}
    >
      <h3 className="font-medium text-foreground">{mission.home.title}</h3>

      <div className="flex flex-wrap gap-1 mt-2">
        {mission.objectives.map(objective => (
          <span key={objective} className="px-2 py-0.5 bg-default/10 text-foreground rounded-full text-xs">
            {objective}
          </span>
        ))}
      </div>

      <div className="mt-3 text-sm text-gray-500">
        <div className="flex justify-between items-center">
          <span>Date: {formatDate(mission.date)}</span>
          {mission.employee && <span className="text-blue-600">{mission.employee.name}</span>}
        </div>
      </div>
    </div>
  );
}
