'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Mission } from '../types/types';
import { getEmployees } from '../utils/employeeUtils';
import { getWelcomeParams } from '../utils/welcomeParams';
import { useMissions } from './missionsProvider';

type BadgeContextType = {
  pendingEmployeesCount: number;
  newMissionsCount: number;
  resetPendingEmployeesCount: () => void;
  resetNewMissionsCount: () => void;
};

const checkingInterval = 60; // 1 minute
const employeesCheckKey = 'last_checked_employees';
const missionsCheckKey = 'last_checked_missions';
const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export function BadgeProvider({ children }: { children: ReactNode }) {
  const [pendingEmployeesCount, setPendingEmployeesCount] = useState(0);
  const [newMissionsCount, setNewMissionsCount] = useState(0);
  const { missions } = useMissions();

  // Get user type and conciergerie data
  const { userType, conciergerieData } = getWelcomeParams();
  const conciergerieName = conciergerieData?.name || null;

  // Load and update pending employees count for conciergerie
  useEffect(() => {
    if (userType === 'conciergerie') {
      // Function to count pending employees
      const countPendingEmployees = () => {
        const allEmployees = getEmployees();

        // Filter employees by conciergerie and pending status
        const pendingEmployees = allEmployees.filter(
          emp => emp.status === 'pending' && emp.conciergerie.toLowerCase() === (conciergerieName?.toLowerCase() || ''),
        );

        // Get the last checked timestamp from localStorage
        const lastChecked = localStorage.getItem(employeesCheckKey);

        // If we have a last checked timestamp, only count employees created after that time
        if (lastChecked) {
          const lastCheckedDate = new Date(lastChecked);
          const newPendingEmployees = pendingEmployees.filter(emp => new Date(emp.createdAt) > lastCheckedDate);
          setPendingEmployeesCount(newPendingEmployees.length);
        } else {
          // If no last checked timestamp, count all pending employees
          setPendingEmployeesCount(pendingEmployees.length);
        }
      };

      // Count pending employees on mount and set up interval to check periodically
      countPendingEmployees();
      const interval = setInterval(countPendingEmployees, checkingInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [userType, conciergerieName]);

  // Load and update new missions count
  useEffect(() => {
    // Function to count new missions
    const countNewMissions = () => {
      if (!missions.length) return;

      // Get the last checked timestamp from localStorage
      const lastChecked = localStorage.getItem(missionsCheckKey) ?? 0;
      const lastCheckedDate = new Date(lastChecked);

      const missionFilter =
        userType === 'conciergerie'
          ? (mission: Mission) =>
              mission.conciergerie.name === conciergerieName &&
              mission.employee && // Has an employee (accepted)
              new Date(mission.modifiedDate) > lastCheckedDate &&
              !mission.deleted
          : (mission: Mission) =>
              !mission.employee && // Not assigned to anyone
              new Date(mission.modifiedDate) > lastCheckedDate &&
              new Date(mission.endDateTime).getTime() >= new Date().getTime() && // Not expired
              !mission.deleted;

      const newMissions = missions.filter(missionFilter);
      setNewMissionsCount(newMissions.length);
    };

    // Count new missions on mount and when missions change
    countNewMissions();

    // Set up interval to check periodically
    const interval = setInterval(countNewMissions, checkingInterval * 1000);

    return () => clearInterval(interval);
  }, [missions, userType, conciergerieName]);

  // Reset functions
  const resetPendingEmployeesCount = () => {
    setPendingEmployeesCount(0);
    localStorage.setItem(employeesCheckKey, new Date().toISOString());
  };

  const resetNewMissionsCount = () => {
    setNewMissionsCount(0);
    localStorage.setItem(missionsCheckKey, new Date().toISOString());
  };

  return (
    <BadgeContext.Provider
      value={{
        pendingEmployeesCount,
        newMissionsCount,
        resetPendingEmployeesCount,
        resetNewMissionsCount,
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadge() {
  const context = useContext(BadgeContext);
  if (context === undefined) {
    throw new Error('useBadge must be used within a BadgeProvider');
  }
  return context;
}
