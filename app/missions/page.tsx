'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import FloatingActionButton from '@/app/components/floatingActionButton';
import LoadingSpinner from '@/app/components/loadingSpinner';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useTheme } from '@/app/contexts/themeProvider';
import HomeForm from '@/app/homes/components/homeForm';
import MissionDetails from '@/app/missions/components/missionDetails';
import MissionFilters from '@/app/missions/components/missionFilters';
import MissionForm from '@/app/missions/components/missionForm';
import MissionList from '@/app/missions/components/missionList';
import MissionSortControls from '@/app/missions/components/missionSortControls';
import { Mission, MissionSortField } from '@/app/types/types';
import {
  applyMissionFilters,
  filterMissionsByUserType,
  groupMissionsByCategory,
  sortMissions,
} from '@/app/utils/missionFilters';
import { useEffect, useMemo, useState } from 'react';

export default function Missions() {
  const { missions, isLoading: missionsLoading } = useMissions();
  const { homes } = useHomes();
  const { setPrimaryColor, resetPrimaryColor } = useTheme();
  const { userType, conciergerieData, isLoading: authLoading } = useAuth();

  // Modal states - must be declared before any conditional returns
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddHomeModalOpen, setIsAddHomeModalOpen] = useState(false);
  const [isNoHomesModalOpen, setIsNoHomesModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  // Sorting state - must be declared before any conditional returns
  const [sortField, setSortField] = useState<MissionSortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

  // Filter states - must be declared before any conditional returns
  const [selectedConciergeries, setSelectedConciergeries] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['current']);
  const [selectedTakenStatus, setSelectedTakenStatus] = useState<string[]>(['notTaken']);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Store for saved filter values - must be declared before any conditional returns
  const [savedFilters, setSavedFilters] = useState<{
    conciergeries: string[];
    statuses: string[];
    takenStatus: string[];
    zones: string[];
  }>({
    conciergeries: [],
    statuses: ['current'],
    takenStatus: ['notTaken'],
    zones: [],
  });

  // We don't need the redirect hook anymore since middleware handles it
  // Also don't need to check auth status again since middleware already did

  // Load saved filters from localStorage on component mount - must be called before any conditional returns
  useEffect(() => {
    // Skip if still loading
    if (authLoading || !userType) return;

    const savedFiltersStr = localStorage.getItem('mission_filters');
    if (savedFiltersStr) {
      try {
        const savedFiltersData = JSON.parse(savedFiltersStr);
        setSavedFilters(savedFiltersData);

        // Initialize filter states with saved values
        setSelectedConciergeries(savedFiltersData.conciergeries || []);
        setSelectedStatuses(savedFiltersData.statuses || ['current']);
        setSelectedTakenStatus(savedFiltersData.takenStatus || ['notTaken']);
        setSelectedZones(savedFiltersData.zones || []);
      } catch (error) {
        console.error('Error parsing saved filters:', error);
      }
    }
  }, [authLoading, userType]);

  // Set primary color from welcome params - must be called before any conditional returns
  useEffect(() => {
    // Skip if still loading
    if (authLoading || !userType) return;

    if (userType === 'conciergerie' && conciergerieData?.color) {
      setPrimaryColor(conciergerieData.color);
    } else {
      resetPrimaryColor();
    }
  }, [setPrimaryColor, resetPrimaryColor, conciergerieData, userType, authLoading]);

  // Basic filtered missions (by user type) - must be declared before any conditional returns
  const basicFilteredMissions = useMemo(() => {
    if (authLoading || !userType) return [];
    return filterMissionsByUserType(missions, userType);
  }, [missions, userType, authLoading]);

  // Apply additional filters (conciergerie, status, zones) - must be declared before any conditional returns
  const filteredMissions = useMemo(() => {
    if (authLoading || !userType) return [];
    return applyMissionFilters(
      basicFilteredMissions,
      selectedConciergeries,
      selectedStatuses,
      selectedTakenStatus,
      selectedZones,
      homes,
    );
  }, [
    basicFilteredMissions,
    selectedConciergeries,
    selectedStatuses,
    selectedTakenStatus,
    selectedZones,
    homes,
    authLoading,
    userType,
  ]);

  // Sort missions - must be declared before any conditional returns
  const sortedMissions = useMemo(() => {
    if (authLoading || !userType) return [];
    return sortMissions(filteredMissions, sortField, sortDirection, homes);
  }, [filteredMissions, sortField, sortDirection, homes, authLoading, userType]);

  // Group missions by category - must be declared before any conditional returns
  const groupedMissions = useMemo(() => {
    if (authLoading || !userType) return {};
    return groupMissionsByCategory(sortedMissions, sortField, homes);
  }, [sortedMissions, sortField, homes, authLoading, userType]);

  // Get available conciergeries for filtering - must be declared before any conditional returns
  const availableConciergeries = useMemo(() => {
    if (authLoading || !userType) return [];
    const conciergeries = new Set<string>();
    basicFilteredMissions.forEach(mission => {
      if (mission.conciergerieName) {
        conciergeries.add(mission.conciergerieName);
      }
    });
    return Array.from(conciergeries).sort();
  }, [basicFilteredMissions, authLoading, userType]);

  // Get available geographic zones for filtering - must be declared before any conditional returns
  const availableZones = useMemo(() => {
    if (authLoading || !userType) return [];
    const zones = new Set<string>();
    basicFilteredMissions.forEach(mission => {
      const home = homes.find(h => h.id === mission.homeId);
      if (home?.geographicZone) {
        zones.add(home.geographicZone);
      }
    });
    return Array.from(zones).sort();
  }, [basicFilteredMissions, homes, authLoading, userType]);

  // Function to save current filter values to localStorage
  const saveFiltersToLocalStorage = () => {
    const filtersToSave = {
      conciergeries: selectedConciergeries,
      statuses: selectedStatuses,
      takenStatus: selectedTakenStatus,
      zones: selectedZones,
    };
    localStorage.setItem('mission_filters', JSON.stringify(filtersToSave));
    setSavedFilters(filtersToSave);
  };

  // Change sort field
  const changeSortField = (field: MissionSortField) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // Otherwise, set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle adding a new mission
  const handleAddMission = () => {
    if (homes.length === 0) {
      setIsNoHomesModalOpen(true);
    } else {
      setIsAddModalOpen(true);
    }
  };

  // Check if there are active filters
  const hasActiveFilters =
    selectedConciergeries.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedTakenStatus.length > 0 ||
    selectedZones.length > 0;

  if (missionsLoading || authLoading) {
    return (
      <div className="min-h-[calc(100dvh-9rem)] flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Chargement des missions..." />
      </div>
    );
  }

  return (
    <div>
      {/* Sort controls and filter toggle */}
      <MissionSortControls
        sortField={sortField}
        sortDirection={sortDirection}
        changeSortField={changeSortField}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        hasActiveFilters={hasActiveFilters}
        filteredMissionsCount={filteredMissions.length}
      />

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4">
          <MissionFilters
            availableConciergeries={availableConciergeries}
            availableZones={availableZones}
            selectedConciergeries={selectedConciergeries}
            setSelectedConciergeries={setSelectedConciergeries}
            selectedStatuses={selectedStatuses}
            setSelectedStatuses={setSelectedStatuses}
            selectedTakenStatus={selectedTakenStatus}
            setSelectedTakenStatus={setSelectedTakenStatus}
            selectedZones={selectedZones}
            setSelectedZones={setSelectedZones}
            saveFiltersToLocalStorage={saveFiltersToLocalStorage}
            savedFilters={savedFilters}
          />
        </div>
      )}

      {/* Mission list */}
      <MissionList
        groupedMissions={groupedMissions}
        collapsedCategories={collapsedCategories}
        setCollapsedCategories={setCollapsedCategories}
        setSelectedMission={setSelectedMission}
        showFilters={showFilters}
        userType={userType}
        handleAddMission={handleAddMission}
        setIsEditModalOpen={setIsEditModalOpen}
        sortField={sortField}
      />

      {/* Only show the floating action button for conciergerie users */}
      {(filteredMissions.length > 0 || showFilters) && userType === 'conciergerie' && (
        <FloatingActionButton onClick={handleAddMission} />
      )}

      {/* Mission details modal */}
      {/* Edit mission modal */}
      {missions.find(m => m.id === selectedMission) &&
        (!isEditModalOpen ? (
          <MissionDetails
            mission={missions.find(m => m.id === selectedMission) as Mission}
            onClose={() => setSelectedMission(null)}
          />
        ) : (
          <MissionForm
            mission={missions.find(m => m.id === selectedMission) as Mission}
            onClose={() => {
              setSelectedMission(null);
              setIsEditModalOpen(false);
            }}
            mode="edit"
          />
        ))}

      {/* Add mission modal */}
      {isAddModalOpen && <MissionForm onClose={() => setIsAddModalOpen(false)} mode="add" />}

      {/* Add home modal */}
      {isAddHomeModalOpen && (
        <HomeForm
          onClose={() => {
            setIsAddHomeModalOpen(false);
            setIsAddModalOpen(true);
          }}
          mode="add"
        />
      )}

      {/* No homes confirmation modal */}
      {isNoHomesModalOpen && (
        <ConfirmationModal
          isOpen={isNoHomesModalOpen}
          title="Aucun bien disponible"
          message="Vous devez d'abord ajouter un bien avant de pouvoir créer une mission."
          confirmText="Ajouter un bien"
          cancelText="Annuler"
          onConfirm={() => {
            setIsNoHomesModalOpen(false);
            setIsAddHomeModalOpen(true);
          }}
          onCancel={() => setIsNoHomesModalOpen(false)}
          onClose={() => setIsNoHomesModalOpen(false)}
        />
      )}
    </div>
  );
}
