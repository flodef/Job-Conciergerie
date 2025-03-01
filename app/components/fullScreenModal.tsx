'use client';

import { ReactNode } from 'react';

type FullScreenModalProps = {
  children: ReactNode;
  onClose: () => void;
};

export default function FullScreenModal({ children, onClose }: FullScreenModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-4 right-4 text-foreground text-4xl hover:scale-110 transition-transform"
          onClick={onClose}
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}
