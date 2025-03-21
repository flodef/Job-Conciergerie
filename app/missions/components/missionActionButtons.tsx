'use client';

import { Mission } from '@/app/types/types';
import { IconCancel, IconCheck, IconPencil, IconPlayerPlay, IconTrash } from '@tabler/icons-react';

type MissionActionButtonsProps = {
  mission: Mission;
  isEmployee: boolean;
  isReadOnly: boolean;
  isFromCalendar: boolean;
  currentEmployeeId?: string;
  userType: string;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveEmployee: () => void;
  onStartMission: (missionId: string) => void;
  onCompleteMission: (missionId: string) => void;
  onClose: () => void;
};

export default function MissionActionButtons({
  mission,
  isEmployee,
  isReadOnly,
  isFromCalendar,
  currentEmployeeId,
  userType,
  onEdit,
  onDelete,
  onRemoveEmployee,
  onStartMission,
  onCompleteMission,
  onClose,
}: MissionActionButtonsProps) {
  // Check if the current time is after the mission start time
  const now = new Date();
  const startDate = new Date(mission.startDateTime);
  const hasStartTimePassed = now > startDate;
  const isStarted = mission.status === 'started';
  const isOwnMission = !isReadOnly;
  const hasEmployeeAssigned = !!mission.employeeId;
  const isCurrentEmployee = mission.employeeId === currentEmployeeId;

  // No buttons for calendar view if not the right user type
  if (isFromCalendar) {
    // For employees in calendar view
    if (isEmployee && isCurrentEmployee) {
      return (
        <div className="sticky bottom-0 bg-background border-t border-secondary pt-2">
          <div className="flex justify-end gap-2">
            {/* Start button - only visible if mission has not started yet and start time has passed */}
            {(!mission.status || mission.status === 'pending') && hasStartTimePassed && (
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
        </div>
      );
    }

    // For conciergeries in calendar view
    if (userType === 'conciergerie' && hasEmployeeAssigned) {
      // If mission is started, only show complete button
      if (isStarted) {
        return (
          <div className="sticky bottom-0 bg-background border-t border-secondary pt-2">
            <div className="flex justify-end gap-2">
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
          </div>
        );
      }

      // If mission is not started and is own mission, show appropriate buttons
      if (isOwnMission) {
        const showCompleteButton = hasStartTimePassed;

        return (
          <div className="sticky bottom-0 bg-background border-t border-secondary pt-2">
            <div className="flex justify-end gap-2">
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
      <div className="sticky bottom-0 bg-background border-t border-secondary pt-2">
        <div className="flex justify-end gap-2">
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
      </div>
    );
  }

  // No buttons for other scenarios
  return null;
}
