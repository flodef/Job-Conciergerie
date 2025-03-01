'use client';

import { useState, useEffect } from 'react';
import { useMissions } from '../contexts/missionsProvider';
import MissionCard from '../components/missionCard';
import MissionForm from '../components/missionForm';
import MissionDetails from '../components/missionDetails';
import FullScreenModal from '../components/fullScreenModal';
import LoadingSpinner from '../components/loadingSpinner';
import { getWelcomeParams } from '../utils/welcomeParams';
import { useTheme } from '../contexts/themeProvider';

export default function Missions() {
  const { missions, isLoading } = useMissions();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const { setPrimaryColor } = useTheme();

  // Apply theme color on component mount
  useEffect(() => {
    const { conciergerieData } = getWelcomeParams();
    if (conciergerieData && conciergerieData.color) {
      setPrimaryColor(conciergerieData.color);
    }
  }, [setPrimaryColor]);

  // Filter out deleted missions
  const activeMissions = missions.filter(mission => !mission.deleted);

  const handleMissionClick = (missionId: string) => {
    setSelectedMission(missionId);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setSelectedMission(null);
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
          className="flex flex-col items-center justify-center h-[calc(100vh-6rem)] border-2 border-dashed border-secondary rounded-lg p-8"
          onClick={() => setIsAddModalOpen(true)}
        >
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Aucune mission</h3>
            <p className="text-gray-500 mb-4">Ajoutez votre première mission</p>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full px-4 py-2 flex items-center justify-center gap-2 border-2 border-dashed border-foreground/30 rounded-lg hover:border-foreground/50 cursor-pointer transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Ajouter une mission
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMissions.map(mission => (
              <MissionCard key={mission.id} mission={mission} onClick={() => handleMissionClick(mission.id)} />
            ))}
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <FullScreenModal onClose={handleCloseModal}>
          <MissionForm onClose={handleCloseModal} mode="add" />
        </FullScreenModal>
      )}

      {selectedMissionData && <MissionDetails mission={selectedMissionData} onClose={handleCloseModal} />}
    </div>
  );
}
