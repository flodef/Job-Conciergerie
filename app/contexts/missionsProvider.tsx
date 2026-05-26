'use client';

import {
  claimLateNotificationForMission,
  createNewMission,
  deleteMissionData,
  fetchAllMissions,
  updateMissionData,
} from '@/app/actions/mission';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useFetchTime } from '@/app/hooks/useFetchTime';
import { Employee, Home, Mission, MissionStatus } from '@/app/types/dataTypes';
import { formatDateTime } from '@/app/utils/date';
import { EmailSender } from '@/app/utils/emailSender';
import { generateSimpleId } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import { Page } from '@/app/utils/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

type MissionsContextType = {
  isLoading: boolean;
  missions: Mission[];
  homes: Home[];
  getLateMissions: (missions: Mission[]) => Mission[];
  fetchMissions: () => Promise<boolean>;
  addMission: (mission: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName'>) => Promise<boolean>;
  updateMission: (mission: Mission) => Promise<{ success: boolean; employeeNotified: boolean }>;
  deleteMission: (id: string) => Promise<{ success: boolean; employeeNotified: boolean }>;
  cancelMission: (id: string) => Promise<{ success: boolean; employeeNotified: boolean }>;
  acceptMission: (id: string) => Promise<{ success: boolean; employeeNotified: boolean }>;
  startMission: (id: string) => Promise<boolean>;
  completeMission: (id: string) => Promise<boolean>;
  shouldShowAcceptWarning: boolean | undefined;
  setShouldShowAcceptWarning: (show: boolean) => void;
  missionExists: (
    mission: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName' | 'hours' | 'employeeId' | 'status'>,
    id?: string,
  ) => boolean;
};

const MissionsContext = createContext<MissionsContextType | undefined>(undefined);

export function MissionsProviderWrapper({ children }: { children: ReactNode }) {
  return <MissionsProvider>{children}</MissionsProvider>;
}

function MissionsProvider({ children }: { children: ReactNode }) {
  const { userData, conciergerieName, getUserKey, findConciergerie, findEmployee, isLoading: authLoading } = useAuth();
  const { homes, fetchHomes } = useHomes();
  const { needsRefresh, updateFetchTime } = useFetchTime();
  const needsRefreshMissions = needsRefresh[Page.Missions] || needsRefresh[Page.Calendar];

  const [isLoading, setIsLoading] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [shouldShowAcceptWarning, setShouldShowAcceptWarning] = useLocalStorage('show_accept_mission_warning', true);

  const getLateMissions = (missions: Mission[]) => {
    const now = new Date();
    return missions.filter(mission => mission.status !== 'completed' && new Date(mission.endDateTime) < now);
  };

  /**
   * Checks for missions that haven't been completed on time and sends notifications
   * to the conciergeries that have the missionsEndedWithoutCompletion setting enabled
   */
  const checkForLateMissions = useCallback(
    async (missions: Mission[]) => {
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
        const conciergerie = findConciergerie(conciergerieName);

        // Only send notifications if the conciergerie has the setting enabled
        if (!conciergerie?.notificationSettings?.missionsEndedWithoutCompletion) continue;

        // Send a notification for each late mission - but only ONCE per mission ever.
        // The DB performs an atomic UPDATE on `late_notified_at` so concurrent fetches
        // (multiple users / tabs) cannot trigger duplicate emails.
        for (const mission of conciergerieMissions) {
          const home = homes.find(h => h.id === mission.homeId);
          const employee = findEmployee(mission.employeeId);
          if (!home || !employee) continue;

          const claimed = await claimLateNotificationForMission(mission.id);
          if (claimed) await EmailSender.sendLateCompletionEmail({}, mission, home, employee, conciergerie);
        }
      }
    },
    [homes, findEmployee, findConciergerie],
  );

  // Core fetch logic shared between auto-fetch and manual refresh
  const isFetching = useRef(false);

  const fetchMissionsCore = useCallback(() => {
    if (isFetching.current) return Promise.resolve(false);

    // Skip fetching if offline - preserve existing data
    if (!navigator.onLine) {
      console.warn('Offline mode: skipping missions fetch, using cached data');
      return Promise.resolve(false);
    }

    isFetching.current = true;
    console.warn('Loading missions from database...');
    setIsLoading(missions.length === 0);

    return fetchHomes().then(homesSuccess => {
      if (!homesSuccess) {
        setIsLoading(false);
        isFetching.current = false;
        return false;
      }
      return fetchAllMissions()
        .then(fetchedMissions => {
          if (fetchedMissions) {
            setMissions(fetchedMissions);
            checkForLateMissions(fetchedMissions);
            updateFetchTime([Page.Missions, Page.Calendar, Page.Homes]);
          }
          setIsLoading(false);
          isFetching.current = false;
          return !!fetchedMissions;
        })
        .catch(error => {
          // Silently fail when offline - cached data will be used if available
          console.warn('Failed to fetch missions (possibly offline):', error);
          setIsLoading(false);
          isFetching.current = false;
          return false;
        });
    });
  }, [fetchHomes, checkForLateMissions, missions.length, updateFetchTime]);

  // Fetch missions when needed (initial load or refresh triggered) - only for authenticated users
  useEffect(() => {
    if (authLoading || !needsRefreshMissions || !userData) return;
    fetchMissionsCore();
  }, [authLoading, needsRefreshMissions, userData, fetchMissionsCore]);

  // Manual refresh function - exposes the core function
  const fetchMissions = useCallback(() => fetchMissionsCore(), [fetchMissionsCore]);

  const addMission = async (missionData: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName'>) => {
    if (!conciergerieName || missionExists(missionData)) return false;

    const newMission: Mission = {
      ...missionData,
      id: generateSimpleId(),
      employeeId: null,
      status: null,
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
      return { success: false, employeeNotified: false };

    // Find the existing mission to compare changes
    const existingMission = missions.find(m => m.id === updatedMission.id);
    if (!existingMission) return { success: false, employeeNotified: false };

    // Check if we need to notify an employee about the changes
    const employee = findEmployee(existingMission.employeeId);

    // Create a list of changes to include in the email
    const changes: string[] = [];

    // Compare mission properties to identify changes
    if (new Date(existingMission.startDateTime).getTime() !== new Date(updatedMission.startDateTime).getTime())
      changes.push(`Date/heure de début modifiée: ${formatDateTime(updatedMission.startDateTime)}`);

    if (new Date(existingMission.endDateTime).getTime() !== new Date(updatedMission.endDateTime).getTime())
      changes.push(`Date/heure de fin modifiée: ${formatDateTime(updatedMission.endDateTime)}`);

    // Compare tasks
    const existingTasks = [...existingMission.tasks].sort().join(', ');
    const updatedTasks = [...updatedMission.tasks].sort().join(', ');
    if (existingTasks !== updatedTasks) changes.push(`Tâches modifiées: ${updatedTasks}`);

    // Special case for homes (home might be different)
    const existingHome = homes.find(h => h.id === existingMission.homeId);
    const updatedHome = homes.find(h => h.id === updatedMission.homeId);
    if (existingMission.homeId !== updatedMission.homeId && existingHome && updatedHome)
      changes.push(`Bien modifié: ${updatedHome.title}`);

    const home = updatedHome || existingHome;

    // First update the mission
    const success = await setMissionData(updatedMission.id, {
      ...updatedMission,
      employeeId: existingMission.employeeId,
      status: existingMission.status,
    });
    if (!success) return { success: false, employeeNotified: false };

    // If successful and there's an employee assigned who has notifications enabled, send email
    const conciergerie = findConciergerie(updatedMission.conciergerieName);
    const employeeNotified = !!(
      employee?.notificationSettings?.missionChanged &&
      home &&
      changes.length > 0 &&
      conciergerie
    );
    if (employeeNotified)
      await EmailSender.sendMissionUpdatedEmail({}, updatedMission, home!, employee!, conciergerie!, changes);

    return { success: true, employeeNotified };
  };

  const deleteMission = async (id: string) => {
    // Check if mission belongs to current conciergerie (only creator conciergerie can delete)
    const missionToDelete = missions.find(m => m.id === id && m.conciergerieName === conciergerieName);
    if (!missionToDelete) return { success: false, employeeNotified: false };

    const success = await deleteMissionData(id);
    if (!success) return { success: false, employeeNotified: false };

    setMissions(prev => prev.filter(mission => mission.id !== id));

    // Check if we need to notify an employee about the deletion
    const employee = findEmployee(missionToDelete.employeeId);
    const home = homes.find(h => h.id === missionToDelete.homeId);
    const conciergerie = findConciergerie(missionToDelete.conciergerieName);

    const employeeNotified = !!(employee?.notificationSettings?.missionDeleted && home && conciergerie);
    if (employeeNotified)
      await EmailSender.sendMissionRemovedEmail({}, missionToDelete, home!, employee!, conciergerie!, 'deleted');

    return { success: true, employeeNotified };
  };

  const cancelMission = async (id: string) => {
    // Check if mission belongs to current conciergerie (only creator conciergerie can cancel)
    const missionToCancel = missions.find(m => m.id === id && m.conciergerieName === conciergerieName);
    if (!missionToCancel) return { success: false, employeeNotified: false };

    const success = await setMissionData(id, { ...missionToCancel, employeeId: null, status: null });
    if (!success) return { success: false, employeeNotified: false };

    // Check if we need to notify an employee about the cancellation
    const employee = findEmployee(missionToCancel.employeeId);
    const home = homes.find(h => h.id === missionToCancel.homeId);
    const conciergerie = findConciergerie(missionToCancel.conciergerieName);

    const employeeNotified = !!(employee?.notificationSettings?.missionsCanceled && home && conciergerie);
    if (employeeNotified)
      await EmailSender.sendMissionRemovedEmail({}, missionToCancel, home!, employee!, conciergerie!, 'canceled');

    return { success: true, employeeNotified };
  };

  const acceptMission = async (id: string) => {
    const missionToAccept = missions.find(m => m.id === id);
    if (!missionToAccept) return { success: false, employeeNotified: false };

    const employee = userData as Employee;
    if (!employee) return { success: false, employeeNotified: false };

    const success = await setMissionData(id, {
      ...missionToAccept,
      employeeId: getUserKey(employee),
      status: 'accepted',
    });
    if (!success) return { success: false, employeeNotified: false };

    // Notify the conciergerie
    await sendMissionStatusNotification(missionToAccept, employee, 'accepted');

    // Send confirmation email to the employee
    const home = homes.find(h => h.id === missionToAccept.homeId);
    const conciergerie = findConciergerie(missionToAccept.conciergerieName);
    const employeeNotified = !!(employee.notificationSettings?.acceptedMissions && home && conciergerie);
    if (employeeNotified)
      await EmailSender.sendMissionAcceptanceEmail({}, missionToAccept, home!, employee, conciergerie!);

    return { success: true, employeeNotified };
  };

  const startMission = async (id: string) => {
    const missionToStart = missions.find(m => m.id === id);
    const employee = userData as Employee;

    // Check if mission has been accepted by current employee
    if (!missionToStart?.employeeId || !employee || getUserKey(employee) !== missionToStart.employeeId) return false;

    // Only allow starting if the mission is accepted and the start time has passed
    if (new Date() < new Date(missionToStart.startDateTime)) return false;

    const success = await setMissionData(id, { ...missionToStart, status: 'started' });
    if (!success) return false;

    // Notify the conciergerie
    await sendMissionStatusNotification(missionToStart, employee, 'started');

    return true;
  };

  const completeMission = async (id: string) => {
    // Check if mission status has been updated (mission is accepted or started)
    const missionToComplete = missions.find(m => m.id === id && m.status);
    const employee = userData as Employee;
    if (!missionToComplete?.employeeId || !employee) return false;

    // Check if mission belongs to current employee or conciergerie is trying to complete the mission for the employee
    if (
      getUserKey(employee) !== missionToComplete.employeeId &&
      missionToComplete.conciergerieName !== conciergerieName
    )
      return false;

    const success = await setMissionData(id, { ...missionToComplete, status: 'completed' });
    if (!success) return false;

    // Notify the conciergerie
    await sendMissionStatusNotification(missionToComplete, employee, 'completed');

    return true;
  };

  const setMissionData = async (id: string, mission: Mission) => {
    const updated = await updateMissionData(id, mission);
    if (!updated) return false;

    setMissions(prev => prev.map(mission => (mission.id === updated.id ? { ...updated } : mission)));
    return true;
  };

  // Check if a mission with the same home, tasks, start date, and end date already exists
  const missionExists = (
    missionData: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName' | 'hours' | 'employeeId' | 'status'>,
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
  const sendMissionStatusNotification = async (mission: Mission, employee: Employee, status: MissionStatus) => {
    // Get all conciergeries to find the one that owns this mission
    const conciergerie = findConciergerie(mission.conciergerieName);

    // Determine which notification setting to check based on status
    const notificationSetting = {
      accepted: 'acceptedMissions',
      started: 'startedMissions',
      completed: 'completedMissions',
    }[status] as 'acceptedMissions' | 'startedMissions' | 'completedMissions';

    // Get the home and employee data for this mission
    const home = homes.find(h => h.id === mission.homeId);

    // If we have all the required data, send the notification email
    if (home && conciergerie?.notificationSettings?.[notificationSetting])
      await EmailSender.sendMissionStatusEmail({}, mission, home, employee, conciergerie, status);
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
