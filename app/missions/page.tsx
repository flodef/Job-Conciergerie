'use client';

import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
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
import { getWelcomeParams } from '../utils/welcomeParams';
import { useRedirectIfNotRegistered } from '../utils/redirectIfNotRegistered';

export default function Missions() {
  const { missions, isLoading, getCurrentConciergerie } = useMissions();
  const { homes } = useHomes();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddHomeModalOpen, setIsAddHomeModalOpen] = useState(false);
  const [isNoHomesModalOpen, setIsNoHomesModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const { setPrimaryColor } = useTheme();

  // Redirect if not registered
  useRedirectIfNotRegistered();

  // Apply theme color on component mount
  useEffect(() => {
    const { conciergerieData } = getWelcomeParams();
    if (conciergerieData && conciergerieData.color) {
      setPrimaryColor(conciergerieData.color);
    }
  }, [setPrimaryColor]);

  // Get current date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get current conciergerie
  const currentConciergerie = getCurrentConciergerie();

  // Filter out deleted missions, past missions, and missions not created by the current conciergerie
  // Then sort by date (closest to today first)
  const activeMissions = missions
    .filter(
      mission =>
        !mission.deleted && new Date(mission.date) >= today && mission.conciergerie.name === currentConciergerie?.name,
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter homes by the current conciergerie
  const filteredHomes = homes.filter(home => !home.deleted && home.conciergerie?.name === currentConciergerie?.name);

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
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Chargement des missions..." />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background p-4">
      {activeMissions.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-[calc(100vh-6rem)] border-2 border-dashed border-secondary rounded-lg p-8 cursor-pointer"
          onClick={handleAddMission}
        >
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Aucune mission</h3>
            <p className="text-light mb-4">Ajoutez votre première mission</p>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <IconPlus size={32} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeMissions.map(mission => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClick={() => handleMissionClick(mission.id)}
              onEdit={() => handleMissionEdit(mission.id)}
            />
          ))}
        </div>
      )}

      {/* Only show the floating action button if there are missions */}
      {activeMissions.length > 0 && <FloatingActionButton onClick={handleAddMission} />}

      {isAddModalOpen && (
        <FullScreenModal onClose={handleCloseModal}>
          <MissionForm onClose={handleCloseModal} mode="add" />
        </FullScreenModal>
      )}

      {selectedMissionData && !isEditModalOpen && (
        <MissionDetails mission={selectedMissionData} onClose={() => setSelectedMission(null)} />
      )}

      {selectedMissionData && isEditModalOpen && (
        <FullScreenModal onClose={handleCloseEditModal}>
          <MissionForm mission={selectedMissionData} onClose={handleCloseEditModal} mode="edit" />
        </FullScreenModal>
      )}

      {isAddHomeModalOpen && (
        <FullScreenModal onClose={handleCloseHomeModal}>
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
