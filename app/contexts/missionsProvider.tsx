'use client';

import { sendLateCompletionEmail, sendMissionStatusChangeEmail } from '@/app/actions/email';
import { createNewMission, deleteMissionData, fetchAllMissions, updateMissionData } from '@/app/actions/mission';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { Employee, Home, Mission, MissionStatus } from '@/app/types/dataTypes';
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

  const getLateMissions = (missions: Mission[]) => {
    const now = new Date();
    return missions.filter(
      mission => mission.employeeId && mission.status !== 'completed' && new Date(mission.endDateTime) < now,
    );
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

    return await setMissionData(updatedMission.id, { ...updatedMission, employeeId: undefined, status: undefined });
  };

  const deleteMission = async (id: string) => {
    // Check if mission belongs to current conciergerie (only creator conciergerie can delete)
    const missionToDelete = missions.find(m => m.id === id && m.conciergerieName === conciergerieName);
    if (!missionToDelete) return false;

    const deleted = await deleteMissionData(id);
    if (!deleted) return false;

    setMissions(prev => prev.filter(mission => mission.id !== id));
    return true;
  };

  const cancelMission = async (id: string) => {
    // Check if mission belongs to current conciergerie (only creator conciergerie can cancel)
    const missionToCancel = missions.find(m => m.id === id && m.conciergerieName === conciergerieName);
    if (!missionToCancel) return false;

    return await setMissionData(id, { ...missionToCancel, employeeId: undefined, status: undefined });
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

  const acceptMission = async (id: string) => {
    const missionToAccept = missions.find(m => m.id === id);
    if (!missionToAccept) return false;

    const employeeData = getUserData<Employee>();
    if (!employeeData?.id) return false;

    const success = await setMissionData(id, { ...missionToAccept, employeeId: employeeData.id, status: 'accepted' });

    // If successful, send notification
    if (success) sendMissionStatusNotification(missionToAccept, employeeData.id, 'accepted');

    return success;
  };

  const startMission = async (id: string) => {
    const missionToStart = missions.find(m => m.id === id);
    // Check if mission has been accepted by current employee
    if (!missionToStart || !missionToStart.employeeId || missionToStart.employeeId !== getUserData()?.id) return false;

    // Only allow starting if the mission is accepted and the start time has passed
    if (new Date() < new Date(missionToStart.startDateTime)) return false;

    const success = await setMissionData(id, { ...missionToStart, status: 'started' });

    // If successful, send notification
    if (success) sendMissionStatusNotification(missionToStart, missionToStart.employeeId, 'started');

    return success;
  };

  const completeMission = async (id: string) => {
    // Check if mission status has been updated (mission is accepted or started)
    const missionToComplete = missions.find(m => m.id === id && m.status);
    if (!missionToComplete || !missionToComplete.employeeId) return false;

    // Check if mission belongs to current employee or conciergerie is trying to complete the mission for the employee
    if (missionToComplete.employeeId !== getUserData()?.id && missionToComplete.conciergerieName !== conciergerieName)
      return false;

    const success = await setMissionData(id, { ...missionToComplete, status: 'completed' });

    // If successful, send notification
    if (success) sendMissionStatusNotification(missionToComplete, missionToComplete.employeeId, 'completed');

    return success;
  };

  const setMissionData = async (id: string, mission: Mission) => {
    const updated = await updateMissionData(id, mission);
    if (!updated) return false;

    setMissions(prev => prev.map(mission => (mission.id === updated.id ? { ...updated } : mission)));
    return true;
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
