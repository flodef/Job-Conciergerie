'use client';

import { CloseButton } from '@/app/components/button';
import ImageCarousel from '@/app/components/imageCarousel';
import clsx from 'clsx/lite';

interface FullScreenImageCarouselProps {
  imageUrls: string | string[];
  altPrefix: string;
  initialIndex?: number;
  onClose: () => void;
  className?: string;
}

export function FullScreenImageCarousel({
  imageUrls,
  altPrefix,
  initialIndex = 0,
  onClose,
  className = '',
}: FullScreenImageCarouselProps) {
  return (
    <div
      className={clsx(
        'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center py-4',
        className,
      )}
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <CloseButton size={32} onClose={onClose} className="absolute top-4 right-4 text-white z-10" />
      <ImageCarousel
        imageUrls={imageUrls}
        altPrefix={altPrefix}
        className="w-full h-[80vh]"
        initialIndex={initialIndex}
      />
    </div>
  );
}
