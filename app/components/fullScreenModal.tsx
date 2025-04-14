'use client';

import { clsx } from 'clsx/lite';
import { ReactNode } from 'react';
import ImageCarousel from '@/app/components/imageCarousel';
import { CloseButton } from '@/app/components/button';

interface FullScreenModalProps {
  title: string;
  children?: ReactNode;
  onClose: () => void;
  className?: string;
  imageData?: {
    urls: string | string[];
    startIndex?: number;
  };
  footer?: ReactNode;
  disabled?: boolean;
}

export default function FullScreenModal({
  title,
  children,
  onClose,
  className,
  imageData,
  footer,
  disabled,
}: FullScreenModalProps) {
  const handleBackdropClick = () => {
    if (imageData) onClose();
  };

  const hasImages =
    imageData && imageData.urls && (Array.isArray(imageData.urls) ? imageData.urls.length > 0 : !!imageData.urls);

  return (
    <div
      className={clsx(
        'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4',
        disabled && 'pointer-events-none opacity-50 cursor-not-allowed',
        className,
      )}
      onClick={handleBackdropClick}
    >
      {hasImages ? (
        <>
          <CloseButton onClose={onClose} className="absolute top-4 right-4 text-white z-10" />
          <ImageCarousel
            imageUrls={imageData.urls}
            altPrefix={title}
            className="w-full h-[80vh]"
            startIndex={imageData.startIndex || 0}
          />
        </>
      ) : (
        <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full flex flex-col max-h-[90vh]">
          {/* Fixed header with title and close button */}
          <div className="sticky top-0 z-10 bg-background p-4 border-b border-secondary flex justify-between items-center rounded-t-lg">
            <h2 className="text-xl font-bold overflow-hidden">{title}</h2>
            <CloseButton onClose={onClose} />
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">{children}</div>

          {/* The FormActions component will be rendered as part of children, 
              but will be positioned at the bottom if it has the className="sticky bottom-0" */}
          {footer}
        </div>
      )}
    </div>
  );
}
