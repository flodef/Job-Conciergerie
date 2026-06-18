'use client';

import type { Mission } from '@/app/types/dataTypes';
import { formatTime, toLocalDateString } from '@/app/utils/date';
import {} from './extensions';

/**
 * Format date to display in calendar (e.g., "Lundi 8 mars 2025")
 * @param date - The date to format
 * @returns The formatted date string
 */
export const formatCalendarDate = (date: Date): string => {
  return date
    .toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Paris',
    })
    .toFirstUpperCase();
};

/**
 * Group missions by date
 * @param missions - The list of missions to group
 * @returns A map of date strings to mission arrays
 */
export const groupMissionsByDate = (missions: Mission[]): Map<string, Mission[]> => {
  const missionsByDate = new Map<string, Mission[]>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  missions.forEach(mission => {
    // Skip completed missions
    if (mission.status === 'completed') return;

    // Reset hours to compare just the dates (use copies to avoid mutating the shared mission objects)
    const startDay = new Date(mission.startDateTime);
    startDay.setHours(0, 0, 0, 0);

    const endDay = new Date(mission.endDateTime);
    endDay.setHours(0, 0, 0, 0);

    // Check if mission spans multiple days
    const isMultiDay = startDay.getTime() !== endDay.getTime();

    // Check if mission is ongoing (includes today)
    const isOngoing = startDay <= today && endDay >= today;
    // Check if mission has ended
    const isEnded = endDay < today;

    if (isMultiDay) {
      if (isOngoing) {
        // For ongoing multi-day missions, show only on current day
        const todayStr = toLocalDateString(today);
        const existingMissions = missionsByDate.get(todayStr) || [];
        if (!existingMissions.some(m => m.id === mission.id)) {
          missionsByDate.set(todayStr, [...existingMissions, mission]);
        }
      } else if (isEnded) {
        // For ended multi-day missions that are not completed, show only on last day
        const endDateStr = toLocalDateString(mission.endDateTime);
        const existingMissions = missionsByDate.get(endDateStr) || [];
        if (!existingMissions.some(m => m.id === mission.id)) {
          missionsByDate.set(endDateStr, [...existingMissions, mission]);
        }
      } else {
        // For future multi-day missions, show only on start day
        const startDateStr = toLocalDateString(mission.startDateTime);
        const existingMissions = missionsByDate.get(startDateStr) || [];
        if (!existingMissions.some(m => m.id === mission.id)) {
          missionsByDate.set(startDateStr, [...existingMissions, mission]);
        }
      }
    } else {
      // For single-day missions, show on that day
      const dateStr = toLocalDateString(mission.startDateTime);
      const existingMissions = missionsByDate.get(dateStr) || [];
      if (!existingMissions.some(m => m.id === mission.id)) {
        missionsByDate.set(dateStr, [...existingMissions, mission]);
      }
    }
  });

  return missionsByDate;
};

/**
 * Format the time display for a mission based on whether the current date is the start date, end date, or a day in between
 * @param mission The mission to format time for
 * @param currentDate The date being displayed in the calendar
 * @returns Formatted time string
 */
export const formatMissionTimeForCalendar = (mission: Mission, currentDate: Date): string => {
  // Reset hours to compare just the dates (use copies to avoid mutating the shared mission objects)
  const startDay = new Date(mission.startDateTime);
  startDay.setHours(0, 0, 0, 0);

  const endDay = new Date(mission.endDateTime);
  endDay.setHours(0, 0, 0, 0);

  const currentDay = new Date(currentDate);
  currentDay.setHours(0, 0, 0, 0);

  // Check if the mission spans multiple days
  const isMultiDayMission = startDay.getTime() !== endDay.getTime();

  // If it's a single day mission or if start and end are on the same day
  if (!isMultiDayMission) {
    return `${formatTime(mission.startDateTime)} - ${formatTime(mission.endDateTime)}`;
  }

  // For multi-day missions
  if (currentDay.getTime() === startDay.getTime()) {
    // Start day
    return `À partir de ${formatTime(mission.startDateTime)}`;
  } else if (currentDay.getTime() === endDay.getTime()) {
    // End day
    return `Jusqu'à ${formatTime(mission.endDateTime)}`;
  } else {
    // Day in between
    return 'Toute la journée';
  }
};
