'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Conciergerie, Employee, Home, Mission } from '../types/mission';
import { getWelcomeParams } from '../utils/welcomeParams';

// Mock data for homes and employees
const mockHomes: Home[] = [
  { id: '1', title: 'Appartement Paris 11e' },
  { id: '2', title: 'Maison Bordeaux' },
  { id: '3', title: 'Studio Lyon' },
];

const mockEmployees: Employee[] = [
  { id: '1', name: 'Jean Dupont' },
  { id: '2', name: 'Marie Martin' },
  { id: '3', name: 'Pierre Durand' },
];

type MissionsContextType = {
  missions: Mission[];
  homes: Home[];
  employees: Employee[];
  isLoading: boolean;
  addMission: (mission: Omit<Mission, 'id' | 'modifiedDate' | 'deleted' | 'conciergerie'>) => void;
  updateMission: (mission: Mission) => void;
  deleteMission: (id: string) => void;
  removeEmployee: (id: string) => void;
  getCurrentConciergerie: () => Conciergerie | null;
};

const MissionsContext = createContext<MissionsContextType | undefined>(undefined);

export function MissionsProvider({ children }: { children: ReactNode }) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [homes] = useState<Home[]>(mockHomes);
  const [employees] = useState<Employee[]>(mockEmployees);
  const [isLoading, setIsLoading] = useState(true);

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
            date: new Date(mission.date),
            modifiedDate: new Date(mission.modifiedDate),
          }));
          setMissions(missionsWithDates);
        } catch (error) {
          console.error('Failed to parse missions from localStorage', error);
        }
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
    const missionToUpdate = missions.find(m => m.id === id);
    const currentConciergerie = getCurrentConciergerie();
    
    // Only allow employee removal if the mission was created by the current conciergerie
    if (missionToUpdate && currentConciergerie && missionToUpdate.conciergerie.name === currentConciergerie.name) {
      setMissions(prev =>
        prev.map(mission =>
          mission.id === id
            ? { ...mission, employeeId: undefined, employee: undefined, modifiedDate: new Date() }
            : mission,
        ),
      );
    } else {
      console.error('Cannot remove employee: mission not created by current conciergerie');
    }
  };

  return (
    <MissionsContext.Provider
      value={{ missions, homes, employees, isLoading, addMission, updateMission, deleteMission, removeEmployee, getCurrentConciergerie }}
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
