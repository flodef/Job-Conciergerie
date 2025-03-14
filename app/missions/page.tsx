'use client';

import { IconBriefcase, IconChevronDown, IconPlus, IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import { useEffect, useMemo, useState } from 'react';
import ConfirmationModal from '../components/confirmationModal';
import FloatingActionButton from '../components/floatingActionButton';
import FullScreenModal from '../components/fullScreenModal';
import HomeForm from '../components/homeForm';
import LoadingSpinner from '../components/loadingSpinner';
import MissionCard from '../components/missionCard';
import MissionDetails from '../components/missionDetails';
import MissionForm from '../components/missionForm';
import { useHomes } from '../contexts/homesProvider';
import { useMissions } from '../contexts/missionsProvider';
import { useTheme } from '../contexts/themeProvider';
import { monthNames } from '../utils/calendarUtils';
import { useRedirectIfNotRegistered } from '../utils/redirectIfNotRegistered';
import { getWelcomeParams } from '../utils/welcomeParams';

export default function Missions() {
  const { missions, isLoading, getCurrentConciergerie } = useMissions();
  const { homes } = useHomes();
  const { setPrimaryColor, resetPrimaryColor } = useTheme();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddHomeModalOpen, setIsAddHomeModalOpen] = useState(false);
  const [isNoHomesModalOpen, setIsNoHomesModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);

  // Sorting state
  type SortField = 'date' | 'conciergerie' | 'geographicZone' | 'homeTitle';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

  // Redirect if not registered
  useRedirectIfNotRegistered();

  // Apply theme color on component mount and get user type
  useEffect(() => {
    const { conciergerieData, userType } = getWelcomeParams();
    if (userType === 'conciergerie') {
      if (conciergerieData && conciergerieData.color) {
        setPrimaryColor(conciergerieData.color);
      } else {
        resetPrimaryColor();
      }
    }

    setUserType(userType);
  }, [setPrimaryColor, resetPrimaryColor]);

  // Get current conciergerie
  const currentConciergerie = getCurrentConciergerie();

  // Filter missions:
  // 1. Not deleted
  // 2. Taken by the current employee
  // 3. For employees, only show missions they have access to based on prestataires setting
  const filteredMissions = useMemo(
    () =>
      missions.filter(mission => {
        // Filter out deleted missions and past missions
        if (mission.deleted || new Date(mission.endDateTime) < new Date()) return false;

        // For employee users, show only Available missions (not taken by anyone)
        if (userType === 'employee') {
          // First check if the mission is available (not taken by anyone)
          if (mission.employeeId) return false;

          // Get the current employee ID from localStorage
          const employeeDataStr = localStorage.getItem('employee_data');
          const employeeData = employeeDataStr ? JSON.parse(employeeDataStr) : null;
          const employeeId = employeeData?.id;
          if (!employeeId) return false;

          // If the mission has prestataires specified, check if the current employee is in the list
          if (mission.prestataires?.length) {
            return mission.prestataires.includes(employeeId);
          }

          // If no prestataires specified, show to all
          return true;
        }

        // For conciergerie users, show all the missions
        return true;
      }),
    [missions, userType],
  );

  // Helper function to get the month name in French
  const getMonthName = (date: Date): string => {
    return monthNames[date.getMonth()];
  };

  // Group and sort missions based on the selected sort field
  const groupedMissions = useMemo(() => {
    // Create a map to store missions grouped by category
    const groupMap = new Map<string, typeof filteredMissions>();

    // Group missions based on sort field
    filteredMissions.forEach(mission => {
      let categoryKey = '';

      if (sortField === 'date') {
        const date = new Date(mission.startDateTime);
        categoryKey = getMonthName(date);
      } else if (sortField === 'conciergerie') {
        categoryKey = mission.conciergerieName;
      } else if (sortField === 'geographicZone') {
        // Find the home associated with this mission to get its geographic zone
        const home = homes.find(h => h.id === mission.homeId);
        categoryKey = home?.geographicZone || 'Non définie';
      } else if (sortField === 'homeTitle') {
        // Find the home associated with this mission to get its title
        const home = homes.find(h => h.id === mission.homeId);
        categoryKey = home?.title || 'Sans titre';
      }

      if (!groupMap.has(categoryKey)) {
        groupMap.set(categoryKey, []);
      }

      groupMap.get(categoryKey)?.push(mission);
    });

    // Sort each group internally
    groupMap.forEach(missions => {
      missions.sort((a, b) => {
        if (sortField === 'date') {
          // For date sorting, always sort by date within the group
          const timeA = new Date(a.startDateTime).getTime();
          const timeB = new Date(b.startDateTime).getTime();
          return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        } else if (sortField === 'conciergerie') {
          // For conciergerie sorting, sort by date within the conciergerie
          const timeA = new Date(a.startDateTime).getTime();
          const timeB = new Date(b.startDateTime).getTime();
          return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        } else if (sortField === 'geographicZone') {
          // For geographic zone sorting, sort by date within the zone
          const timeA = new Date(a.startDateTime).getTime();
          const timeB = new Date(b.startDateTime).getTime();
          return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        }
        return 0;
      });
    });

    // Convert to array of [category, missions] pairs and sort categories
    const groupArray = Array.from(groupMap.entries());

    // Sort the categories
    groupArray.sort((a, b) => {
      const [keyA] = a;
      const [keyB] = b;

      if (sortField === 'date') {
        // For date sorting, sort months chronologically
        const indexA = monthNames.indexOf(keyA);
        const indexB = monthNames.indexOf(keyB);
        return sortDirection === 'asc' ? indexA - indexB : indexB - indexA;
      } else {
        // For other fields, sort alphabetically
        return sortDirection === 'asc' ? keyA.localeCompare(keyB, 'fr') : keyB.localeCompare(keyA, 'fr');
      }
    });

    return groupArray;
  }, [filteredMissions, sortField, sortDirection, homes]);

  // Expand all categories when needed
  useEffect(() => {
    setCollapsedCategories([]);
  }, [sortField]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // Change sort field
  const changeSortField = (field: SortField) => {
    if (sortField === field) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter homes by the current conciergerie
  const filteredHomes = homes.filter(home => home.conciergerieName === currentConciergerie?.name);

  const handleMissionClick = (missionId: string) => {
    setSelectedMission(missionId);
  };

  const handleMissionEdit = (missionId: string) => {
    setSelectedMission(missionId);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setSelectedMission(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedMission(null);
  };

  const handleCloseHomeModal = () => {
    setIsAddHomeModalOpen(false);
  };

  const handleAddMission = () => {
    // Check if there are any homes available
    if (filteredHomes.length === 0) {
      // Show confirmation modal if no homes are available
      setIsNoHomesModalOpen(true);
    } else {
      // Open mission form if homes are available
      setIsAddModalOpen(true);
    }
  };

  const handleAddHomeConfirm = () => {
    setIsNoHomesModalOpen(false);
    setIsAddHomeModalOpen(true);
  };

  const handleAddHomeCancel = () => {
    setIsNoHomesModalOpen(false);
  };

  const selectedMissionData = selectedMission ? missions.find(mission => mission.id === selectedMission) : null;

  // Show loading spinner while loading missions
  if (isLoading) {
    return (
      <div className="min-h-[calc(100dvh-9rem)] flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Chargement des missions..." />
      </div>
    );
  }

  return (
    <div>
      {/* Sort controls */}
      {filteredMissions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => changeSortField('date')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1',
              sortField === 'date' ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
            )}
          >
            Date
            {sortField === 'date' &&
              (sortDirection === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />)}
          </button>
          <button
            onClick={() => changeSortField('conciergerie')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1',
              sortField === 'conciergerie' ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
            )}
          >
            Conciergerie
            {sortField === 'conciergerie' &&
              (sortDirection === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />)}
          </button>
          <button
            onClick={() => changeSortField('geographicZone')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1',
              sortField === 'geographicZone' ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
            )}
          >
            Zone
            {sortField === 'geographicZone' &&
              (sortDirection === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />)}
          </button>
          <button
            onClick={() => changeSortField('homeTitle')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1',
              sortField === 'homeTitle' ? 'bg-primary text-background' : 'bg-foreground/10 text-foreground',
            )}
          >
            Bien
            {sortField === 'homeTitle' &&
              (sortDirection === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />)}
          </button>
        </div>
      )}

      {filteredMissions.length === 0 ? (
        <div
          className={clsx(
            'flex flex-col items-center justify-center h-[calc(100dvh-10rem)] border-2 border-dashed border-secondary rounded-lg p-8',
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
      ) : (
        <div className="space-y-2">
          {groupedMissions.map(([category, missions]) => (
            <div key={category} className="border border-foreground/10 rounded-lg overflow-hidden">
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex justify-between items-center p-3 bg-foreground/5 hover:bg-foreground/10 transition-colors"
              >
                <h3 className="font-medium flex items-center gap-2">
                  {category} <span className="text-sm text-foreground/70">({missions.length})</span>
                </h3>
                <div
                  className={clsx(
                    'transition-transform duration-300',
                    collapsedCategories.includes(category) ? 'rotate-0' : 'rotate-180',
                  )}
                >
                  <IconChevronDown size={20} className="text-foreground/70" />
                </div>
              </button>

              {/* Category content with animation */}
              <div
                className={clsx(
                  'overflow-hidden transition-all duration-300 ease-in-out',
                  collapsedCategories.includes(category) ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100',
                )}
              >
                <div className="p-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {missions.map(mission => (
                      <MissionCard
                        key={mission.id}
                        mission={mission}
                        onClick={() => handleMissionClick(mission.id)}
                        onEdit={userType === 'conciergerie' ? () => handleMissionEdit(mission.id) : undefined}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Only show the floating action button for conciergerie users */}
      {filteredMissions.length > 0 && userType === 'conciergerie' && (
        <FloatingActionButton onClick={handleAddMission} />
      )}

      {isAddModalOpen && (
        <FullScreenModal onClose={handleCloseModal} title="Nouvelle mission">
          <MissionForm onClose={handleCloseModal} mode="add" />
        </FullScreenModal>
      )}

      {selectedMissionData && !isEditModalOpen && (
        <MissionDetails mission={selectedMissionData} onClose={() => setSelectedMission(null)} />
      )}

      {selectedMissionData && isEditModalOpen && (
        <FullScreenModal onClose={handleCloseEditModal} title="Modification de la mission">
          <MissionForm mission={selectedMissionData} onClose={handleCloseEditModal} mode="edit" />
        </FullScreenModal>
      )}

      {isAddHomeModalOpen && (
        <FullScreenModal onClose={handleCloseHomeModal} title="Nouveau bien">
          <HomeForm
            onClose={() => {
              handleCloseHomeModal();
              // If at least one home was added, open the mission form
              if (filteredHomes.length > 0) {
                setIsAddModalOpen(true);
              }
            }}
            mode="add"
          />
        </FullScreenModal>
      )}

      <ConfirmationModal
        isOpen={isNoHomesModalOpen}
        onConfirm={handleAddHomeConfirm}
        onCancel={handleAddHomeCancel}
        title="Aucun bien disponible"
        message="Vous devez d'abord ajouter un bien avant de créer une mission. Voulez-vous ajouter un bien maintenant ?"
        confirmText="Ajouter un bien"
        cancelText="Annuler"
      />
    </div>
  );
}
