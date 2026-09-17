'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import type { Mission } from '@/app/types/dataTypes';
import { actionButtonBarClassName, actionButtonClassName, cn } from '@/app/utils/className';
import { isMissionEditable, isPartOfMission } from '@/app/utils/missionFilters';
import { calculateEmployeePointsForDay, calculateMissionPoints, MAX_POINTS_PER_DAY } from '@/app/utils/task';
import {
  IconAlertTriangle,
  IconCancel,
  IconCheck,
  IconPencil,
  IconPlayerPlay,
  IconTrash,
  IconUserPlus,
} from '@tabler/icons-react';
import { useMemo } from 'react';

type MissionActionsProps = {
  mission: Mission;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveEmployee: () => void;
  onAcceptMission: () => void;
  onAcceptMission2?: () => void;
  onAssignSecondProvider?: () => void;
  onRemoveSecondProvider?: () => void;
  onStartMission: () => void;
  onCompleteMission: () => void;
};

export default function MissionActions({
  mission,
  onEdit,
  onDelete,
  onRemoveEmployee,
  onAcceptMission,
  onAcceptMission2,
  onStartMission,
  onCompleteMission,
}: MissionActionsProps) {
  const { conciergerieName, employeeName, isConciergerie, isEmployee } = useAuth();
  const { missions } = useMissions();

  // Check if the current time is after the mission start time
  const now = new Date();
  const hasStartTimePassed = now > mission.startDateTime;
  const isMissionInPast = mission.endDateTime < now;
  const isOwnMission = isConciergerie && mission.conciergerieName === conciergerieName;
  const currentEmployeeId = isEmployee ? employeeName : undefined;
  const isCurrentEmployee = isPartOfMission(mission, currentEmployeeId);
  const canAcceptMission = isEmployee && !mission.employeeId && !isMissionInPast;
  const canAcceptMission2 =
    isEmployee &&
    mission.employeeId &&
    !mission.employeeId2 &&
    !isMissionInPast &&
    mission.employeeId !== currentEmployeeId;
  const isAccepted = mission.status === 'accepted';
  const isStarted = mission.status === 'started';
  const isCompleted = mission.status === 'completed';

  // Calculate the total points the employee has for each day of the mission
  const hasExceededPoints = useMemo(() => {
    if (!canAcceptMission || !currentEmployeeId) return false;

    // Get the mission points
    const { pointsPerDay } = calculateMissionPoints(mission);

    // Create dates for the range
    const currentDate = new Date(mission.startDateTime);
    currentDate.setHours(0, 0, 0, 0);

    const lastDate = new Date(mission.endDateTime);
    lastDate.setHours(0, 0, 0, 0);

    let maxPointsForAnyDay = 0;

    // Check each day in the range
    while (currentDate <= lastDate) {
      const pointsForDay = calculateEmployeePointsForDay(currentEmployeeId, currentDate, missions);

      // Keep track of the maximum points for any day
      maxPointsForAnyDay = Math.max(maxPointsForAnyDay, pointsForDay);

      // If adding this mission would exceed max points per day, return true
      if (pointsForDay + pointsPerDay > MAX_POINTS_PER_DAY) return true;

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return false;
  }, [canAcceptMission, currentEmployeeId, mission, missions]);

  // For employees in calendar view
  return isCurrentEmployee && hasStartTimePassed && (isAccepted || isStarted) ? (
    <div className={actionButtonBarClassName}>
      {/* Start button - only visible if mission has not started yet and start time has passed */}
      {isAccepted && (
        <button onClick={onStartMission} className={cn(actionButtonClassName, 'bg-blue-100 text-blue-700')}>
          <IconPlayerPlay />
          Démarrer
        </button>
      )}

      {/* Finish button - only visible if mission is started */}
      {isStarted && (
        <button onClick={onCompleteMission} className={cn(actionButtonClassName, 'bg-green-100 text-green-700')}>
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
          Le maximum de {MAX_POINTS_PER_DAY} points/jour est déjà atteint !
        </div>
      )}
      <button
        onClick={onAcceptMission}
        disabled={hasExceededPoints}
        className={cn(
          actionButtonClassName,
          hasExceededPoints ? 'bg-gray-100 text-gray-400/50 cursor-not-allowed' : 'bg-green-100 text-green-700',
        )}
      >
        <IconCheck />
        Accepter
      </button>
    </div>
  ) : canAcceptMission2 && onAcceptMission2 ? (
    <div className={actionButtonBarClassName}>
      <button onClick={onAcceptMission2} className={cn(actionButtonClassName, 'bg-purple-100 text-purple-700')}>
        <IconUserPlus />
        Rejoindre
      </button>
    </div>
  ) : isOwnMission && !isCompleted ? (
    <div className={actionButtonBarClassName}>
      {isMissionEditable(mission) && (
        <>
          <button onClick={onEdit} className={actionButtonClassName} data-edit-button>
            <IconPencil />
            Modifier
          </button>
          <button onClick={onDelete} className={cn(actionButtonClassName, 'bg-red-100 text-red-700')}>
            <IconTrash />
            Supprimer
          </button>
        </>
      )}
      {isAccepted && !isStarted && (
        <button onClick={onRemoveEmployee} className={cn(actionButtonClassName, 'bg-yellow-100 text-yellow-700')}>
          <IconCancel />
          Annuler
        </button>
      )}
      {(isAccepted || isStarted) && (
        <button onClick={onCompleteMission} className={cn(actionButtonClassName, 'bg-green-100 text-green-700')}>
          <IconCheck />
          Terminer
        </button>
      )}
    </div>
  ) : null;
}
