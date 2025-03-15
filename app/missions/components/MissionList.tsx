'use client';

import {
  IconBriefcase,
  IconCalendar,
  IconChevronDown,
  IconHome,
  IconMap2,
  IconPlus,
  IconUser,
} from '@tabler/icons-react';
import clsx from 'clsx/lite';
import React from 'react';
import MissionCard from '../../components/missionCard';
import { useHomes } from '../../contexts/homesProvider';
import { Mission, MissionSortField } from '../../types/types';

interface MissionListProps {
  groupedMissions: Record<string, Mission[]>;
  collapsedCategories: string[];
  setCollapsedCategories: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedMission: (id: string | null) => void;
  showFilters: boolean;
  userType: string | null;
  handleAddMission: () => void;
  setIsEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sortField: MissionSortField;
}

export default function MissionList({
  groupedMissions,
  collapsedCategories,
  setCollapsedCategories,
  setSelectedMission,
  showFilters,
  userType,
  handleAddMission,
  setIsEditModalOpen,
  sortField,
}: MissionListProps) {
  const { getCurrentConciergerie } = useHomes();
  const currentConciergerie = getCurrentConciergerie();

  // Toggle category collapse
  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => (prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]));
  };

  return Object.keys(groupedMissions).length === 0 ? (
    showFilters ? (
      <div className="bg-background rounded-lg shadow-md px-16 py-2 text-center">
        <p className="text-foreground/70">Aucune mission ne correspond à vos critères.</p>
      </div>
    ) : (
      <div
        className={clsx(
          'flex flex-col items-center justify-center h-[calc(100dvh-13rem)] border-2 border-dashed border-secondary rounded-lg p-8',
          userType === 'conciergerie' ? 'cursor-pointer' : '',
        )}
        onClick={userType === 'conciergerie' ? handleAddMission : undefined}
      >
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Aucune mission</h3>
          {userType === 'conciergerie' ? (
            <>
              <p className="text-light mb-4">Ajoutez votre première mission</p>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <IconPlus size={32} />
              </div>
            </>
          ) : (
            <>
              <p className="text-light mb-4">Aucune mission n&apos;est disponible pour le moment</p>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <IconBriefcase size={32} />
              </div>
            </>
          )}
        </div>
      </div>
    )
  ) : (
    <div className="space-y-4">
      {Object.entries(groupedMissions).map(([category, missions]) => (
        <div
          key={category}
          className={clsx(
            'bg-background border-0 rounded-lg overflow-hidden',
            collapsedCategories.includes(category) ? 'drop-shadow-md' : '',
          )}
        >
          <button
            onClick={() => toggleCategory(category)}
            className="w-full px-4 py-3 flex items-center justify-between bg-foreground/5"
          >
            <div className="flex items-center gap-2">
              {
                {
                  date: <IconCalendar size={18} className="text-foreground/70" />,
                  conciergerie: <IconUser size={18} className="text-foreground/70" />,
                  homeTitle: <IconHome size={18} className="text-foreground/70" />,
                  geographicZone: <IconMap2 size={18} className="text-foreground/70" />,
                }[sortField]
              }
              <h2 className="font-medium">{category}</h2>
              <span className="text-sm text-foreground/70">({missions.length})</span>
            </div>
            <IconChevronDown
              size={20}
              className={clsx(
                'transition-transform duration-300',
                collapsedCategories.includes(category) ? 'rotate-180' : '',
              )}
            />
          </button>

          <div
            className={clsx(
              'overflow-hidden transition-all duration-300 ease-in-out',
              collapsedCategories.includes(category) ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100',
            )}
          >
            <div className="pt-2 space-y-2">
              {missions.map(mission => (
                <div key={mission.id}>
                  <MissionCard
                    mission={mission}
                    onClick={() => setSelectedMission(mission.id)}
                    onEdit={() => {
                      setSelectedMission(mission.id);
                      if (mission.conciergerieName === currentConciergerie?.name) setIsEditModalOpen(true);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
