'use client';

import { ReactNode } from 'react';
import CloseButton from './closeButton';
import { clsx } from 'clsx/lite';
import Image from 'next/image';

type FullScreenModalProps = {
  children?: ReactNode;
  onClose: () => void;
  className?: string;
  imageUrl?: string;
  title: string;
};

export default function FullScreenModal({ children, onClose, className = '', imageUrl, title }: FullScreenModalProps) {
  const handleBackdropClick = () => {
    if (imageUrl) onClose();
  };

  return (
    <div
      className={clsx(
        'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4',
        className,
      )}
      onClick={handleBackdropClick}
    >
      {imageUrl ? (
        <>
          <CloseButton onClose={onClose} className="absolute top-4 right-4 text-white z-10" />
          <div className="relative w-full h-[80vh]">
            <Image src={imageUrl} alt={title} fill sizes="100vw" className="object-contain" priority />
          </div>
        </>
      ) : (
        <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full flex flex-col max-h-[90vh]">
          {/* Fixed header with title and close button */}
          <div className="sticky top-0 z-10 bg-background p-4 border-b border-secondary flex justify-between items-center rounded-t-lg">
            <h2 className="text-xl font-bold">{title}</h2>
            <CloseButton onClose={onClose} />
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">{children}</div>

          {/* The FormActions component will be rendered as part of children, 
              but will be positioned at the bottom if it has the className="sticky bottom-0" */}
        </div>
      )}
    </div>
  );
}
