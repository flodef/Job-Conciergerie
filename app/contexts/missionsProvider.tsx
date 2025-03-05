'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Conciergerie, Employee, HomeData, Mission } from '../types/types';
import { getWelcomeParams } from '../utils/welcomeParams';
import { useHomes } from './homesProvider';
import { EmployeeData } from '../components/employeeForm';

type MissionsContextType = {
  missions: Mission[];
  homes: HomeData[];
  employees: Employee[];
  isLoading: boolean;
  addMission: (mission: Omit<Mission, 'id' | 'modifiedDate' | 'deleted' | 'conciergerie'>) => void;
  updateMission: (mission: Mission) => void;
  deleteMission: (id: string) => void;
  removeEmployee: (id: string) => void;
  acceptMission: (id: string) => void;
  getCurrentConciergerie: () => Conciergerie | null;
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
  const [employees] = useState<Employee[]>([]);
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

  const addMission = (missionData: Omit<Mission, 'id' | 'modifiedDate' | 'deleted' | 'conciergerie'>) => {
    const currentConciergerie = getCurrentConciergerie();

    if (!currentConciergerie) {
      console.error('No conciergerie found in localStorage');
      return;
    }

    const newMission: Mission = {
      ...missionData,
      id: Date.now().toString(),
      modifiedDate: new Date(),
      deleted: false,
      conciergerie: currentConciergerie,
    };

    setMissions(prev => [...prev, newMission]);
  };

  const updateMission = (updatedMission: Mission) => {
    const currentConciergerie = getCurrentConciergerie();

    // Only allow updates if the mission was created by the current conciergerie
    if (currentConciergerie && updatedMission.conciergerie.name === currentConciergerie.name) {
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
    if (missionToDelete && currentConciergerie && missionToDelete.conciergerie.name === currentConciergerie.name) {
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

  const generateEmployeeId = (employee: EmployeeData): string => {
    return `emp_${employee.prenom.toLowerCase()}_${employee.nom.toLowerCase()}_${Date.now()}`;
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

    console.log('Employee data from localStorage:', employeeData);

    // Create an employee object from the employee data in localStorage
    const employee: Employee = {
      id: employeeData.id || generateEmployeeId(employeeData),
      name: `${employeeData.prenom} ${employeeData.nom}`,
    };

    console.log('Created employee object:', employee);

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
              employee: employee,
              modifiedDate: new Date(),
            }
          : mission,
      );

      console.log(
        'Updated mission:',
        updatedMissions.find(m => m.id === id),
      );

      return updatedMissions;
    });
  };

  return (
    <MissionsContext.Provider
      value={{
        missions,
        homes,
        employees,
        isLoading,
        addMission,
        updateMission,
        deleteMission,
        removeEmployee,
        acceptMission,
        getCurrentConciergerie,
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
