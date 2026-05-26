'use client';

import { CloseButton } from '@/app/components/button';
import ImageCarousel from '@/app/components/imageCarousel';
import { cn } from '@/app/utils/className';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const content = (
    <div
      className={cn(
        'fixed inset-0 bg-black/90 backdrop-blur-sm z-100 flex items-center justify-center py-4',
        className,
      )}
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <CloseButton size={32} onClose={onClose} className="absolute top-4 right-4 text-white" />
      <ImageCarousel
        imageUrls={imageUrls}
        altPrefix={altPrefix}
        className="w-full h-[90vh]"
        initialIndex={initialIndex}
      />
    </div>
  );

  if (!mounted) return null;

  return createPortal(content, document.body);
}
