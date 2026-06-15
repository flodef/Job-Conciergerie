'use client';

import type { Home } from '@/app/types/dataTypes';
import { fallbackImage, getStorageImageUrl } from '@/app/utils/storage';
import { IconFileDescription, IconPencil, IconUsers } from '@tabler/icons-react';
import { useImageCache } from '@/app/hooks/useImageCache';
import HomeTitle from '@/app/components/homeTitle';
import React, { useMemo } from 'react';

type HomeCardProps = {
  home: Home;
  onClick: () => void;
  onEdit: () => void;
  onNotesClick: () => void;
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
  const imageUrl = useMemo(
    () =>
      home.images && home.images.length > 0
        ? getStorageImageUrl(home.images[0], { width: 400, quality: 80 })
        : fallbackImage,
    [home.images],
  );
  const { getCachedUrl } = useImageCache([imageUrl]);
  const cachedUrl = getCachedUrl(imageUrl);

  return (
    <img
      src={cachedUrl}
      alt={altText}
      className={`object-cover w-full h-full ${className ?? ''}`}
      onError={e => {
        (e.target as HTMLImageElement).src = fallbackImage;
      }}
    />
  );
});

// Memoized HomeCard to prevent re-renders when parent state changes
const HomeCard = React.memo(function HomeCard({
  home,
  onClick,
  onEdit,
  onNotesClick,
  displayMode = 'thumb',
}: HomeCardProps) {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onEdit();
  };

  const handleNotesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNotesClick();
  };

  switch (displayMode) {
    case 'list':
      return (
        <div
          className="flex items-center justify-between p-1 border-b border-secondary last:border-b-0 cursor-pointer"
          onClick={onClick}
          onContextMenu={handleContextMenu}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative w-8 h-8 overflow-hidden rounded-md shrink-0">
              <HomeImage home={home} altText={`Miniature de ${home.title}`} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {home.allowDuo && <IconUsers size={20} />}
                <span className="text-foreground font-medium truncate">{home.title}</span>
              </div>
              <span className="text-light text-sm">{home.geographicZone}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleNotesClick}
            className="p-1 hover:bg-secondary rounded cursor-pointer shrink-0"
            title={home.notes ? 'Voir les notes' : 'Ajouter des notes'}
          >
            {home.notes ? <IconFileDescription size={20} /> : <IconPencil size={20} />}
          </button>
        </div>
      );
    case 'grid':
      return (
        <div
          className="relative w-full aspect-square overflow-hidden rounded-lg cursor-pointer border border-gray-200"
          onClick={onClick}
          onContextMenu={handleContextMenu}
        >
          {home.allowDuo && (
            <IconUsers size={24} className="absolute top-0 left-0 p-1 bg-white/80 rounded text-black" />
          )}
          <button
            type="button"
            onClick={handleNotesClick}
            className="absolute top-0 right-0 p-0.5 bg-white/80 rounded text-black cursor-pointer"
            title={home.notes ? 'Voir les notes' : 'Ajouter des notes'}
          >
            {home.notes ? <IconFileDescription size={24} /> : <IconPencil size={24} />}
          </button>
          <HomeImage home={home} altText={`Photo de ${home.title}`} className="rounded-md" />
        </div>
      );
    case 'thumb':
    default:
      return (
        <div
          className="bg-background p-2 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200 flex flex-col"
          onClick={onClick}
          onContextMenu={handleContextMenu}
        >
          <HomeTitle home={home} />

          <div className="relative aspect-video w-full overflow-hidden rounded-lg mt-auto">
            <button
              type="button"
              onClick={handleNotesClick}
              className="absolute top-0 right-0 p-1 bg-white/80 rounded text-black cursor-pointer"
              title={home.notes ? 'Voir les notes' : 'Ajouter des notes'}
            >
              {home.notes ? <IconFileDescription size={20} /> : <IconPencil size={20} />}
            </button>
            <HomeImage home={home} altText={`Photo de ${home.title}`} className="rounded-md" />
          </div>
        </div>
      );
  }
});

export default HomeCard;
