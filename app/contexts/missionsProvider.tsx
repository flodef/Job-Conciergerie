'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Employee, Home, Mission } from '../types/mission';

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
  addMission: (mission: Omit<Mission, 'id' | 'modifiedDate' | 'deleted'>) => void;
  updateMission: (mission: Mission) => void;
  deleteMission: (id: string) => void;
  removeEmployee: (id: string) => void;
};

const MissionsContext = createContext<MissionsContextType | undefined>(undefined);

export function MissionsProvider({ children }: { children: ReactNode }) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [homes] = useState<Home[]>(mockHomes);
  const [employees] = useState<Employee[]>(mockEmployees);

  // Load missions from localStorage on initial render
  useEffect(() => {
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
  }, []);

  // Save missions to localStorage whenever they change
  useEffect(() => {
    if (missions.length > 0) {
      localStorage.setItem('missions', JSON.stringify(missions));
    }
  }, [missions]);

  const addMission = (missionData: Omit<Mission, 'id' | 'modifiedDate' | 'deleted'>) => {
    const newMission: Mission = {
      ...missionData,
      id: Date.now().toString(),
      modifiedDate: new Date(),
      deleted: false,
    };

    setMissions(prev => [...prev, newMission]);
  };

  const updateMission = (updatedMission: Mission) => {
    setMissions(prev =>
      prev.map(mission =>
        mission.id === updatedMission.id ? { ...updatedMission, modifiedDate: new Date() } : mission,
      ),
    );
  };

  const deleteMission = (id: string) => {
    setMissions(prev =>
      prev.map(mission => (mission.id === id ? { ...mission, deleted: true, modifiedDate: new Date() } : mission)),
    );
  };

  const removeEmployee = (id: string) => {
    setMissions(prev =>
      prev.map(mission =>
        mission.id === id
          ? { ...mission, employeeId: undefined, employee: undefined, modifiedDate: new Date() }
          : mission,
      ),
    );
  };

  return (
    <MissionsContext.Provider
      value={{
        missions,
        homes,
        employees,
        addMission,
        updateMission,
        deleteMission,
        removeEmployee,
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
