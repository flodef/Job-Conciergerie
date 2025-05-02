'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { Mission } from '@/app/types/dataTypes';
import { actionButtonBarClassName, actionButtonClassName } from '@/app/utils/className';
import { calculateEmployeePointsForDay, calculateMissionPoints } from '@/app/utils/task';
import { IconAlertTriangle, IconCancel, IconCheck, IconPencil, IconPlayerPlay, IconTrash } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import { useMemo } from 'react';

type MissionActionsProps = {
  mission: Mission;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveEmployee: () => void;
  onAcceptMission: () => void;
  onStartMission: () => void;
  onCompleteMission: () => void;
};

export default function MissionActions({
  mission,
  onEdit,
  onDelete,
  onRemoveEmployee,
  onAcceptMission,
  onStartMission,
  onCompleteMission,
}: MissionActionsProps) {
  const { userType, conciergerieName, employeeName } = useAuth();
  const { missions } = useMissions();

  // Check if the current time is after the mission start time
  const now = new Date();
  const hasStartTimePassed = now > mission.startDateTime;
  const isOwnMission = userType === 'conciergerie' && mission.conciergerieName === conciergerieName;
  const isCurrentEmployee = mission.employeeId === employeeName;
  const canAcceptMission = userType === 'employee' && !mission.employeeId;
  const isAccepted = mission.status === 'accepted';
  const isStarted = mission.status === 'started';
  const isCompleted = mission.status === 'completed';

  // Calculate the total points the employee has for each day of the mission
  const hasExceededPoints = useMemo(() => {
    if (!canAcceptMission || !employeeName) return false;

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
      const pointsForDay = calculateEmployeePointsForDay(employeeName, new Date(currentDate), missions);

      // Keep track of the maximum points for any day
      maxPointsForAnyDay = Math.max(maxPointsForAnyDay, pointsForDay);

      // If adding this mission would exceed 3 points for this day, return true
      if (pointsForDay + pointsPerDay > 3) return true;

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return false;
  }, [canAcceptMission, employeeName, mission, missions]);

  // For employees in calendar view
  return isCurrentEmployee && hasStartTimePassed && (isAccepted || isStarted) ? (
    <div className={actionButtonBarClassName}>
      {/* Start button - only visible if mission has not started yet and start time has passed */}
      {isAccepted && (
        <button onClick={onStartMission} className={clsx(actionButtonClassName, 'bg-blue-100 text-blue-700')}>
          <IconPlayerPlay />
          Démarrer
        </button>
      )}

      {/* Finish button - only visible if mission is started */}
      {isStarted && (
        <button onClick={onCompleteMission} className={clsx(actionButtonClassName, 'bg-green-100 text-green-700')}>
          <IconCheck />
          Terminer
        </button>
      )}
    </div>
  ) : canAcceptMission ? (
    <div className={actionButtonBarClassName}>
      {hasExceededPoints && (
        <div className="flex items-center text-center p-2 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          <IconAlertTriangle size={16} className="mr-2 w-8 h-8" />
          Le maximum de 3 points/jour est déjà atteint !
        </div>
      )}
      <button
        onClick={onAcceptMission}
        disabled={hasExceededPoints}
        className={clsx(
          actionButtonClassName,
          hasExceededPoints ? 'bg-gray-100 text-gray-400/50 cursor-not-allowed' : 'bg-green-100 text-green-700',
        )}
      >
        <IconCheck />
        Accepter
      </button>
    </div>
  ) : isOwnMission && !isCompleted ? (
    <div className={actionButtonBarClassName}>
      <button onClick={onEdit} className={actionButtonClassName} data-edit-button>
        <IconPencil />
        Modifier
      </button>
      <button onClick={onDelete} className={clsx(actionButtonClassName, 'bg-red-100 text-red-700')}>
        <IconTrash />
        Supprimer
      </button>
      {isAccepted && !isStarted && (
        <button onClick={onRemoveEmployee} className={clsx(actionButtonClassName, 'bg-yellow-100 text-yellow-700')}>
          <IconCancel />
          Annuler
        </button>
      )}
      {(isAccepted || isStarted) && (
        <button onClick={onCompleteMission} className={clsx(actionButtonClassName, 'bg-green-100 text-green-700')}>
          <IconCheck />
          Terminer
        </button>
      )}
    </div>
  ) : null;
}
