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
  imageAlt?: string;
};

export default function FullScreenModal({
  children,
  onClose,
  className = '',
  imageUrl,
  imageAlt = 'Prévisualisation plein écran',
}: FullScreenModalProps) {
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
            <Image src={imageUrl} alt={imageAlt} fill sizes="100vw" className="object-contain" priority />
          </div>
        </>
      ) : (
        <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <CloseButton onClose={onClose} className="absolute top-4 right-4" />
          {children}
        </div>
      )}
    </div>
  );
}
