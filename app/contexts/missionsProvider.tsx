'use client';

import { createNewMission, deleteMissionData, updateMissionData } from '@/app/actions/mission';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { fetchAllMissions } from '@/app/actions/mission';
import { Employee, Home, Mission } from '@/app/types/dataTypes';
import { generateSimpleId } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import { createContext, ReactNode, useContext, useState } from 'react';

type MissionsContextType = {
  isLoading: boolean;
  missions: Mission[];
  homes: Home[];
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
  missionExists: (mission: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName' | 'hours'>) => boolean;
};

const MissionsContext = createContext<MissionsContextType | undefined>(undefined);

export function MissionsProviderWrapper({ children }: { children: ReactNode }) {
  return <MissionsProvider>{children}</MissionsProvider>;
}

function MissionsProvider({ children }: { children: ReactNode }) {
  const { getUserData, conciergerieName } = useAuth();
  const { homes, fetchHomes } = useHomes();

  const [isLoading, setIsLoading] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [shouldShowAcceptWarning, setShouldShowAcceptWarning] = useLocalStorage('show_accept_mission_warning', true);

  const fetchMissions = async () => {
    console.warn('Loading missions from database...');

    setIsLoading(true);
    let isSuccess = false;
    if (await fetchHomes()) {
      const fetchedMissions = await fetchAllMissions();
      if (fetchedMissions) {
        setMissions(fetchedMissions);
        isSuccess = true;
      }
    }

    setIsLoading(false);
    return isSuccess;
  };

  // Check if a mission with the same home, tasks, start date, and end date already exists
  const missionExists = (missionData: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName' | 'hours'>): boolean => {
    // Sort tasks to ensure consistent comparison
    const sortedTasks = [...missionData.tasks].sort((a, b) => a.localeCompare(b));

    return missions.some(mission => {
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
      missionExists(updatedMission)
    )
      return false;

    return await setMissionData(updatedMission.id, updatedMission);
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

  const acceptMission = async (id: string) => {
    const missionToAccept = missions.find(m => m.id === id);
    if (!missionToAccept) return false;

    const employeeData = getUserData<Employee>();
    if (!employeeData?.id) return false;

    return await setMissionData(id, { ...missionToAccept, employeeId: employeeData.id, status: 'pending' });
  };

  const startMission = async (id: string) => {
    const missionToStart = missions.find(m => m.id === id);
    // Check if mission has been accepted by current employee
    if (!missionToStart || missionToStart.employeeId !== getUserData()?.id) return false;

    // Only allow starting if the mission is pending and the start time has passed
    if (new Date() < new Date(missionToStart.startDateTime)) return false;

    return await setMissionData(id, { ...missionToStart, status: 'started' });
  };

  const completeMission = async (id: string) => {
    // Check if mission status has been updated (mission is pending or started)
    const missionToComplete = missions.find(m => m.id === id && m.status);
    if (!missionToComplete) return false;

    // Check if mission belongs to current employee or conciergerie is trying to complete the mission for the employee
    if (missionToComplete.employeeId !== getUserData()?.id && missionToComplete.conciergerieName !== conciergerieName)
      return false;

    return await setMissionData(id, { ...missionToComplete, status: 'completed' });
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
