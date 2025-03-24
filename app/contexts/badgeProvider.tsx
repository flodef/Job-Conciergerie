'use client';

import { useMissions } from '@/app/contexts/missionsProvider';
import { Mission } from '@/app/types/types';
import { getEmployees } from '@/app/utils/employee';
import { useAuth } from '@/app/contexts/authProvider';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type BadgeContextType = {
  pendingEmployeesCount: number;
  newMissionsCount: number;
  todayMissionsCount: number;
  startedMissionsCount: number;
  resetPendingEmployeesCount: () => void;
  resetNewMissionsCount: () => void;
};

const checkingInterval = 60; // 1 minute
const employeesCheckKey = 'last_checked_employees';
const missionsCheckKey = 'last_checked_missions';
const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export function BadgeProvider({ children }: { children: ReactNode }) {
  const { userType, conciergerieName } = useAuth();
  const { missions } = useMissions();

  const [pendingEmployeesCount, setPendingEmployeesCount] = useState(0);
  const [newMissionsCount, setNewMissionsCount] = useState(0);
  const [todayMissionsCount, setTodayMissionsCount] = useState(0);
  const [startedMissionsCount, setStartedMissionsCount] = useState(0);

  // Load and update pending employees count for conciergerie
  useEffect(() => {
    if (userType === 'conciergerie') {
      // Function to count pending employees
      const countPendingEmployees = () => {
        const allEmployees = getEmployees();

        // Filter employees by conciergerie and pending status
        const pendingEmployees = allEmployees.filter(
          emp =>
            emp.status === 'pending' && emp.conciergerieName?.toLowerCase() === (conciergerieName?.toLowerCase() || ''),
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
              mission.conciergerieName === conciergerieName &&
              mission.employeeId && // Has an employee (accepted)
              new Date(mission.modifiedDate) > lastCheckedDate
          : (mission: Mission) =>
              !mission.employeeId && // Not assigned to anyone
              new Date(mission.modifiedDate) > lastCheckedDate &&
              new Date(mission.endDateTime).getTime() >= new Date().getTime(); // Not expired

      const newMissions = missions.filter(missionFilter);
      setNewMissionsCount(newMissions.length);
    };

    // Count new missions on mount and when missions change
    countNewMissions();

    // Set up interval to check periodically
    const interval = setInterval(countNewMissions, checkingInterval * 1000);

    return () => clearInterval(interval);
  }, [missions, userType, conciergerieName]);

  // Count missions for today
  useEffect(() => {
    const countTodayMissions = () => {
      if (!missions.length) return;

      // Find missions that are scheduled for today
      const today = new Date();
      const todayMissions = missions.filter(mission => {
        const missionStart = new Date(mission.startDateTime);

        // Check if mission is scheduled for today (mission day matches today)
        return (
          missionStart.getDate() === today.getDate() &&
          missionStart.getMonth() === today.getMonth() &&
          missionStart.getFullYear() === today.getFullYear()
        );
      });

      // Set the count of missions for today
      setTodayMissionsCount(todayMissions.length);
    };

    // Count started missions for conciergeries
    const countStartedMissions = () => {
      if (!missions.length || userType !== 'conciergerie') return;

      // Filter missions that are from this conciergerie, have an employee assigned, and are in started status
      const startedMissions = missions.filter(
        mission => mission.conciergerieName === conciergerieName && mission.employeeId && mission.status === 'started',
      );

      setStartedMissionsCount(startedMissions.length);
    };

    // Count today's missions and started missions on mount and when missions change
    countTodayMissions();
    countStartedMissions();

    // Set up interval to check periodically
    const interval = setInterval(() => {
      countTodayMissions();
      countStartedMissions();
    }, checkingInterval * 1000);

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
        todayMissionsCount,
        startedMissionsCount,
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
