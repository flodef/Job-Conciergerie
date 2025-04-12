'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { Mission } from '@/app/types/dataTypes';
import { actionButtonClassName } from '@/app/utils/className';
import { calculateEmployeePointsForDay, calculateMissionPoints } from '@/app/utils/task';
import { IconAlertTriangle, IconCancel, IconCheck, IconPencil, IconPlayerPlay, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';

type MissionActionsProps = {
  mission: Mission;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveEmployee: () => void;
  onAcceptMission: () => void;
  onStartMission: () => void;
  onCompleteMission: () => void;
  onClose: () => void;
};

export default function MissionActions({
  mission,
  onEdit,
  onDelete,
  onRemoveEmployee,
  onAcceptMission,
  onStartMission,
  onCompleteMission,
  onClose,
}: MissionActionsProps) {
  const { userId, userType, conciergerieName } = useAuth();
  const { missions } = useMissions();

  // Check if the current time is after the mission start time
  const now = new Date();
  const hasStartTimePassed = now > mission.startDateTime;
  const isOwnMission = userType === 'conciergerie' && mission.conciergerieName === conciergerieName;
  const isCurrentEmployee = mission.employeeId === userId;
  const canAcceptMission = userType === 'employee' && !mission.employeeId;
  const isAccepted = mission.status === 'accepted';
  const isStarted = mission.status === 'started';
  const isCompleted = mission.status === 'completed';

  // Calculate the total points the employee has for each day of the mission
  const hasExceededPoints = useMemo(() => {
    if (!canAcceptMission || !userId) return false;

    // Get the mission points
    const { pointsPerDay } = calculateMissionPoints(mission);

    // Check each day of the mission to see if accepting would exceed 3 points per day
    const startDate = new Date(mission.startDateTime);
    const endDate = new Date(mission.endDateTime);

    // Create dates for the range
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const lastDate = new Date(endDate);
    lastDate.setHours(0, 0, 0, 0);

    let maxPointsForAnyDay = 0;

    // Check each day in the range
    while (currentDate <= lastDate) {
      const pointsForDay = calculateEmployeePointsForDay(userId, new Date(currentDate), missions);

      // Keep track of the maximum points for any day
      maxPointsForAnyDay = Math.max(maxPointsForAnyDay, pointsForDay);

      // If adding this mission would exceed 3 points for this day, return true
      if (pointsForDay + pointsPerDay > 3) return true;

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return false;
  }, [canAcceptMission, userId, mission, missions]);

  // For employees in calendar view
  return isCurrentEmployee && hasStartTimePassed && (isAccepted || isStarted) ? (
    <div className={actionButtonClassName}>
      {/* Start button - only visible if mission has not started yet and start time has passed */}
      {isAccepted && (
        <button
          onClick={() => {
            onStartMission();
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
            onCompleteMission();
            onClose();
          }}
          className="flex flex-col items-center p-2 w-20 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
        >
          <IconCheck />
          Terminer
        </button>
      )}
    </div>
  ) : canAcceptMission ? (
    <div className={actionButtonClassName}>
      {hasExceededPoints && (
        <div className="flex items-center text-center p-2 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          <IconAlertTriangle size={16} className="mr-2 w-8 h-8" />
          Le maximum de 3 points/jour est déjà atteint !
        </div>
      )}
      <button
        onClick={onAcceptMission}
        disabled={hasExceededPoints}
        className={`flex flex-col items-center p-2 w-20 rounded-lg ${
          hasExceededPoints
            ? 'bg-gray-100 text-gray-400/50 cursor-not-allowed'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        }`}
      >
        <IconCheck />
        Accepter
      </button>
    </div>
  ) : isOwnMission && !isCompleted ? (
    <div className={actionButtonClassName}>
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
            onCompleteMission();
            onClose();
          }}
          className="flex flex-col items-center p-2 w-20 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
        >
          <IconCheck />
          Terminer
        </button>
      )}
    </div>
  ) : null;
}
