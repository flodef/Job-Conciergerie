'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { Conciergerie, Home } from '@/app/types/dataTypes';
import { getColorValueByName } from '@/app/utils/color';
import { fallbackImage, getIPFSImageUrl } from '@/app/utils/ipfs';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type HomeCardProps = {
  home: Home;
  onClick: () => void;
  onEdit: () => void;
};

export default function HomeCard({ home, onClick, onEdit }: HomeCardProps) {
  // Get the conciergerie color from the home data
  const { conciergeries } = useAuth();
  const [conciergerie, setConciergerie] = useState<Conciergerie>();
  const conciergerieColor = getColorValueByName(conciergerie?.colorName);

  // Fetch conciergerie data when home changes
  useEffect(() => {
    const conciergerieData = conciergeries.find(c => c.name === home.conciergerieName);
    setConciergerie(conciergerieData);
  }, [home.conciergerieName, conciergeries]);

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
      <h3 className="text-xl font-medium text-foreground overflow-hidden max-w-full">{`${home.title} (${home.geographicZone})`}</h3>

      {home.images && home.images.length > 0 && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={getIPFSImageUrl(home.images[0])}
            alt={`Photo de ${home.title}`}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            className="object-cover rounded-md"
            onError={e => {
              // Fallback to mockup
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
            priority
          />
        </div>
      )}
    </div>
  );
}
