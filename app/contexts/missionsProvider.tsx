'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { Conciergerie, Employee, HomeData, Mission, MissionStatus } from '@/app/types/types';
import { generateSimpleId } from '@/app/utils/id';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type MissionsContextType = {
  missions: Mission[];
  homes: HomeData[];
  isLoading: boolean;
  addMission: (mission: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName'>) => boolean | void;
  updateMission: (mission: Mission) => boolean | void;
  deleteMission: (id: string) => void;
  removeEmployee: (id: string) => void;
  acceptMission: (id: string) => void;
  startMission: (id: string) => void;
  completeMission: (id: string) => void;
  getConciergerieByName: (name: string) => Conciergerie | undefined;
  getHomeById: (id: string) => HomeData | undefined;
  getEmployeeById: (id: string | undefined) => Employee | undefined;
  shouldShowAcceptWarning: boolean;
  setShouldShowAcceptWarning: (show: boolean) => void;
  missionExists: (
    mission: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName'>,
    excludeMissionId?: string,
  ) => boolean;
};

const MissionsContext = createContext<MissionsContextType | undefined>(undefined);

export function MissionsProviderWrapper({ children }: { children: ReactNode }) {
  return <MissionsProvider>{children}</MissionsProvider>;
}

function MissionsProvider({ children }: { children: ReactNode }) {
  const { getUserData, conciergerieName, conciergeries, employees } = useAuth();
  const { homes } = useHomes();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowAcceptWarning, setShouldShowAcceptWarning] = useState<boolean>(true);

  useEffect(() => {
    const loadMissions = async () => {
      setIsLoading(true);

      // Simulate a small delay to ensure localStorage is properly loaded
      // and to show the loading state for a better user experience
      await new Promise(resolve => setTimeout(resolve, 800));

      const savedMissions = localStorage.getItem('missions');
      if (savedMissions) {
        try {
          const parsedMissions = JSON.parse(savedMissions);
          // Convert string dates back to Date objects
          const missionsWithDates = parsedMissions.map((mission: Mission) => ({
            ...mission,
            startDateTime: new Date(mission.startDateTime),
            endDateTime: new Date(mission.endDateTime),
            modifiedDate: new Date(mission.modifiedDate),
          }));
          setMissions(missionsWithDates);
        } catch (error) {
          console.error('Failed to parse missions from localStorage', error);
        }
      }

      // Load warning preference from localStorage
      const warningPref = localStorage.getItem('show_accept_mission_warning');
      if (warningPref !== null) {
        setShouldShowAcceptWarning(JSON.parse(warningPref));
      }

      setIsLoading(false);
    };

    loadMissions();
  }, []);

  // Save missions to localStorage whenever they change
  useEffect(() => {
    if (missions.length > 0) {
      localStorage.setItem('missions', JSON.stringify(missions));
    }
  }, [missions]);

  // Save warning preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('show_accept_mission_warning', JSON.stringify(shouldShowAcceptWarning));
  }, [shouldShowAcceptWarning]);

  // Check if a mission with the same home, tasks, start date, and end date already exists
  const missionExists = (
    missionData: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName'>,
    excludeMissionId?: string,
  ): boolean => {
    if (!getUserData()) return false;

    // Sort tasks to ensure consistent comparison
    const sortedTasks = [...missionData.tasks].sort((a, b) => a.label.localeCompare(b.label));

    return missions.some(mission => {
      // Skip deleted missions and the mission being edited (if excludeMissionId is provided)
      if (excludeMissionId && mission.id === excludeMissionId) return false;

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

      if (!startMatches || !endMatches) {
        return false;
      }

      // Check if tasks match (same number and same labels)
      if (mission.tasks.length !== sortedTasks.length) {
        return false;
      }

      // Sort mission tasks for consistent comparison
      const missionSortedTasks = [...mission.tasks].sort((a, b) => a.label.localeCompare(b.label));

      // Check if all tasks match
      for (let i = 0; i < sortedTasks.length; i++) {
        if (sortedTasks[i].label !== missionSortedTasks[i].label) {
          return false;
        }
      }

      // If we got here, all criteria match - this is a duplicate
      return true;
    });
  };

  const addMission = (missionData: Omit<Mission, 'id' | 'modifiedDate' | 'conciergerieName'>) => {
    if (!conciergerieName) return;

    // Check if a mission with the same criteria already exists
    if (missionExists(missionData)) {
      // Return false to indicate that the mission wasn't added due to duplication
      return false;
    }

    const newMission: Mission = {
      ...missionData,
      id: generateSimpleId(),
      modifiedDate: new Date(),
      conciergerieName,
    };

    setMissions(prev => [...prev, newMission]);
    return true; // Return true to indicate successful addition
  };

  const updateMission = (updatedMission: Mission) => {
    if (!conciergerieName) return;

    // Only allow updates if the mission was created by the current conciergerie
    if (updatedMission.conciergerieName === conciergerieName) {
      // Check if this would create a duplicate mission (excluding the current mission being updated)
      if (
        missionExists(
          updatedMission,
          updatedMission.id, // Exclude the current mission from the duplicate check
        )
      ) {
        // Return false to indicate that the mission wasn't updated due to duplication
        return false;
      }

      // When editing a mission, remove the employee assignment
      // This returns the mission to the pool of available missions
      setMissions(prev =>
        prev.map(mission =>
          mission.id === updatedMission.id
            ? {
                ...updatedMission,
                employeeId: undefined,
                status: undefined,
                modifiedDate: new Date(),
              }
            : mission,
        ),
      );
      return true; // Return true to indicate successful update
    } else {
      console.error('Cannot update mission: not created by current conciergerie');
      return false;
    }
  };

  const deleteMission = (id: string) => {
    const missionToDelete = missions.find(m => m.id === id);

    // Only allow deletion if the mission was created by the current conciergerie
    if (missionToDelete && missionToDelete.conciergerieName === conciergerieName) {
      setMissions(prev => prev.filter(mission => mission.id !== id));
    } else {
      console.error('Cannot delete mission: not created by current conciergerie');
    }
  };

  const removeEmployee = (id: string) => {
    setMissions(prev =>
      prev.map(mission =>
        mission.id === id
          ? {
              ...mission,
              employeeId: undefined,
              employee: undefined,
              modifiedDate: new Date(),
            }
          : mission,
      ),
    );
  };

  const acceptMission = (id: string) => {
    const missionToAccept = missions.find(m => m.id === id);
    if (!missionToAccept) {
      console.error('Mission not found');
      return;
    }

    const employeeData = getUserData<Employee>();
    if (!employeeData) {
      console.error('No employee data found');
      return;
    }

    if (!employeeData.id) {
      console.error('Employee ID is missing');
      return;
    }

    setMissions(prev => {
      const updatedMissions = prev.map(mission =>
        mission.id === id
          ? {
              ...mission,
              employeeId: employeeData.id,
              status: 'pending' as MissionStatus,
              modifiedDate: new Date(),
            }
          : mission,
      );

      return updatedMissions;
    });
  };

  // Start a mission - changes status from pending to started
  const startMission = (id: string) => {
    const missionToStart = missions.find(m => m.id === id);

    if (!missionToStart) {
      console.error('Mission not found');
      return;
    }

    if (missionToStart.employeeId !== getUserData()?.id) {
      console.error('Not authorized to start this mission');
      return;
    }

    // Only allow starting if the mission is pending and the start time has passed
    const now = new Date();
    const startDate = new Date(missionToStart.startDateTime);

    if (now < startDate) {
      console.error('Cannot start a mission before its start time');
      return;
    }

    setMissions(prev => {
      return prev.map(mission =>
        mission.id === id
          ? {
              ...mission,
              status: 'started' as MissionStatus,
              modifiedDate: new Date(),
            }
          : mission,
      );
    });
  };

  // Complete a mission - changes status from started to completed
  const completeMission = (id: string) => {
    const missionToComplete = missions.find(m => m.id === id);

    if (!missionToComplete) {
      console.error('Mission not found');
      return;
    }

    if (missionToComplete.employeeId !== getUserData()?.id) {
      console.error('Not authorized to complete this mission');
      return;
    }

    setMissions(prev => {
      return prev.map(mission =>
        mission.id === id
          ? {
              ...mission,
              status: 'completed' as MissionStatus,
              modifiedDate: new Date(),
            }
          : mission,
      );
    });
  };

  // Helper function to get a conciergerie by name
  const getConciergerieByName = (name: string) => {
    return conciergeries?.find(conciergerie => conciergerie.name === name);
  };

  // Helper function to get a home by ID
  const getHomeById = (id: string): HomeData | undefined => {
    return homes.find(home => home.id === id);
  };

  // Helper function to get an employee by ID
  const getEmployeeById = (id: string | undefined): Employee | undefined => {
    return id ? employees.find(emp => emp.id === id) : undefined;
  };

  return (
    <MissionsContext.Provider
      value={{
        missions,
        homes,
        isLoading,
        addMission,
        updateMission,
        deleteMission,
        removeEmployee,
        acceptMission,
        startMission,
        completeMission,
        getConciergerieByName,
        getHomeById,
        getEmployeeById,
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
