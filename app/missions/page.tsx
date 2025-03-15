'use client';

import { useEffect, useMemo, useState } from 'react';
import ConfirmationModal from '../components/confirmationModal';
import FloatingActionButton from '../components/floatingActionButton';
import HomeForm from '../components/homeForm';
import LoadingSpinner from '../components/loadingSpinner';
import MissionDetails from '../components/missionDetails';
import MissionForm from '../components/missionForm';
import { useHomes } from '../contexts/homesProvider';
import { useMissions } from '../contexts/missionsProvider';
import { useTheme } from '../contexts/themeProvider';
import { Mission, MissionSortField } from '../types/types';
import { useRedirectIfNotRegistered } from '../utils/redirectIfNotRegistered';
import { getWelcomeParams } from '../utils/welcomeParams';
import MissionFilters from './components/MissionFilters';
import MissionList from './components/MissionList';
import MissionSortControls from './components/MissionSortControls';
import {
  applyMissionFilters,
  filterMissionsByUserType,
  groupMissionsByCategory,
  sortMissions,
} from './utils/missionFilters';

export default function Missions() {
  const { missions, isLoading } = useMissions();
  const { homes } = useHomes();
  const { setPrimaryColor, resetPrimaryColor } = useTheme();
  const { conciergerieData, userType } = getWelcomeParams();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddHomeModalOpen, setIsAddHomeModalOpen] = useState(false);
  const [isNoHomesModalOpen, setIsNoHomesModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<MissionSortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

  // Filter states
  const [selectedConciergeries, setSelectedConciergeries] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['current']);
  const [selectedTakenStatus, setSelectedTakenStatus] = useState<string[]>(['notTaken']);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Redirect if not registered
  useRedirectIfNotRegistered();

  // Set primary color from welcome params
  useEffect(() => {
    if (userType === 'conciergerie' && conciergerieData?.color) {
      setPrimaryColor(conciergerieData.color);
    } else {
      resetPrimaryColor();
    }
  }, [setPrimaryColor, resetPrimaryColor, conciergerieData, userType]);

  // Basic filtered missions (by user type)
  const basicFilteredMissions = useMemo(() => {
    return filterMissionsByUserType(missions, userType);
  }, [missions, userType]);

  // Apply additional filters (conciergerie, status, zones)
  const filteredMissions = useMemo(() => {
    return applyMissionFilters(
      basicFilteredMissions,
      selectedConciergeries,
      selectedStatuses,
      selectedTakenStatus,
      selectedZones,
      homes,
    );
  }, [basicFilteredMissions, selectedConciergeries, selectedStatuses, selectedTakenStatus, selectedZones, homes]);

  // Sort missions
  const sortedMissions = useMemo(() => {
    return sortMissions(filteredMissions, sortField, sortDirection, homes);
  }, [filteredMissions, sortField, sortDirection, homes]);

  // Group missions by category
  const groupedMissions = useMemo(() => {
    return groupMissionsByCategory(sortedMissions, sortField, homes);
  }, [sortedMissions, sortField, homes]);

  // Get available conciergeries for filtering
  const availableConciergeries = useMemo(() => {
    const conciergeries = new Set<string>();
    basicFilteredMissions.forEach(mission => {
      if (mission.conciergerieName) {
        conciergeries.add(mission.conciergerieName);
      }
    });
    return Array.from(conciergeries).sort();
  }, [basicFilteredMissions]);

  // Get available geographic zones for filtering
  const availableZones = useMemo(() => {
    const zones = new Set<string>();
    basicFilteredMissions.forEach(mission => {
      const home = homes.find(h => h.id === mission.homeId);
      if (home?.geographicZone) {
        zones.add(home.geographicZone);
      }
    });
    return Array.from(zones).sort();
  }, [basicFilteredMissions, homes]);

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

  if (isLoading) {
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
