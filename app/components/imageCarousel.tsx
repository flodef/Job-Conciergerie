'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { getIPFSImageUrl } from '@/app/utils/ipfs';

interface ImageCarouselProps {
  imageUrls: string | string[];
  altPrefix: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  startIndex?: number;
}

export default function ImageCarousel({
  imageUrls,
  altPrefix,
  className = '',
  onClick,
  startIndex = 0,
}: ImageCarouselProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(startIndex);

  useEffect(() => {
    setCurrentImageIndex(startIndex);
  }, [startIndex]);

  const handleNextImage = () => {
    const images = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
    setCurrentImageIndex(prev => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    const images = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
    setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
  };

  const images = Array.isArray(imageUrls) ? imageUrls : [imageUrls];

  if (!images || images.length === 0) return null;

  // Function to determine if a URL is a normal image or IPFS CID
  const getImageUrl = (url: string) =>
    url.startsWith('http') || url.startsWith('/') || url.includes('.') ? url : getIPFSImageUrl(url);

  const currentImageUrl = getImageUrl(images[currentImageIndex]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className}`} onClick={onClick}>
      <div className="w-full h-full flex overflow-hidden relative">
        <div key={`${images[currentImageIndex]}-${currentImageIndex}`} className="w-full h-full flex-shrink-0 relative">
          <Image
            src={currentImageUrl}
            alt={`${altPrefix} ${currentImageIndex + 1}`}
            fill
            className="object-contain rounded-lg"
            sizes="100vw"
            priority
            onError={e => console.error(`Error loading image ${currentImageIndex}:`, currentImageUrl, e)}
          />
        </div>
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={e => {
              e.stopPropagation();
              handlePrevImage();
            }}
            className="absolute left-4 p-1 rounded-full bg-black/50 hover:bg-black/75 text-foreground transition-colors"
            aria-label="Image précédente"
          >
            <IconChevronLeft className="text-white" size={32} />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              handleNextImage();
            }}
            className="absolute right-4 p-1 rounded-full bg-black/50 hover:bg-black/75 text-foreground transition-colors"
            aria-label="Image suivante"
          >
            <IconChevronRight className="text-white" size={32} />
          </button>
          <div className="absolute bottom-4 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                onClick={e => {
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                aria-label={`Aller à l'image ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
