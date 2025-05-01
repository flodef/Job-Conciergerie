'use client';

import tasksData from '@/app/data/tasks.json';
import { Home, Mission, MissionPoints, Task } from '@/app/types/dataTypes';

// Get points for a specific task
export const getTaskPoints = (task: Task) => {
  return tasksData.find(t => t.label === task)?.points ?? 0;
};

// Calculate total points for a set of objectives
export const calculateTotalPoints = (tasks: Task[]): number => {
  if (tasks.length === 0) return 0;

  return tasks.reduce((total, task) => total + getTaskPoints(task), 0);
};

// Calculate mission points including points per day
export const calculateMissionPoints = (mission: Mission): MissionPoints => {
  // Calculate total points for all objectives in the mission
  const totalPoints = calculateTotalPoints(mission.tasks);

  // Calculate the number of days the mission spans
  const startDate = new Date(mission.startDateTime);
  const endDate = new Date(mission.endDateTime);

  // Set hours to 0 to calculate just the days
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  // Calculate the difference in days
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days

  // Calculate points per day (capped at 3 points per day)
  const pointsPerDay = Math.min(totalPoints / diffDays, 3);

  return {
    totalPoints,
    pointsPerDay,
  };
};

// Calculate remaining points per day based on remaining days
export const calculateRemainingPointsPerDay = (mission: Mission, currentDate: Date = new Date()): number => {
  const { totalPoints } = calculateMissionPoints(mission);

  // Set hours to 0 to calculate just the days
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(mission.startDateTime);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(mission.endDateTime);
  endDate.setHours(0, 0, 0, 0);

  // If mission is already over, return 0
  if (today > endDate) return 0;

  // Calculate the difference in days from today to end date
  const diffTime = Math.abs(endDate.getTime() - Math.max(startDate.getTime(), today.getTime()));
  const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include today

  // Calculate points per remaining day (capped at 3 points per day)
  return Math.min(totalPoints / remainingDays, 3);
};

/**
 * Calculate the total points an employee has for a specific day
 * @param employeeId The ID of the employee
 * @param date The date to check
 * @param missions All missions
 * @param excludeMissionId Optional mission ID to exclude from calculation
 * @returns The total points for the day
 */
export const calculateEmployeePointsForDay = (
  employeeId: string,
  date: Date,
  missions: Mission[],
  excludeMissionId?: string,
): number => {
  // Filter missions that belong to the employee and include the target date
  const employeeMissions = missions.filter(mission => {
    // Skip this mission if it's the one we want to exclude
    if (excludeMissionId && mission.id === excludeMissionId) return false;

    // Only include missions assigned to this employee
    if (mission.employeeId !== employeeId) return false;

    // Check if the mission spans the target date
    const startDate = new Date(mission.startDateTime);
    const endDate = new Date(mission.endDateTime);

    // Set hours to 0 to calculate just the days
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    return start <= target && target <= end;
  });

  // Calculate the total points for the day
  return employeeMissions.reduce((total, mission) => {
    // If the specified date is today or a future date, calculate the points per day
    // based on remaining days
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(mission.endDateTime);
    endDate.setHours(0, 0, 0, 0);

    // If the target date is today or a future date
    if (targetDate >= today) {
      // Calculate points for the day based on remaining days from today
      return total + calculateRemainingPointsPerDay(mission, today);
    }
    // If the target date is the last day of the mission and it's in the past
    else if (targetDate.getTime() === endDate.getTime()) {
      // For past, last day of mission, allocate all remaining points
      const { totalPoints } = calculateMissionPoints(mission);
      return total + totalPoints;
    }
    // If it's a past date but not the last day of the mission
    else {
      // Calculate what the points per day were at that time
      const { totalPoints } = calculateMissionPoints(mission);

      // Calculate days from target date to end date
      const diffTime = Math.abs(endDate.getTime() - targetDate.getTime());
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include target date

      // Calculate points per remaining day (capped at 3 points per day)
      const pointsPerDay = Math.min(totalPoints / remainingDays, 3);

      return total + pointsPerDay;
    }
  }, 0);
};

export const getAvailableTasks = (home: Home, tasks = Object.values(Task)): Task[] => {
  return tasks.filter(task => getTaskHours(home, task) > 0);
};

/**
 * Calculate total hours for a mission based on selected tasks and home specifications
 */
export const calculateMissionHours = (home: Home, tasks: Task[]): number => {
  return tasks.reduce((acc, task) => acc + getTaskHours(home, task), 0);
};

/**
 * Get hours for a specific task
 */
export const getTaskHours = (home: Home, task: Task): number => {
  const hours = {
    [Task.Cleaning]: home.hoursOfCleaning,
    [Task.Gardening]: home.hoursOfGardening,
    [Task.Arrival]: 0.5,
    [Task.Departure]: 0.5,
  }[task];
  return hours;
};

/**
 * Formats a number to display with minimal decimals
 * e.g., 3.0 becomes 3, and 1.666 becomes 1.7
 */
export const formatNumber = (number: number | string): string => {
  const num = Number(number);
  return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(1)).toString();
};
