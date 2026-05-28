'use client';

import { UserType } from '@/app/contexts/authProvider';
import { cn } from '@/app/utils/className';
import { IconBuildingEstate, IconUser } from '@tabler/icons-react';
import AppVersion from './appVersion';

type UserTypeSelectionProps = {
  onSelect: (type: UserType) => void;
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
            className={cn(
              'flex flex-col items-center justify-center p-6 gap-4 border-2 rounded-lg transition-all',
              'border-secondary hover:border-primary/50 hover:bg-primary/5',
            )}
          >
            <IconBuildingEstate className="w-8 h-8" />
            <span className="text-center font-medium">Conciergerie</span>
          </button>

          {/* Prestataire Option */}
          <button
            onClick={() => onSelect('employee')}
            className={cn(
              'flex flex-col items-center justify-center p-6 gap-4 border-2 rounded-lg transition-all',
              'border-secondary hover:border-primary/50 hover:bg-primary/5',
            )}
          >
            <IconUser className="w-8 h-8" />
            <span className="text-center font-medium">Prestataire</span>
          </button>
        </div>
      </div>
      <AppVersion className="absolute bottom-0 left-0 right-0 justify-self-center" />
    </div>
  );
}
