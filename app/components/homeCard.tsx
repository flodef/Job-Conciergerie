'use client';

import Image from 'next/image';
import { HomeData } from '../types/mission';

type HomeCardProps = {
  home: HomeData;
  onClick: () => void;
};

export default function HomeCard({ home, onClick }: HomeCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Get the conciergerie color from the home data
  const conciergerieColor = home.conciergerie?.color || 'var(--color-primary)';

  return (
    <div
      className="bg-background p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
      onClick={onClick}
      style={{ borderLeft: `6px solid ${conciergerieColor}` }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-foreground">{home.title}</h3>
      </div>

      {home.images && home.images.length > 0 && (
        <div className="relative h-32 w-full mb-2 rounded-lg overflow-hidden">
          <Image
            src={home.images[0]}
            alt={home.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <p className="text-sm text-gray-500 line-clamp-2 mb-2">{home.description}</p>

      <div className="flex flex-wrap gap-1 mt-2">
        {home.tasks.slice(0, 3).map((task, index) => (
          <span
            key={index}
            className="px-2 py-0.5 text-foreground rounded-full text-xs"
            style={{ backgroundColor: conciergerieColor }}
          >
            {task}
          </span>
        ))}
        {home.tasks.length > 3 && (
          <span className="px-2 py-0.5 bg-default/10 text-foreground rounded-full text-xs">
            +{home.tasks.length - 3}
          </span>
        )}
      </div>

      <div className="mt-3 text-sm text-gray-500">
        <div className="flex justify-between items-center">
          <span>Modifié: {formatDate(home.modifiedDate)}</span>
          <span style={{ color: conciergerieColor }}>{home.conciergerie.name}</span>
        </div>
      </div>
    </div>
  );
}
