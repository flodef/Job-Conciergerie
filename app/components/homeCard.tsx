'use client';

import Image from 'next/image';
import { HomeData } from '../types/types';

type HomeCardProps = {
  home: HomeData;
  onClick: () => void;
  onEdit?: () => void;
};

export default function HomeCard({ home, onClick, onEdit }: HomeCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Get the conciergerie color from the home data
  const conciergerieColor = home.conciergerie?.color || 'var(--color-primary)';

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the default context menu
    if (onEdit) {
      onEdit();
    }
  };

  return (
    <div
      className="bg-background p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
      onClick={onClick}
      onContextMenu={handleContextMenu}
      style={{ borderLeft: `6px solid ${conciergerieColor}` }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-foreground">{home.title}</h3>
      </div>

      {home.images && home.images.length > 0 && (
        <div className="relative h-32 w-full mb-2 rounded-lg overflow-hidden">
          <Image src={home.images[0]} alt={home.title} fill className="object-cover" />
        </div>
      )}

      <p className="text-sm text-light line-clamp-2 mb-2">{home.description}</p>

      <ul className="list-none pl-0 space-y-1 mb-2">
        {home.tasks.slice(0, 3).map((task, index) => (
          <li key={index} className="flex items-start">
            <span
              className="inline-block w-2 h-2 mt-1 mr-2 flex-shrink-0 border border-foreground"
              style={{ borderColor: 'var(--color-foreground)' }}
            />
            <span className="text-xs text-foreground truncate">{task}</span>
          </li>
        ))}
        {home.tasks.length > 3 && <li className="text-xs text-light ml-4">+{home.tasks.length - 3} autres tâches</li>}
      </ul>

      <div className="mt-3 text-sm text-light">
        <div className="flex justify-between items-center">
          <span>Modifié: {formatDate(home.modifiedDate)}</span>
          <span style={{ color: conciergerieColor }}>{home.conciergerie.name}</span>
        </div>
      </div>
    </div>
  );
}
