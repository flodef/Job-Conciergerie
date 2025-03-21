'use client';

import { Mission } from '@/app/types/types';

export const monthNames = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

// Format date to display in calendar (e.g., "Lundi 8 mars 2025")
export const formatCalendarDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Get all dates between start and end date (inclusive)
export const getDatesInRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];

  // Create a new date object to avoid modifying the original
  // Use local year, month, day to create a date at midnight local time
  const currentDate = new Date();
  currentDate.setFullYear(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  currentDate.setHours(0, 0, 0, 0);

  // Create a new date object for the end date using local time
  const lastDate = new Date();
  lastDate.setFullYear(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  lastDate.setHours(0, 0, 0, 0);

  // Loop through each day and add it to the array
  while (currentDate <= lastDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

/**
 * Convert a date to local date string in YYYY-MM-DD format
 * This handles timezone correctly by using local time
 */
export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Group missions by date
export const groupMissionsByDate = (missions: Mission[]): Map<string, Mission[]> => {
  const missionsByDate = new Map<string, Mission[]>();

  missions.forEach(mission => {
    // Create date objects in local timezone
    const startDate = new Date(mission.startDateTime);
    const endDate = new Date(mission.endDateTime);

    // Get all dates in the range using local dates (including start and end dates)
    const datesInRange = getDatesInRange(startDate, endDate);

    datesInRange.forEach(date => {
      // Use local date string to avoid timezone issues
      const dateStr = toLocalDateString(date);
      const existingMissions = missionsByDate.get(dateStr) || [];

      // Only add the mission if it's not already in the array for this date
      if (!existingMissions.some(m => m.id === mission.id)) {
        missionsByDate.set(dateStr, [...existingMissions, mission]);
      }
    });
  });

  return missionsByDate;
};

// Sort dates in ascending order
export const sortDates = (dates: string[]): string[] => {
  return dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
};

// Check if a date is today
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// Check if a date is in the past
export const isPastDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
};

// Format time (e.g., "14:30")
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format the time display for a mission based on whether the current date is the start date, end date, or a day in between
 * @param mission The mission to format time for
 * @param currentDate The date being displayed in the calendar
 * @returns Formatted time string
 */
export const formatMissionTimeForCalendar = (mission: Mission, currentDate: Date): string => {
  const startDate = new Date(mission.startDateTime);
  const endDate = new Date(mission.endDateTime);

  // Reset hours to compare just the dates
  const startDay = new Date(startDate);
  startDay.setHours(0, 0, 0, 0);

  const endDay = new Date(endDate);
  endDay.setHours(0, 0, 0, 0);

  const currentDay = new Date(currentDate);
  currentDay.setHours(0, 0, 0, 0);

  // Check if the mission spans multiple days
  const isMultiDayMission = startDay.getTime() !== endDay.getTime();

  // If it's a single day mission or if start and end are on the same day
  if (!isMultiDayMission) {
    return `${formatTime(startDate)} - ${formatTime(endDate)}`;
  }

  // For multi-day missions
  if (currentDay.getTime() === startDay.getTime()) {
    // Start day
    return `À partir de ${formatTime(startDate)}`;
  } else if (currentDay.getTime() === endDay.getTime()) {
    // End day
    return `Jusqu'à ${formatTime(endDate)}`;
  } else {
    // Day in between
    return 'Toute la journée';
  }
};
