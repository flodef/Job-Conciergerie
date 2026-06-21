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
import { SORT_LABELS } from '@/app/missions/components/missionSortBar';
import type { MissionSortField } from '@/app/types/dataTypes';
import { useLocalStorage } from '@/app/utils/localStorage';
import React, { useLayoutEffect } from 'react';
import {
  applyMissionFilters,
  filterMissionsByUserType,
  getAvailableMissionStatuses,
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
  const prevSortField = useRef<MissionSortField>('date');

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

  // Mission expansion setting - must be declared before any conditional returns
  const [missionsExpandedByDefault, setMissionsExpandedByDefault] = useLocalStorage<boolean>(
    'missions_expanded_by_default',
    false,
  );

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

  // Apply filters EXCEPT time period (for available time periods calculation)
  const filteredMissionsWithoutTimePeriod = useMemo(() => {
    if (missionsLoading) return [];
    return applyMissionFilters(
      basicFilteredMissions,
      selectedConciergeries,
      [], // No time period filter
      selectedMissionStatuses,
      selectedZones,
      homes,
      isEmployee ? employeeName : undefined,
      isConciergerie ? selectedEmployees : [],
    );
  }, [
    basicFilteredMissions,
    selectedConciergeries,
    selectedMissionStatuses,
    selectedZones,
    selectedEmployees,
    homes,
    missionsLoading,
    isEmployee,
    isConciergerie,
    employeeName,
  ]);

  // Apply filters EXCEPT conciergeries (for available conciergeries calculation)
  const filteredMissionsWithoutConciergeries = useMemo(() => {
    if (missionsLoading) return [];
    return applyMissionFilters(
      basicFilteredMissions,
      [], // No conciergeries filter
      selectedStatuses,
      selectedMissionStatuses,
      selectedZones,
      homes,
      isEmployee ? employeeName : undefined,
      isConciergerie ? selectedEmployees : [],
    );
  }, [
    basicFilteredMissions,
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

  // Apply filters EXCEPT zones (for available zones calculation)
  const filteredMissionsWithoutZones = useMemo(() => {
    if (missionsLoading) return [];
    return applyMissionFilters(
      basicFilteredMissions,
      selectedConciergeries,
      selectedStatuses,
      selectedMissionStatuses,
      [], // No zones filter
      homes,
      isEmployee ? employeeName : undefined,
      isConciergerie ? selectedEmployees : [],
    );
  }, [
    basicFilteredMissions,
    selectedConciergeries,
    selectedStatuses,
    selectedMissionStatuses,
    selectedEmployees,
    homes,
    missionsLoading,
    isEmployee,
    isConciergerie,
    employeeName,
  ]);

  // Apply filters EXCEPT employees (for available employees calculation)
  const filteredMissionsWithoutEmployees = useMemo(() => {
    if (missionsLoading) return [];
    return applyMissionFilters(
      basicFilteredMissions,
      selectedConciergeries,
      selectedStatuses,
      selectedMissionStatuses,
      selectedZones,
      homes,
      isEmployee ? employeeName : undefined,
      [], // No employees filter
    );
  }, [
    basicFilteredMissions,
    selectedConciergeries,
    selectedStatuses,
    selectedMissionStatuses,
    selectedZones,
    homes,
    missionsLoading,
    isEmployee,
    employeeName,
  ]);

  // Apply filters EXCEPT mission statuses (for available mission statuses calculation)
  const filteredMissionsWithoutMissionStatuses = useMemo(() => {
    if (missionsLoading) return [];
    return applyMissionFilters(
      basicFilteredMissions,
      selectedConciergeries,
      selectedStatuses,
      [], // No mission statuses filter
      selectedZones,
      homes,
      isEmployee ? employeeName : undefined,
      selectedEmployees,
    );
  }, [
    basicFilteredMissions,
    selectedConciergeries,
    selectedStatuses,
    selectedZones,
    selectedEmployees,
    homes,
    missionsLoading,
    isEmployee,
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

  // Initialize collapsed categories - respect the expansion setting
  useEffect(() => {
    if (missionsLoading) return;
    const categories = Object.keys(groupedMissions);
    if (categories.length > 1) {
      setCollapsedCategories(missionsExpandedByDefault ? [] : categories);
    } else {
      setCollapsedCategories([]);
    }
  }, [groupedMissions, missionsLoading, missionsExpandedByDefault]);

  // Toggle all missions expanded/collapsed
  const handleToggleAllMissions = (expand: boolean) => {
    const categories = Object.keys(groupedMissions);
    setCollapsedCategories(expand ? [] : categories);
  };

  // Collapse all categories when sort field changes to prevent flickering
  useLayoutEffect(() => {
    if (missionsLoading) return;
    if (prevSortField.current !== sortField) {
      const categories = Object.keys(groupedMissions);
      if (categories.length > 1) {
        setCollapsedCategories(missionsExpandedByDefault ? [] : categories);
      } else {
        setCollapsedCategories([]);
      }
      prevSortField.current = sortField;
    }
  }, [sortField, groupedMissions, missionsLoading, missionsExpandedByDefault]);

  // Get available conciergeries for filtering - must be declared before any conditional returns
  // Use filtered missions (excluding conciergeries) to only show conciergeries with missions matching other filters
  // Sort order follows the current sort direction when sorting by conciergerie
  const availableConciergeries = useMemo(() => {
    if (missionsLoading) return [];
    const conciergeries = new Set<string>();
    filteredMissionsWithoutConciergeries.forEach(mission => {
      if (mission.conciergerieName) {
        conciergeries.add(mission.conciergerieName);
      }
    });
    const sorted = Array.from(conciergeries).sort();
    const conciergerieSortDirection = sortField === 'conciergerie' ? sortDirection : 'asc';
    return conciergerieSortDirection === 'asc' ? sorted : sorted.reverse();
  }, [filteredMissionsWithoutConciergeries, missionsLoading, sortField, sortDirection]);

  // Get available employees for filtering (conciergerie only) - must be declared before any conditional returns
  // Use filtered missions (excluding employees) to only show employees with missions matching other filters
  const availableEmployees = useMemo(() => {
    if (missionsLoading || !isConciergerie) return [];
    const employeeIds = new Set<string>();
    filteredMissionsWithoutEmployees.forEach(mission => {
      if (mission.employeeId) employeeIds.add(mission.employeeId);
      if (mission.employeeId2) employeeIds.add(mission.employeeId2);
    });
    return Array.from(employeeIds).sort();
  }, [filteredMissionsWithoutEmployees, missionsLoading, isConciergerie]);

  // Get available geographic zones for filtering - must be declared before any conditional returns
  // Use filtered missions (excluding zones) to only show zones with missions matching other filters
  // Sort order follows the current sort direction when sorting by geographicZone
  const availableZones = useMemo(() => {
    if (missionsLoading) return [];
    const zones = new Set<string>();
    filteredMissionsWithoutZones.forEach(mission => {
      const home = homes.find(h => h.id === mission.homeId);
      if (home?.geographicZone) {
        zones.add(home.geographicZone);
      }
    });
    const sorted = Array.from(zones).sort();
    const zoneSortDirection = sortField === 'geographicZone' ? sortDirection : 'asc';
    return zoneSortDirection === 'asc' ? sorted : sorted.reverse();
  }, [filteredMissionsWithoutZones, homes, missionsLoading, sortField, sortDirection]);

  // Get available time periods (months/years) for filtering - must be declared before any conditional returns
  // Use filtered missions (excluding time period) to only show periods with missions matching other filters
  // Sort order follows the current sort direction when sorting by date
  const availableTimePeriods = useMemo(() => {
    if (missionsLoading) return [];
    const timeSortDirection = sortField === 'date' ? sortDirection : 'desc';
    return getAvailableTimePeriods(filteredMissionsWithoutTimePeriod, timeSortDirection);
  }, [filteredMissionsWithoutTimePeriod, missionsLoading, sortField, sortDirection]);

  // Get available mission statuses for filtering - must be declared before any conditional returns
  // Use filtered missions (excluding mission statuses) to only show statuses with missions matching other filters
  const availableMissionStatuses = useMemo(() => {
    if (missionsLoading) return [];
    return getAvailableMissionStatuses(filteredMissionsWithoutMissionStatuses);
  }, [filteredMissionsWithoutMissionStatuses, missionsLoading]);

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

  // Function to handle sort field change with toast
  const handleSortChange = (field: MissionSortField, direction: 'asc' | 'desc') => {
    const label = SORT_LABELS[field];
    const directionLabel = direction === 'asc' ? 'croissant' : 'décroissant';
    showToast({ type: ToastType.Info, message: `Tri par ${label}, ordre ${directionLabel}` });
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
        onSortChange={handleSortChange}
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
              availableMissionStatuses={availableMissionStatuses}
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
              onClose={() => setShowFilters(false)}
              onToggleAllMissions={handleToggleAllMissions}
              missionsExpandedByDefault={missionsExpandedByDefault}
              setMissionsExpandedByDefault={setMissionsExpandedByDefault}
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
