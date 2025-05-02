'use client';

import tasksData from '@/app/data/tasks.json';
import { Home, Mission, MissionPoints, Task } from '@/app/types/dataTypes';

// Get points for a specific task
export const getTaskPoints = (task: Task) => {
  return tasksData.find(t => t.label === task)?.points ?? 0;
};

// Calculate total points for a set of objectives
export const calculateTotalPoints = (tasks: Task[]): number => {
  return tasks.length ? tasks.reduce((total, task) => total + getTaskPoints(task), 0) : 0;
};

/**
 * Normalize a date by setting hours, minutes, seconds, and milliseconds to 0
 * to ensure date-only comparison
 */
const normalizeDate = (date: Date | string): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

/**
 * Calculate the number of days between two dates (inclusive)
 */
const calculateDaysBetweenDates = (startDate: Date, endDate: Date, inclusiveCount = 1): number => {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + inclusiveCount;
};

/**
 * Calculate points per day with a maximum cap
 */
const calculatePointsPerDayWithCap = (totalPoints: number, days: number, maxPointsPerDay = 3): number => {
  return Math.min(totalPoints / days, maxPointsPerDay);
};

// Calculate mission points including points per day
export const calculateMissionPoints = (mission: Mission): MissionPoints => {
  // Calculate total points for all objectives in the mission
  const totalPoints = calculateTotalPoints(mission.tasks);

  // Calculate the number of days the mission spans
  const startDate = normalizeDate(mission.startDateTime);
  const endDate = normalizeDate(mission.endDateTime);

  // Calculate the difference in days (include both start and end days)
  const diffDays = calculateDaysBetweenDates(startDate, endDate);

  // Calculate points per day (capped at 3 points per day)
  const pointsPerDay = calculatePointsPerDayWithCap(totalPoints, diffDays);

  return {
    totalPoints,
    pointsPerDay,
  };
};

// Calculate remaining points per day based on remaining days
export const calculateRemainingPointsPerDay = (mission: Mission, currentDate: Date = new Date()): number => {
  // Normalize dates for comparison
  const today = normalizeDate(currentDate);
  const endDate = normalizeDate(mission.endDateTime);
  const startDate = normalizeDate(mission.startDateTime);

  // If mission is already over, return 0
  if (today > endDate) return 0;

  // Create a temporary mission with adjusted start date for remaining calculations
  const effectiveStartDate = startDate > today ? startDate : today;

  // Create a modified mission with the effective start date
  const remainingMission: Mission = {
    ...mission,
    startDateTime: effectiveStartDate,
  };

  // Use the existing mission points calculation to get points per day
  return calculateMissionPoints(remainingMission).pointsPerDay;
};

/**
 * Filter missions for a specific employee and date
 * @param employeeId The ID of the employee
 * @param date The date to check
 * @param missions All missions
 * @param excludeMissionId Optional mission ID to exclude from calculation
 * @returns Filtered missions for the employee on the given date
 */
const filterEmployeeMissionsForDate = (
  employeeId: string,
  date: Date,
  missions: Mission[],
  excludeMissionId?: string,
): Mission[] => {
  return missions.filter(mission => {
    // Skip this mission if it's the one we want to exclude
    if (excludeMissionId && mission.id === excludeMissionId) return false;

    // Only include missions assigned to this employee
    if (mission.employeeId !== employeeId || mission.status === 'completed') return false;

    // Check if the mission spans the target date
    const startDate = new Date(mission.startDateTime);
    const endDate = new Date(mission.endDateTime);

    // Set hours to 0 to calculate just the days
    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);
    const target = normalizeDate(date);

    return start <= target && target <= end;
  });
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
  const employeeMissions = filterEmployeeMissionsForDate(employeeId, date, missions, excludeMissionId);

  // Calculate the total points for the day
  return employeeMissions.reduce((total, mission) => {
    // If the specified date is today or a future date, calculate the points per day
    // based on remaining days
    const targetDate = normalizeDate(date);
    const today = normalizeDate(new Date());
    const endDate = normalizeDate(mission.endDateTime);

    // If the target date is today or a future date
    if (targetDate >= today) {
      // Calculate points for the day based on remaining days from today
      return total + calculateRemainingPointsPerDay(mission, today);
    }
    // If the target date is the last day of the mission and it's in the past
    else if (targetDate.getTime() === endDate.getTime()) {
      // For past, last day of mission, allocate all remaining points
      return total + calculateMissionPoints(mission).totalPoints;
    }
    // If it's a past date but not the last day of the mission
    else {
      // Create a temporary mission with adjusted start date for historical calculation
      const historicalMission: Mission = {
        ...mission,
        startDateTime: targetDate,
      };

      // Use existing mission points calculation logic
      return total + calculateMissionPoints(historicalMission).pointsPerDay;
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
 * Calculate the total hours an employee has for missions on a specific day
 * @param employeeId The ID of the employee
 * @param date The date to check
 * @param missions All missions
 * @param excludeMissionId Optional mission ID to exclude from calculation
 * @returns The total hours for the day
 */
export const calculateEmployeeHoursForDay = (
  employeeId: string,
  date: Date,
  missions: Mission[],
  excludeMissionId?: string,
): number => {
  // Filter missions that belong to the employee and include the target date
  const employeeMissions = filterEmployeeMissionsForDate(employeeId, date, missions, excludeMissionId);

  // Calculate the total hours for the day
  return employeeMissions.reduce((total, mission) => {
    return total + mission.hours;
  }, 0);
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
  const num = typeof number === 'string' ? parseFloat(number) : number;
  const rounded = Math.round(num * 10) / 10;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
};

/**
 * Formats hours in decimal format to a more human-readable format
 * e.g., 3.5 becomes "3h30", 1.25 becomes "1h15"
 */
export const formatHour = (hours: number): string => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  return minutes === 0 ? `${wholeHours}h` : `${wholeHours}h${minutes.toString().padStart(2, '0')}`;
};
