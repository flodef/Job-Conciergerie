'use client';

import {
  sendLateCompletionEmail,
  sendMissionAcceptanceToEmployeeEmail,
  sendMissionRemovedToEmployeeEmail,
  sendMissionStatusChangeEmail,
  sendMissionUpdatedToEmployeeEmail,
} from '@/app/actions/email';
import { createNewMission, deleteMissionData, fetchAllMissions, updateMissionData } from '@/app/actions/mission';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { Employee, Home, Mission, MissionStatus } from '@/app/types/dataTypes';
import { formatDateTime } from '@/app/utils/date';
import { generateSimpleId } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import { createContext, ReactNode, useContext, useState } from 'react';

type MissionsContextType = {
  isLoading: boolean;
  missions: Mission[];
  homes: Home[];
  getLateMissions: (missions: Mission[]) => Mission[];
  fetchMissions: () => Promise<boolean>;
  addMission: (mission: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName'>) => Promise<boolean>;
  updateMission: (mission: Mission) => Promise<boolean>;
  deleteMission: (id: string) => Promise<boolean>;
  cancelMission: (id: string) => Promise<boolean>;
  acceptMission: (id: string) => Promise<boolean>;
  startMission: (id: string) => Promise<boolean>;
  completeMission: (id: string) => Promise<boolean>;
  shouldShowAcceptWarning: boolean | undefined;
  setShouldShowAcceptWarning: (show: boolean) => void;
  missionExists: (mission: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName' | 'hours'>, id?: string) => boolean;
};

const MissionsContext = createContext<MissionsContextType | undefined>(undefined);

export function MissionsProviderWrapper({ children }: { children: ReactNode }) {
  return <MissionsProvider>{children}</MissionsProvider>;
}

function MissionsProvider({ children }: { children: ReactNode }) {
  const { getUserData, conciergeries, conciergerieName, employees } = useAuth();
  const { homes, fetchHomes } = useHomes();

  const [isLoading, setIsLoading] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [shouldShowAcceptWarning, setShouldShowAcceptWarning] = useLocalStorage('show_accept_mission_warning', true);

  const getLateMissions = (missions: Mission[]) => {
    const now = new Date();
    return missions.filter(
      mission => mission.employeeId && mission.status !== 'completed' && new Date(mission.endDateTime) < now,
    );
  };

  const fetchMissions = async () => {
    console.warn('Loading missions from database...');

    setIsLoading(missions.length === 0);
    let isSuccess = false;
    if (await fetchHomes()) {
      const fetchedMissions = await fetchAllMissions();
      if (fetchedMissions) {
        setMissions(fetchedMissions);
        isSuccess = true;

        // Check for late missions and notify conciergeries if needed
        checkForLateMissions(fetchedMissions);
      }
    }

    setIsLoading(false);
    return isSuccess;
  };

  const addMission = async (missionData: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName'>) => {
    if (!conciergerieName || missionExists(missionData)) return false;

    const newMission: Mission = {
      ...missionData,
      id: generateSimpleId(),
      conciergerieName,
      modifiedDate: new Date(),
    };

    const createdMission = await createNewMission(newMission);
    if (!createdMission) return false;

    setMissions(prev => [...prev, createdMission]);
    return true;
  };

  const updateMission = async (updatedMission: Mission) => {
    if (
      !conciergerieName ||
      !updatedMission.id ||
      updatedMission.conciergerieName !== conciergerieName ||
      missionExists(updatedMission, updatedMission.id)
    )
      return false;

    // Find the existing mission to compare changes
    const existingMission = missions.find(m => m.id === updatedMission.id);
    if (!existingMission) return false;

    // Check if we need to notify an employee about the changes
    const employeeId = existingMission.employeeId;
    const employee = employeeId ? employees.find(e => e.id === employeeId) : null;

    // Create a list of changes to include in the email
    const changes: string[] = [];

    // Compare mission properties to identify changes
    if (new Date(existingMission.startDateTime).getTime() !== new Date(updatedMission.startDateTime).getTime()) {
      changes.push(`Date/heure de début modifiée: ${formatDateTime(updatedMission.startDateTime)}`);
    }

    if (new Date(existingMission.endDateTime).getTime() !== new Date(updatedMission.endDateTime).getTime()) {
      changes.push(`Date/heure de fin modifiée: ${formatDateTime(updatedMission.endDateTime)}`);
    }

    // Compare tasks
    const existingTasks = [...existingMission.tasks].sort().join(', ');
    const updatedTasks = [...updatedMission.tasks].sort().join(', ');
    if (existingTasks !== updatedTasks) {
      changes.push(`Tâches modifiées: ${updatedTasks}`);
    }

    // Special case for homes (home might be different)
    const existingHome = homes.find(h => h.id === existingMission.homeId);
    const updatedHome = homes.find(h => h.id === updatedMission.homeId);
    if (existingMission.homeId !== updatedMission.homeId && existingHome && updatedHome) {
      changes.push(`Bien modifié: ${updatedHome.title}`);
    }

    const home = updatedHome || existingHome;

    // First update the mission
    const success = await setMissionData(updatedMission.id, {
      ...updatedMission,
      employeeId,
      status: existingMission.status,
    });
    if (!success) return false;

    // If successful and there's an employee assigned who has notifications enabled, send email
    if (employee?.notificationSettings?.missionChanged && home && changes.length > 0)
      await sendMissionUpdatedToEmployeeEmail(updatedMission, home, employee, conciergerieName, changes);

    return true;
  };

  const deleteMission = async (id: string) => {
    // Check if mission belongs to current conciergerie (only creator conciergerie can delete)
    const missionToDelete = missions.find(m => m.id === id && m.conciergerieName === conciergerieName);
    if (!missionToDelete) return false;

    const success = await deleteMissionData(id);
    if (!success) return false;

    setMissions(prev => prev.filter(mission => mission.id !== id));

    // Check if we need to notify an employee about the deletion
    const employee = employees.find(e => e.id === missionToDelete.employeeId);
    const home = homes.find(h => h.id === missionToDelete.homeId);

    // Notify employee before deleting the mission
    if (employee?.notificationSettings?.missionDeleted && home && conciergerieName)
      sendMissionRemovedToEmployeeEmail(missionToDelete, home, employee, conciergerieName, 'deleted');

    return true;
  };

  const cancelMission = async (id: string) => {
    // Check if mission belongs to current conciergerie (only creator conciergerie can cancel)
    const missionToCancel = missions.find(m => m.id === id && m.conciergerieName === conciergerieName);
    if (!missionToCancel) return false;

    const success = await setMissionData(id, { ...missionToCancel, employeeId: undefined, status: undefined });
    if (!success) return false;

    // Check if we need to notify an employee about the cancellation
    const employee = employees.find(e => e.id === missionToCancel.employeeId);
    const home = homes.find(h => h.id === missionToCancel.homeId);

    // Send notification to employee about cancellation
    if (employee?.notificationSettings?.missionsCanceled && home && conciergerieName)
      sendMissionRemovedToEmployeeEmail(missionToCancel, home, employee, conciergerieName, 'canceled');

    return true;
  };

  const acceptMission = async (id: string) => {
    const missionToAccept = missions.find(m => m.id === id);
    if (!missionToAccept) return false;

    const employeeData = getUserData<Employee>();
    if (!employeeData?.id) return false;

    const success = await setMissionData(id, { ...missionToAccept, employeeId: employeeData.id, status: 'accepted' });
    if (!success) return false;

    // Notify the conciergerie
    sendMissionStatusNotification(missionToAccept, employeeData.id, 'accepted');

    // Send confirmation email to the employee
    const home = homes.find(h => h.id === missionToAccept.homeId);
    const conciergerieName = missionToAccept.conciergerieName;
    const employee = employees.find(e => e.id === employeeData.id);
    if (home && conciergerieName && employee?.notificationSettings?.acceptedMissions)
      sendMissionAcceptanceToEmployeeEmail(missionToAccept, home, employee, conciergerieName);

    return true;
  };

  const startMission = async (id: string) => {
    const missionToStart = missions.find(m => m.id === id);
    // Check if mission has been accepted by current employee
    if (!missionToStart || !missionToStart.employeeId || missionToStart.employeeId !== getUserData()?.id) return false;

    // Only allow starting if the mission is accepted and the start time has passed
    if (new Date() < new Date(missionToStart.startDateTime)) return false;

    const success = await setMissionData(id, { ...missionToStart, status: 'started' });
    if (!success) return false;

    // Notify the conciergerie
    sendMissionStatusNotification(missionToStart, missionToStart.employeeId, 'started');

    return true;
  };

  const completeMission = async (id: string) => {
    // Check if mission status has been updated (mission is accepted or started)
    const missionToComplete = missions.find(m => m.id === id && m.status);
    if (!missionToComplete || !missionToComplete.employeeId) return false;

    // Check if mission belongs to current employee or conciergerie is trying to complete the mission for the employee
    if (missionToComplete.employeeId !== getUserData()?.id && missionToComplete.conciergerieName !== conciergerieName)
      return false;

    const success = await setMissionData(id, { ...missionToComplete, status: 'completed' });
    if (!success) return false;

    // Notify the conciergerie
    sendMissionStatusNotification(missionToComplete, missionToComplete.employeeId, 'completed');

    return true;
  };

  const setMissionData = async (id: string, mission: Mission) => {
    const updated = await updateMissionData(id, mission);
    if (!updated) return false;

    setMissions(prev => prev.map(mission => (mission.id === updated.id ? { ...updated } : mission)));
    return true;
  };

  /**
   * Checks for missions that haven't been completed on time and sends notifications
   * to the conciergeries that have the missionsEndedWithoutCompletion setting enabled
   */
  const checkForLateMissions = async (missions: Mission[]) => {
    const lateMissions = getLateMissions(missions);
    if (lateMissions.length === 0) return;

    // Group late missions by conciergerie to avoid sending multiple emails to the same conciergerie
    const missionsByConciergerieMap = new Map<string, Mission[]>();

    lateMissions.forEach(mission => {
      const existing = missionsByConciergerieMap.get(mission.conciergerieName) || [];
      missionsByConciergerieMap.set(mission.conciergerieName, [...existing, mission]);
    });

    // For each conciergerie with late missions
    for (const [conciergerieName, conciergerieMissions] of missionsByConciergerieMap.entries()) {
      // Find the conciergerie object
      const conciergerie = conciergeries?.find(c => c.name === conciergerieName);

      // Only send notifications if the conciergerie has the setting enabled
      if (!conciergerie || !conciergerie.notificationSettings?.missionsEndedWithoutCompletion) continue;

      // Send a notification for each late mission
      for (const mission of conciergerieMissions) {
        const home = homes.find(h => h.id === mission.homeId);
        const employee = employees.find(e => e.id === mission.employeeId);

        if (home && employee) sendLateCompletionEmail(mission, home, employee, conciergerie);
      }
    }
  };

  // Check if a mission with the same home, tasks, start date, and end date already exists
  const missionExists = (
    missionData: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName' | 'hours'>,
    id?: string,
  ): boolean => {
    // Sort tasks to ensure consistent comparison
    const sortedTasks = [...missionData.tasks].sort((a, b) => a.localeCompare(b));

    return missions.some(mission => {
      // Skip the current mission if id is provided (meaning it's an update)
      if (id && mission.id === id) return false;

      // Check if home ID matches
      if (mission.homeId !== missionData.homeId) return false;

      // Check if mission belongs to current conciergerie
      if (mission.conciergerieName !== conciergerieName) return false;

      // Check if start and end dates match (comparing only date and time, not milliseconds)
      const missionStart = new Date(mission.startDateTime);
      const missionEnd = new Date(mission.endDateTime);
      const newStart = new Date(missionData.startDateTime);
      const newEnd = new Date(missionData.endDateTime);

      const startMatches =
        missionStart.getFullYear() === newStart.getFullYear() &&
        missionStart.getMonth() === newStart.getMonth() &&
        missionStart.getDate() === newStart.getDate() &&
        missionStart.getHours() === newStart.getHours() &&
        missionStart.getMinutes() === newStart.getMinutes();

      const endMatches =
        missionEnd.getFullYear() === newEnd.getFullYear() &&
        missionEnd.getMonth() === newEnd.getMonth() &&
        missionEnd.getDate() === newEnd.getDate() &&
        missionEnd.getHours() === newEnd.getHours() &&
        missionEnd.getMinutes() === newEnd.getMinutes();

      if (!startMatches || !endMatches) return false;

      // Check if tasks match (same number and same labels)
      if (mission.tasks.length !== sortedTasks.length) return false;

      // Sort mission tasks for consistent comparison
      const missionSortedTasks = [...mission.tasks].sort((a, b) => a.localeCompare(b));

      // Check if all tasks match
      for (let i = 0; i < sortedTasks.length; i++) {
        if (sortedTasks[i] !== missionSortedTasks[i]) return false;
      }

      // If we got here, all criteria match - this is a duplicate
      return true;
    });
  };

  /**
   * Send a notification email for a mission status change if the conciergerie has the appropriate notification setting enabled
   */
  const sendMissionStatusNotification = (mission: Mission, employeeId: string, status: MissionStatus) => {
    // Get all conciergeries to find the one that owns this mission
    const conciergerie = conciergeries?.find(c => c.name === mission.conciergerieName);

    // Determine which notification setting to check based on status
    const notificationSetting = {
      accepted: 'acceptedMissions',
      started: 'startedMissions',
      completed: 'completedMissions',
    }[status] as 'acceptedMissions' | 'startedMissions' | 'completedMissions';

    // Only proceed if we found the conciergerie and it has the appropriate notification setting enabled
    if (!conciergerie || !conciergerie.notificationSettings?.[notificationSetting]) return;

    // Get the home and employee data for this mission
    const home = homes.find(h => h.id === mission.homeId);
    const employee = employees.find(e => e.id === employeeId);

    // If we have all the required data, send the notification email
    if (home && employee) sendMissionStatusChangeEmail(mission, home, employee, conciergerie, status);
  };

  return (
    <MissionsContext.Provider
      value={{
        isLoading,
        missions,
        homes,
        getLateMissions,
        fetchMissions,
        addMission,
        updateMission,
        deleteMission,
        cancelMission,
        acceptMission,
        startMission,
        completeMission,
        shouldShowAcceptWarning,
        setShouldShowAcceptWarning,
        missionExists,
      }}
    >
      {children}
    </MissionsContext.Provider>
  );
}

export function useMissions() {
  const context = useContext(MissionsContext);
  if (context === undefined) {
    throw new Error('useMissions must be used within a MissionsProvider');
  }
  return context;
}
