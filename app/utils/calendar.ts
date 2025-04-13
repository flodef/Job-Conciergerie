'use client';

import { Mission } from '@/app/types/dataTypes';
import { formatTime, toLocalDateString } from '@/app/utils/date';

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

// Group missions by date
export const groupMissionsByDate = (missions: Mission[]): Map<string, Mission[]> => {
  const missionsByDate = new Map<string, Mission[]>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  missions.forEach(mission => {
    // Skip completed missions
    if (mission.status === 'completed') return;

    // Create date objects in local timezone
    const startDate = new Date(mission.startDateTime);
    const endDate = new Date(mission.endDateTime);

    // Reset hours to compare just the dates
    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);

    const endDay = new Date(endDate);
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
        const endDateStr = toLocalDateString(endDate);
        const existingMissions = missionsByDate.get(endDateStr) || [];
        if (!existingMissions.some(m => m.id === mission.id)) {
          missionsByDate.set(endDateStr, [...existingMissions, mission]);
        }
      } else {
        // For future multi-day missions, show only on start day
        const startDateStr = toLocalDateString(startDate);
        const existingMissions = missionsByDate.get(startDateStr) || [];
        if (!existingMissions.some(m => m.id === mission.id)) {
          missionsByDate.set(startDateStr, [...existingMissions, mission]);
        }
      }
    } else {
      // For single-day missions, show on that day
      const dateStr = toLocalDateString(startDate);
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
