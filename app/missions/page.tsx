'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import FloatingActionButton from '@/app/components/floatingActionButton';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useFetchTime } from '@/app/contexts/fetchTimeProvider';
import HomeForm from '@/app/homes/components/homeForm';
import MissionDetails from '@/app/missions/components/missionDetails';
import MissionFilters, { MissionFiltersType } from '@/app/missions/components/missionFilters';
import MissionForm from '@/app/missions/components/missionForm';
import MissionList from '@/app/missions/components/missionList';
import MissionSortControls from '@/app/missions/components/missionSortControls';
import { Mission, MissionSortField } from '@/app/types/dataTypes';
import { useLocalStorage } from '@/app/utils/localStorage';
import {
  applyMissionFilters,
  filterMissionsByUserType,
  groupMissionsByCategory,
  sortMissions,
} from '@/app/utils/missionFilters';
import { Page } from '@/app/utils/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function Missions() {
  const { missions, isLoading: missionsLoading, fetchMissions } = useMissions();
  const { homes } = useHomes();
  const { userType, isLoading: authLoading, getUserData } = useAuth();
  const { currentPage } = useMenuContext();
  const { updateFetchTime, needsRefresh } = useFetchTime();

  const [toast, setToast] = useState<Toast>();

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
  const [selectedMissionStatuses, setSelectedMissionStatuses] = useState<string[]>(['available']);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Store for saved filter values - must be declared before any conditional returns
  const [savedFilters, setSavedFilters] = useLocalStorage<MissionFiltersType>('mission_filters', {
    conciergeries: [],
    statuses: ['current'],
    missionStatuses: ['available'],
    zones: [],
  });

  // Reload missions when displaying the page
  const isFetching = useRef(false);
  useEffect(() => {
    // Skip if still loading
    if (authLoading || currentPage !== Page.Missions || isFetching.current || !needsRefresh[Page.Missions]) return;

    isFetching.current = true;
    fetchMissions()
      .then(isSuccess => {
        if (isSuccess) updateFetchTime(Page.Missions);
        else
          setToast({
            type: ToastType.Error,
            message: 'Erreur lors du chargement des missions',
          });
      })
      .finally(() => (isFetching.current = false));
  }, [currentPage, authLoading, fetchMissions, updateFetchTime, needsRefresh]);

  // Load saved filters from localStorage on component mount - must be called before any conditional returns
  useEffect(() => {
    if (authLoading || !savedFilters) return;

    // Initialize filter states with saved values
    setSelectedConciergeries(savedFilters.conciergeries || []);
    setSelectedStatuses(savedFilters.statuses || ['current']);
    setSelectedMissionStatuses(savedFilters.missionStatuses || ['available']);
    setSelectedZones(savedFilters.zones || []);
  }, [authLoading, savedFilters]);

  // Basic filtered missions (by user type) - must be declared before any conditional returns
  const basicFilteredMissions = useMemo(() => {
    if (missionsLoading) return [];
    return filterMissionsByUserType(missions, userType, getUserData());
  }, [missions, userType, missionsLoading, getUserData]);

  // Apply additional filters (conciergerie, status, zones) - must be declared before any conditional returns
  const filteredMissions = useMemo(() => {
    if (missionsLoading) return [];
    return applyMissionFilters(
      basicFilteredMissions,
      selectedConciergeries,
      selectedStatuses,
      selectedMissionStatuses,
      selectedZones,
      homes,
    );
  }, [
    basicFilteredMissions,
    selectedConciergeries,
    selectedStatuses,
    selectedMissionStatuses,
    selectedZones,
    homes,
    missionsLoading,
  ]);

  // Sort missions - must be declared before any conditional returns
  const sortedMissions = useMemo(() => {
    if (missionsLoading) return [];
    return sortMissions(filteredMissions, sortField, sortDirection, homes);
  }, [filteredMissions, sortField, sortDirection, homes, missionsLoading]);

  // Group missions by category - must be declared before any conditional returns
  const groupedMissions = useMemo(() => {
    if (missionsLoading) return {};
    return groupMissionsByCategory(sortedMissions, sortField, homes);
  }, [sortedMissions, sortField, homes, missionsLoading]);

  // Get available conciergeries for filtering - must be declared before any conditional returns
  const availableConciergeries = useMemo(() => {
    if (missionsLoading) return [];
    const conciergeries = new Set<string>();
    basicFilteredMissions.forEach(mission => {
      if (mission.conciergerieName) {
        conciergeries.add(mission.conciergerieName);
      }
    });
    return Array.from(conciergeries).sort();
  }, [basicFilteredMissions, missionsLoading]);

  // Get available geographic zones for filtering - must be declared before any conditional returns
  const availableZones = useMemo(() => {
    if (missionsLoading) return [];
    const zones = new Set<string>();
    basicFilteredMissions.forEach(mission => {
      const home = homes.find(h => h.id === mission.homeId);
      if (home?.geographicZone) {
        zones.add(home.geographicZone);
      }
    });
    return Array.from(zones).sort();
  }, [basicFilteredMissions, homes, missionsLoading]);

  // Function to save current filter values to localStorage
  const saveFiltersToLocalStorage = () => {
    setSavedFilters({
      conciergeries: selectedConciergeries,
      statuses: selectedStatuses,
      missionStatuses: selectedMissionStatuses,
      zones: selectedZones,
    });
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
    selectedMissionStatuses.length > 0 ||
    selectedZones.length > 0;

  return (
    <div>
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />

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
            selectedMissionStatuses={selectedMissionStatuses}
            setSelectedMissionStatuses={setSelectedMissionStatuses}
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
          onCancel={() => {
            setIsAddModalOpen(false);
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
