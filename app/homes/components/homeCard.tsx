'use client';

import { Home } from '@/app/types/dataTypes';
import { fallbackImage, getStorageImageUrl } from '@/app/utils/storage';
import React from 'react';

type HomeCardProps = {
  home: Home;
  onClick: () => void;
  onEdit: () => void;
  displayMode?: 'list' | 'grid' | 'thumb';
};

// Separate component to prevent re-mounting when parent re-renders
// Memoized to prevent re-renders when parent state changes
const HomeImage = React.memo(function HomeImage({
  home,
  altText,
  className,
}: {
  home: Home;
  altText: string;
  className?: string;
}) {
  return (
    <img
      src={
        home.images && home.images.length > 0
          ? getStorageImageUrl(home.images[0], { width: 400, quality: 80 })
          : fallbackImage
      }
      alt={altText}
      className={`object-cover w-full h-full ${className ?? ''}`}
      onError={e => {
        (e.target as HTMLImageElement).src = fallbackImage;
      }}
    />
  );
});

// Memoized HomeCard to prevent re-renders when parent state changes
const HomeCard = React.memo(function HomeCard({ home, onClick, onEdit, displayMode = 'thumb' }: HomeCardProps) {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onEdit();
  };

  switch (displayMode) {
    case 'list':
      return (
        <div
          className="flex items-center justify-between p-2 border-b border-secondary last:border-b-0 cursor-pointer"
          onClick={onClick}
          onContextMenu={handleContextMenu}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative w-8 h-8 overflow-hidden rounded-md shrink-0">
              <HomeImage home={home} altText={`Miniature de ${home.title}`} />
            </div>
            <span className="text-foreground font-medium truncate">{home.title}</span>
          </div>
          <span className="text-light text-sm shrink-0">{home.geographicZone}</span>
        </div>
      );
    case 'grid':
      return (
        <div
          className="relative w-full aspect-square overflow-hidden rounded-lg cursor-pointer border border-gray-200"
          onClick={onClick}
          onContextMenu={handleContextMenu}
        >
          <HomeImage home={home} altText={`Photo de ${home.title}`} className="rounded-md" />
        </div>
      );
    case 'thumb':
    default:
      return (
        <div
          className="bg-background p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200 flex flex-col"
          onClick={onClick}
          onContextMenu={handleContextMenu}
        >
          <h3 className="text-xl font-medium text-foreground overflow-hidden max-w-full mb-4">{`${home.title} (${home.geographicZone})`}</h3>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg mt-auto">
            <HomeImage home={home} altText={`Photo de ${home.title}`} className="rounded-md" />
          </div>
        </div>
      );
  }
});

export default HomeCard;
