'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Conciergerie, Employee, HomeData, Mission } from '../types/types';
import { generateSimpleId } from '../utils/id';
import { getWelcomeParams } from '../utils/welcomeParams';
import { useHomes } from './homesProvider';
import { getEmployees } from '../utils/employeeUtils';

type MissionsContextType = {
  missions: Mission[];
  homes: HomeData[];
  isLoading: boolean;
  addMission: (mission: Omit<Mission, 'id' | 'modifiedDate' | 'deleted' | 'conciergerieName'>) => void;
  updateMission: (mission: Mission) => void;
  deleteMission: (id: string) => void;
  removeEmployee: (id: string) => void;
  acceptMission: (id: string) => void;
  getCurrentConciergerie: () => Conciergerie | null;
  getConciergerieByName: (name: string) => Conciergerie | null;
  getHomeById: (id: string) => HomeData | undefined;
  getEmployeeById: (id: string | undefined) => Employee | undefined;
  shouldShowAcceptWarning: boolean;
  setShouldShowAcceptWarning: (show: boolean) => void;
};

const MissionsContext = createContext<MissionsContextType | undefined>(undefined);

export function MissionsProviderWrapper({ children }: { children: ReactNode }) {
  return <MissionsProvider>{children}</MissionsProvider>;
}

function MissionsProvider({ children }: { children: ReactNode }) {
  const { homes } = useHomes();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowAcceptWarning, setShouldShowAcceptWarning] = useState<boolean>(true);

  // Get current conciergerie from localStorage
  const getCurrentConciergerie = (): Conciergerie | null => {
    const { conciergerieData } = getWelcomeParams();
    return conciergerieData as Conciergerie | null;
  };

  // Load missions from localStorage on initial render
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

  const addMission = (missionData: Omit<Mission, 'id' | 'modifiedDate' | 'deleted' | 'conciergerieName'>) => {
    const currentConciergerie = getCurrentConciergerie();

    if (!currentConciergerie) {
      console.error('No conciergerie found in localStorage');
      return;
    }

    const newMission: Mission = {
      ...missionData,
      id: generateSimpleId(),
      modifiedDate: new Date(),
      deleted: false,
      conciergerieName: currentConciergerie.name,
    };

    setMissions(prev => [...prev, newMission]);
  };

  const updateMission = (updatedMission: Mission) => {
    const currentConciergerie = getCurrentConciergerie();

    // Only allow updates if the mission was created by the current conciergerie
    if (currentConciergerie && updatedMission.conciergerieName === currentConciergerie.name) {
      setMissions(prev =>
        prev.map(mission =>
          mission.id === updatedMission.id ? { ...updatedMission, modifiedDate: new Date() } : mission,
        ),
      );
    } else {
      console.error('Cannot update mission: not created by current conciergerie');
    }
  };

  const deleteMission = (id: string) => {
    const missionToDelete = missions.find(m => m.id === id);
    const currentConciergerie = getCurrentConciergerie();

    // Only allow deletion if the mission was created by the current conciergerie
    if (missionToDelete && currentConciergerie && missionToDelete.conciergerieName === currentConciergerie.name) {
      setMissions(prev =>
        prev.map(mission => (mission.id === id ? { ...mission, deleted: true, modifiedDate: new Date() } : mission)),
      );
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
    const { employeeData } = getWelcomeParams();

    if (!missionToAccept) {
      console.error('Mission not found');
      return;
    }

    if (!employeeData) {
      console.error('No employee data found in localStorage');
      return;
    }

    // Create an employee object from the employee data in localStorage
    const employee: Employee = {
      id: employeeData.id,
      firstName: employeeData.firstName,
      familyName: employeeData.familyName,
      tel: employeeData.tel,
      email: employeeData.email,
      conciergerieName: employeeData.conciergerieName,
      message: employeeData.message,
    };

    if (!employee.id) {
      console.error('Employee ID is missing');
      return;
    }

    setMissions(prev => {
      const updatedMissions = prev.map(mission =>
        mission.id === id
          ? {
              ...mission,
              employeeId: employee.id,
              modifiedDate: new Date(),
            }
          : mission,
      );

      return updatedMissions;
    });
  };

  // Helper function to get a conciergerie by name
  const getConciergerieByName = (name: string): Conciergerie | null => {
    // If the name matches the current conciergerie, return it
    const currentConciergerie = getCurrentConciergerie();
    if (currentConciergerie && currentConciergerie.name === name) {
      return currentConciergerie;
    }

    // Otherwise, we would need to fetch from a list of conciergeries
    // For now, return null if it's not the current conciergerie
    return null;
  };

  // Helper function to get a home by ID
  const getHomeById = (id: string): HomeData | undefined => {
    return homes.find(home => home.id === id && !home.deleted);
  };

  const getEmployeeById = (id: string | undefined): Employee | undefined => {
    return getEmployees().find(employee => employee.id === id);
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
        getCurrentConciergerie,
        getConciergerieByName,
        getHomeById,
        getEmployeeById,
        shouldShowAcceptWarning,
        setShouldShowAcceptWarning,
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
