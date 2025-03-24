'use client';

import { useMissions } from '@/app/contexts/missionsProvider';
import { Conciergerie, HomeData } from '@/app/types/types';
import { getColorValueByName } from '@/app/utils/color';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type HomeCardProps = {
  home: HomeData;
  onClick: () => void;
  onEdit: () => void;
};

export default function HomeCard({ home, onClick, onEdit }: HomeCardProps) {
  // Get the conciergerie color from the home data
  const { getConciergerieByName } = useMissions();
  const [conciergerie, setConciergerie] = useState<Conciergerie>();
  const conciergerieColor = getColorValueByName(conciergerie?.colorName);

  // Fetch conciergerie data when home changes
  useEffect(() => {
    const conciergerieData = getConciergerieByName(home.conciergerieName);
    setConciergerie(conciergerieData);
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
        <h3 className="text-xl font-medium text-foreground">
          {home.title} ({home.geographicZone})
        </h3>
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
    </div>
  );
}
