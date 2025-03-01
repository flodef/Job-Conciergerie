'use client';

import { clsx } from 'clsx/lite';
import { IconBuildingEstate, IconUser } from '@tabler/icons-react';

type UserTypeSelectionProps = {
  onSelect: (type: string) => void;
};

export default function UserTypeSelection({ onSelect }: UserTypeSelectionProps) {
  return (
    <div className="bg-background p-8">
      <h1 className="text-2xl font-bold text-center mb-8">Bienvenue sur Job Conciergerie</h1>

      <div className="space-y-6">
        <p className="text-center text-foreground/80 mb-4">Je suis un(e)...</p>

        <div className="grid grid-cols-2 gap-4">
          {/* Conciergerie Option */}
          <button
            onClick={() => onSelect('conciergerie')}
            className={clsx(
              'flex flex-col items-center justify-center p-6 gap-4 border-2 rounded-lg transition-all',
              'border-secondary hover:border-primary/50 hover:bg-primary/5'
            )}
          >
            <IconBuildingEstate className="w-8 h-8" />
            <span className="text-center font-medium">Conciergerie</span>
          </button>

          {/* Prestataire Option */}
          <button
            onClick={() => onSelect('prestataire')}
            className={clsx(
              'flex flex-col items-center justify-center p-6 gap-4 border-2 rounded-lg transition-all',
              'border-secondary hover:border-primary/50 hover:bg-primary/5'
            )}
          >
            <IconUser className="w-8 h-8" />
            <span className="text-center font-medium">Prestataire</span>
          </button>
        </div>
      </div>
    </div>
  );
}
