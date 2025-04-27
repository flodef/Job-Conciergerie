'use client';

import { getIPFSImageUrl } from '@/app/utils/ipfs';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LoadingSpinner from './loadingSpinner';

interface ImageCarouselProps {
  imageUrls: string | string[];
  altPrefix: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  initialIndex?: number;
  onCurrentImageIndexChange?: (index: number) => void;
}

export default function ImageCarousel({
  imageUrls,
  altPrefix = 'Image',
  initialIndex = 0,
  onCurrentImageIndexChange,
  className = '',
}: ImageCarouselProps) {
  // State management
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);

  // Track preloaded images
  const preloadedImages = useRef<Set<string>>(new Set());

  // Convert imageUrls to array
  const images = useMemo(() => (Array.isArray(imageUrls) ? imageUrls : [imageUrls]), [imageUrls]);

  // URL helper function
  const getUrl = useCallback((url: string) => {
    return url.startsWith('http') || url.startsWith('/') || url.includes('.') ? url : getIPFSImageUrl(url);
  }, []);

  // Initialize index
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Preload images
  const preloadImage = useCallback((url: string): Promise<void> => {
    return new Promise(resolve => {
      if (preloadedImages.current.has(url)) {
        // Already preloaded
        resolve();
        return;
      }

      // Use HTMLImageElement instead of the global Image constructor
      const img = document.createElement('img');
      img.onload = () => {
        preloadedImages.current.add(url);
        resolve();
      };
      img.onerror = () => {
        // Even if there's an error, mark as "preloaded" to avoid infinite retries
        preloadedImages.current.add(url);
        resolve();
      };
      img.src = url;
    });
  }, []);

  // Aggressively preload current and adjacent images
  useEffect(() => {
    if (!images.length) return;

    const loadCurrentImage = async () => {
      // Don't set isLoading here - it's now set by the navigation functions
      // Reset spinner state
      setShowSpinner(false);

      // Only show spinner after delay
      const timer = setTimeout(() => {
        // Check if we're still loading by seeing if the image is in the preloaded set
        const currentUrl = getUrl(images[currentIndex]);
        if (!preloadedImages.current.has(currentUrl)) {
          setShowSpinner(true);
        }
      });

      try {
        // Preload current image
        const currentUrl = getUrl(images[currentIndex]);
        await preloadImage(currentUrl);

        // Preload next and previous images in background
        const nextIndex = (currentIndex + 1) % images.length;
        const prevIndex = (currentIndex - 1 + images.length) % images.length;

        Promise.all([preloadImage(getUrl(images[nextIndex])), preloadImage(getUrl(images[prevIndex]))]);
      } finally {
        setIsLoading(false);
        clearTimeout(timer);
      }
    };

    loadCurrentImage();
  }, [currentIndex, images, getUrl, preloadImage, isLoading]);

  // Navigation functions - explicitly set loading state
  const goToNext = () => {
    // First set loading to true to trigger spinner
    setIsLoading(true);

    // Then update the index
    setCurrentIndex(prev => (prev + 1) % images.length);
  };

  const goToPrevious = () => {
    // First set loading to true to trigger spinner
    setIsLoading(true);

    // Then update the index
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  };

  const goToIndex = (index: number) => {
    if (index !== currentIndex) {
      // First set loading to true to trigger spinner
      setIsLoading(true);

      // Then update the index
      setCurrentIndex(index);
    }
  };

  if (!images || images.length === 0) return null;

  // Get URL for current image
  const currentImageUrl = getUrl(images[currentIndex]);

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center ${className}`}
      onClick={() => onCurrentImageIndexChange?.(currentIndex)}
    >
      <div className="w-full h-full overflow-hidden relative">
        {/* Only render image if it's been preloaded */}
        {preloadedImages.current.has(currentImageUrl) && (
          <Image
            key={`image-${currentIndex}`}
            src={currentImageUrl}
            alt={`${altPrefix} ${currentIndex + 1}`}
            fill
            className="object-contain rounded-lg"
            sizes="100vw"
            priority
          />
        )}

        {/* Loading spinner */}
        {showSpinner && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <LoadingSpinner />
          </div>
        )}
      </div>

      {/* Navigation controls */}
      {images.length > 1 && (
        <>
          <button
            onClick={e => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 p-1 rounded-full bg-black/50 hover:bg-black/75 text-foreground transition-colors z-20"
            aria-label="Image précédente"
          >
            <IconChevronLeft className="text-white" size={32} />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 p-1 rounded-full bg-black/50 hover:bg-black/75 text-foreground transition-colors z-20"
            aria-label="Image suivante"
          >
            <IconChevronRight className="text-white" size={32} />
          </button>
          <div className="absolute bottom-4 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={e => {
                  e.stopPropagation();
                  goToIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-colors z-20 ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
                aria-label={`Aller à l&apos;image ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
