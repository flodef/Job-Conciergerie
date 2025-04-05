'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { Mission } from '@/app/types/dataTypes';
import { IconCancel, IconCheck, IconPencil, IconPlayerPlay, IconTrash } from '@tabler/icons-react';

type MissionActionsProps = {
  mission: Mission;
  isReadOnly: boolean;
  isFromCalendar: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveEmployee: () => void;
  onStartMission: (missionId: string) => void;
  onCompleteMission: (missionId: string) => void;
  onClose: () => void;
};

export default function MissionActions({
  mission,
  isReadOnly,
  isFromCalendar,
  onEdit,
  onDelete,
  onRemoveEmployee,
  onStartMission,
  onCompleteMission,
  onClose,
}: MissionActionsProps) {
  const { userId, userType } = useAuth();

  // Check if the current time is after the mission start time
  const now = new Date();
  const startDate = new Date(mission.startDateTime);
  const hasStartTimePassed = now > startDate;
  const isStarted = mission.status === 'started';
  const isOwnMission = !isReadOnly;
  const hasEmployeeAssigned = !!mission.employeeId;
  const isCurrentEmployee = mission.employeeId === userId;
  const isEmployee = userType === 'employee';

  // No buttons for calendar view if not the right user type
  if (isFromCalendar) {
    // For employees in calendar view
    if (isEmployee && isCurrentEmployee) {
      return (
        <div className="flex justify-end gap-2 bg-background border-t border-secondary px-2 py-2 rounded-b-lg">
          {/* Start button - only visible if mission has not started yet and start time has passed */}
          {(!mission.status || mission.status === 'accepted') && hasStartTimePassed && (
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
    }

    // For conciergeries in calendar view
    if (userType === 'conciergerie' && hasEmployeeAssigned) {
      // If mission is started, only show complete button
      if (isStarted) {
        return (
          <div className="flex justify-end gap-2 bg-background border-t border-secondary px-2 py-2 rounded-b-lg">
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
          </div>
        );
      }

      // If mission is not started and is own mission, show appropriate buttons
      if (isOwnMission) {
        const showCompleteButton = hasStartTimePassed;

        return (
          <div className="flex justify-end gap-2 bg-background border-t border-secondary px-2 py-2 rounded-b-lg">
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
            {showCompleteButton && (
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

    return null;
  }

  // For non-calendar view (missions page)
  // Conciergerie actions for their own missions
  if (!isEmployee && isOwnMission) {
    return (
      <div className="flex justify-end gap-2 bg-background border-t border-secondary px-2 py-2 rounded-b-lg">
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
        {hasEmployeeAssigned && (mission.status !== 'started' || isOwnMission) && (
          <button
            onClick={onRemoveEmployee}
            className="flex flex-col items-center p-2 w-20 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
          >
            <IconCancel />
            Annuler
          </button>
        )}
      </div>
    );
  }

  // No buttons for other scenarios
  return null;
}
