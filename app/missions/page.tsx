'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import FloatingActionButton from '@/app/components/floatingActionButton';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useModal } from '@/app/contexts/modalProvider';
import { useToast } from '@/app/contexts/toastProvider';
import HomeForm from '@/app/homes/components/homeForm';
import { useFetchTime } from '@/app/hooks/useFetchTime';
import MissionDetails from '@/app/missions/components/missionDetails';
import type { MissionFiltersType } from '@/app/missions/components/missionFilters';
import MissionFilters from '@/app/missions/components/missionFilters';
import MissionForm from '@/app/missions/components/missionForm';
import MissionList from '@/app/missions/components/missionList';
import MissionSortControls from '@/app/missions/components/missionSortControls';
import type { MissionSortField } from '@/app/types/dataTypes';
import { useLocalStorage } from '@/app/utils/localStorage';
import {
  applyMissionFilters,
  filterMissionsByUserType,
  getAvailableTimePeriods,
  groupMissionsByCategory,
  sortMissions,
} from '@/app/utils/missionFilters';
import { Page } from '@/app/utils/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import M3LoadingSpinner from '../components/m3LoadingSpinner';
import type { SortDirection } from '../types/types';

export default function Missions() {
  const { missions, isLoading: missionsLoading, fetchMissions } = useMissions();
  const { homes } = useHomes();
  const { userType, isLoading: authLoading, employeeName, conciergerieName, isEmployee, isConciergerie } = useAuth();
  const { updateFetchTime, needsRefresh } = useFetchTime();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const needsRefreshMissions = needsRefresh[Page.Missions];

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Track when initial load completes
  useEffect(() => {
    if (!authLoading && !missionsLoading) setHasLoadedOnce(true);
  }, [authLoading, missionsLoading, missions.length]);

  // Open the mission details modal (view mode) through the singleton
  const openMissionDetails = (id: string) => {
    const mission = missions.find(m => m.id === id);
    if (!mission) return;
    const modalId = openModal(() => <MissionDetails mission={mission} onClose={() => closeModal(modalId)} />);
  };

  // Open the mission edit form through the singleton
  const openMissionEdit = (id: string) => {
    const mission = missions.find(m => m.id === id);
    if (!mission) return;
    const modalId = openModal(() => <MissionForm mission={mission} onClose={() => closeModal(modalId)} mode="edit" />);
  };

  // Open the add-mission form through the singleton
  const openAddMission = () => {
    const modalId = openModal(() => <MissionForm onClose={() => closeModal(modalId)} mode="add" />);
  };

  // Open the add-home form, then chain into add-mission on success
  const openAddHome = () => {
    const modalId = openModal(() => (
      <HomeForm
        mode="add"
        onClose={() => {
          closeModal(modalId);
          openAddMission();
        }}
        onCancel={() => closeModal(modalId)}
      />
    ));
  };

  // Sorting state - must be declared before any conditional returns
  const [sortField, setSortField] = useState<MissionSortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

  // Filter states - must be declared before any conditional returns
  const [selectedConciergeries, setSelectedConciergeries] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedMissionStatuses, setSelectedMissionStatuses] = useState<string[]>(['available']);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Store for saved filter values - must be declared before any conditional returns
  const [savedFilters, setSavedFilters] = useLocalStorage<MissionFiltersType>('mission_filters', {
    conciergeries: [],
    statuses: [],
    missionStatuses: ['available'],
    zones: [],
    employees: [],
  });

  // Reload missions when needed
  const isFetching = useRef(false);
  useEffect(() => {
    // Skip if still loading or already fetching or no refresh needed
    if (authLoading || isFetching.current || !needsRefreshMissions) return;

    isFetching.current = true;
    fetchMissions()
      .then(isSuccess => {
        if (isSuccess) updateFetchTime([Page.Calendar, Page.Missions, Page.Homes]);
        else if (!hasLoadedOnce)
          showToast({
            type: ToastType.Error,
            message: 'Erreur lors du chargement des missions',
          });
      })
      .finally(() => (isFetching.current = false));
  }, [authLoading, fetchMissions, updateFetchTime, needsRefreshMissions, showToast, hasLoadedOnce]);

  // Load saved filters from localStorage on component mount - must be called before any conditional returns
  useEffect(() => {
    if (authLoading || !savedFilters) return;

    // Initialize filter states with saved values
    setSelectedConciergeries(savedFilters.conciergeries || []);
    setSelectedStatuses(savedFilters.statuses || []);
    setSelectedMissionStatuses(savedFilters.missionStatuses || ['available']);
    setSelectedZones(savedFilters.zones || []);
    setSelectedEmployees(savedFilters.employees || []);
  }, [authLoading, savedFilters]);

  // Basic filtered missions (by user type) - must be declared before any conditional returns
  const basicFilteredMissions = useMemo(() => {
    if (missionsLoading) return [];
    return filterMissionsByUserType(missions, isEmployee ? employeeName : undefined);
  }, [missions, isEmployee, missionsLoading, employeeName]);

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
      isEmployee ? employeeName : undefined,
      isConciergerie ? selectedEmployees : [],
    );
  }, [
    basicFilteredMissions,
    selectedConciergeries,
    selectedStatuses,
    selectedMissionStatuses,
    selectedZones,
    selectedEmployees,
    homes,
    missionsLoading,
    isEmployee,
    isConciergerie,
    employeeName,
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

  // Initialize collapsed categories - collapse all except if there's only one category
  useEffect(() => {
    if (missionsLoading) return;
    const categories = Object.keys(groupedMissions);
    if (categories.length > 1) setCollapsedCategories(categories);
    else setCollapsedCategories([]);
  }, [groupedMissions, missionsLoading]);

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

  // Get available employees for filtering (conciergerie only) - must be declared before any conditional returns
  // Scan all missions (not just status-filtered) to find employees with any assigned mission (either binôme slot)
  const availableEmployees = useMemo(() => {
    if (missionsLoading || !isConciergerie) return [];
    const employeeIds = new Set<string>();
    missions.forEach(mission => {
      if (mission.employeeId) employeeIds.add(mission.employeeId);
      if (mission.employeeId2) employeeIds.add(mission.employeeId2);
    });
    return Array.from(employeeIds).sort();
  }, [missions, missionsLoading, isConciergerie]);

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

  // Get available time periods (months/years) for filtering - must be declared before any conditional returns
  // Use basic filtered missions to only show periods with missions accessible to the user
  const availableTimePeriods = useMemo(() => {
    if (missionsLoading) return [];
    return getAvailableTimePeriods(basicFilteredMissions);
  }, [basicFilteredMissions, missionsLoading]);

  // Function to save current filter values to localStorage
  const saveFiltersToLocalStorage = () => {
    setSavedFilters({
      conciergeries: selectedConciergeries,
      statuses: selectedStatuses,
      missionStatuses: selectedMissionStatuses,
      zones: selectedZones,
      employees: selectedEmployees,
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
    if (homes.filter(h => h.conciergerieName === conciergerieName).length === 0) {
      const modalId = openModal(() => (
        <ConfirmationModal
          isOpen
          title="Aucun bien disponible"
          message="Vous devez d'abord ajouter un bien avant de pouvoir créer une mission."
          confirmText="Ajouter un bien"
          cancelText="Annuler"
          onConfirm={openAddHome}
          onClose={() => closeModal(modalId)}
        />
      ));
    } else {
      openAddMission();
    }
  };

  // Check if there are active filters
  const hasActiveFilters =
    selectedConciergeries.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedMissionStatuses.length > 0 ||
    selectedZones.length > 0 ||
    selectedEmployees.length > 0;

  if (!hasLoadedOnce) return <M3LoadingSpinner />;

  return (
    <div className="bg-background min-h-full px-4 pb-4">
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
      {/* Content */}
      <>
        {/* Filter panel */}
        {showFilters && (
          <div className="mb-4">
            <MissionFilters
              availableConciergeries={availableConciergeries}
              availableZones={availableZones}
              availableTimePeriods={availableTimePeriods}
              availableEmployees={availableEmployees}
              selectedConciergeries={selectedConciergeries}
              setSelectedConciergeries={setSelectedConciergeries}
              selectedStatuses={selectedStatuses}
              setSelectedStatuses={setSelectedStatuses}
              selectedMissionStatuses={selectedMissionStatuses}
              setSelectedMissionStatuses={setSelectedMissionStatuses}
              selectedZones={selectedZones}
              setSelectedZones={setSelectedZones}
              selectedEmployees={selectedEmployees}
              setSelectedEmployees={setSelectedEmployees}
              saveFiltersToLocalStorage={saveFiltersToLocalStorage}
              savedFilters={savedFilters}
              isConciergerie={isConciergerie}
            />
          </div>
        )}

        {/* Mission list */}
        <MissionList
          groupedMissions={groupedMissions}
          collapsedCategories={collapsedCategories}
          setCollapsedCategories={setCollapsedCategories}
          onSelectMission={openMissionDetails}
          showFilters={showFilters}
          userType={userType}
          handleAddMission={handleAddMission}
          onEditMission={openMissionEdit}
          sortField={sortField}
          isLoading={false}
        />
      </>
      {/* Only show the floating action button for conciergerie users */}
      {(filteredMissions.length > 0 || showFilters) && isConciergerie && (
        <FloatingActionButton onClick={handleAddMission} />
      )}
    </div>
  );
}
