'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { Mission } from '@/app/types/dataTypes';
import { IconCancel, IconCheck, IconPencil, IconPlayerPlay, IconTrash } from '@tabler/icons-react';

type MissionActionsProps = {
  mission: Mission;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveEmployee: () => void;
  onStartMission: (missionId: string) => void;
  onCompleteMission: (missionId: string) => void;
  onClose: () => void;
};

export default function MissionActions({
  mission,
  onEdit,
  onDelete,
  onRemoveEmployee,
  onStartMission,
  onCompleteMission,
  onClose,
}: MissionActionsProps) {
  const { userId, userType, conciergerieName } = useAuth();

  // Check if the current time is after the mission start time
  const now = new Date();
  const hasStartTimePassed = now > mission.startDateTime;
  const isOwnMission = userType === 'conciergerie' && mission.conciergerieName === conciergerieName;
  const isCurrentEmployee = mission.employeeId === userId;
  const isAccepted = mission.status === 'accepted';
  const isStarted = mission.status === 'started';
  const isCompleted = mission.status === 'completed';

  // For employees in calendar view
  if (isCurrentEmployee && hasStartTimePassed && (isAccepted || isStarted)) {
    return (
      <div className="flex justify-end gap-2 bg-background border-t border-secondary px-2 py-2 rounded-b-lg">
        {/* Start button - only visible if mission has not started yet and start time has passed */}
        {isAccepted && (
          <button
            onClick={() => {
              onStartMission(mission.id);
              onClose();
            }}
            className="flex flex-col items-center p-2 w-20 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
          >
            <IconPlayerPlay />
            Démarrer
          </button>
        )}

        {/* Finish button - only visible if mission is started */}
        {isStarted && (
          <button
            onClick={() => {
              onCompleteMission(mission.id);
              onClose();
            }}
            className="flex flex-col items-center p-2 w-20 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
          >
            <IconCheck />
            Terminer
          </button>
        )}
      </div>
    );
  } else if (isOwnMission && !isCompleted) {
    return (
      <div className="flex justify-end gap-2 bg-background border-t border-secondary px-2 py-2 rounded-b-lg">
        {!isStarted && (
          <>
            <button
              onClick={onEdit}
              className="flex flex-col items-center p-2 w-20 rounded-lg hover:opacity-80"
              data-edit-button
            >
              <IconPencil />
              Modifier
            </button>
            <button
              onClick={onDelete}
              className="flex flex-col items-center p-2 w-20 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              <IconTrash />
              Supprimer
            </button>
            <button
              onClick={onRemoveEmployee}
              className="flex flex-col items-center p-2 w-20 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
            >
              <IconCancel />
              Annuler
            </button>
          </>
        )}
        {isStarted && (
          <button
            onClick={() => {
              onCompleteMission(mission.id);
              onClose();
            }}
            className="flex flex-col items-center p-2 w-20 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
          >
            <IconCheck />
            Terminer
          </button>
        )}
      </div>
    );
  }

  return null;
}
