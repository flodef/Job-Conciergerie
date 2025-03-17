'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useMissions } from '../../contexts/missionsProvider';
import { Conciergerie, HomeData } from '../../types/types';
import { formatDateTime } from '../../utils/dateUtils';
import { getColorValueByName } from '../../utils/welcomeParams';

type HomeCardProps = {
  home: HomeData;
  onClick: () => void;
  onEdit: () => void;
};

export default function HomeCard({ home, onClick, onEdit }: HomeCardProps) {
  // Get the conciergerie color from the home data
  const { getConciergerieByName } = useMissions();
  const [conciergerie, setConciergerie] = useState<Conciergerie | null>(null);
  const conciergerieColor = getColorValueByName(conciergerie?.colorName);
  
  // Fetch conciergerie data when home changes
  useEffect(() => {
    const loadConciergerieData = async () => {
      try {
        const conciergerieData = await getConciergerieByName(home.conciergerieName);
        setConciergerie(conciergerieData);
      } catch (error) {
        console.error(`Error fetching conciergerie ${home.conciergerieName}:`, error);
      }
    };
    
    loadConciergerieData();
  }, [home.conciergerieName, getConciergerieByName]);

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
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={home.images[0]}
            alt={home.title}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            className="object-cover"
          />
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
          <span>Modifié le {formatDateTime(home.modifiedDate)}</span>
        </div>
      </div>
    </div>
  );
}
