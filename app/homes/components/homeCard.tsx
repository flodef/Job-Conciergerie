'use client';

import { Home } from '@/app/types/dataTypes';
import { fallbackImage, getIPFSImageUrl } from '@/app/utils/ipfs';
import Image from 'next/image';

type HomeCardProps = {
  home: Home;
  onClick: () => void;
  onEdit: () => void;
  displayMode?: 'list' | 'grid' | 'thumb';
};

export default function HomeCard({ home, onClick, onEdit, displayMode = 'thumb' }: HomeCardProps) {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onEdit();
  };

  const HomeImage = ({ altText, sizes, className }: { altText: string; sizes: string; className: string }) => (
    <Image
      src={home.images && home.images.length > 0 ? getIPFSImageUrl(home.images[0]) : fallbackImage}
      alt={altText}
      fill
      sizes={sizes}
      className={className}
      onError={e => {
        (e.target as HTMLImageElement).src = fallbackImage;
      }}
      priority
    />
  );

  const renderContent = () => {
    switch (displayMode) {
      case 'list':
        return (
          <div
            className="flex items-center justify-between p-2 border-b border-secondary last:border-b-0 cursor-pointer"
            onClick={onClick}
            onContextMenu={handleContextMenu}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative w-8 h-8 overflow-hidden rounded-md flex-shrink-0">
                <HomeImage altText={`Miniature de ${home.title}`} sizes="32px" className="object-cover" />
              </div>
              <span className="text-foreground font-medium truncate">{home.title}</span>
            </div>
            <span className="text-light text-sm flex-shrink-0">{home.geographicZone}</span>
          </div>
        );
      case 'grid':
        return (
          <div
            className="relative w-full aspect-square overflow-hidden rounded-lg cursor-pointer border border-gray-200"
            onClick={onClick}
            onContextMenu={handleContextMenu}
          >
            <HomeImage
              altText={`Photo de ${home.title}`}
              sizes="(max-width: 768px) 100vw, 300px"
              className="object-cover rounded-md"
            />
          </div>
        );
      case 'thumb':
      default:
        return (
          <div
            className="bg-background p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
            onClick={onClick}
            onContextMenu={handleContextMenu}
          >
            <h3 className="text-xl font-medium text-foreground overflow-hidden max-w-full">{`${home.title} (${home.geographicZone})`}</h3>

            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <HomeImage
                altText={`Photo de ${home.title}`}
                sizes="(max-width: 768px) 100vw, 300px"
                className="object-cover rounded-md"
              />
            </div>
          </div>
        );
    }
  };

  return renderContent();
}
