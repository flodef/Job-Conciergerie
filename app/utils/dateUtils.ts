/**
 * Format a date for display in French format (DD/MM/YYYY)
 */
export const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format a time for display in French format (HH:MM)
 */
export const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a datetime for display in French format (DD/MM/YYYY à HH:MM)
 */
export const formatDateTime = (date: Date): string => {
  const dateStr = formatDate(date);
  const timeStr = formatTime(date);

  return `${dateStr} à ${timeStr}`;
};

/**
 * Calculate the time difference between two dates in a human-readable format
 * Consistent with mission points calculation (counting both start and end days)
 */
export const getTimeDifference = (startDate: Date, endDate: Date): string => {
  // Create copies of the dates to avoid modifying the original objects
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Set hours to 0 to calculate just the days (same as in calculateMissionPoints)
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  // Calculate the difference in days
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days

  // For hours and minutes, use the original calculation
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffDays > 1) {
    // Use the day calculation that includes both days
    return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  } else {
    return "Moins d'une minute";
  }
};

/**
 * Calculate the remaining time for a mission that has already started
 * Returns a string with the remaining time or null if the mission hasn't started yet
 */
export const getRemainingTime = (startDate: Date, endDate: Date): string | null => {
  const now = new Date();

  // If the mission hasn't started yet, return null
  if (startDate > now) {
    return null;
  }

  // If the mission has ended, return "Terminé"
  if (endDate < now) {
    return 'Terminé';
  }

  // Calculate remaining time from now to end date
  const end = new Date(endDate);
  const today = new Date(now);

  // Set hours to 0 to calculate just the days
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  // Calculate the difference in days
  const diffTime = Math.abs(end.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // No need to add 1 as we're calculating from today

  // For hours, use the original calculation
  const diffMs = endDate.getTime() - now.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffDays > 0) {
    return `${diffDays} jour${diffDays > 1 ? 's' : ''} restant${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} heure${diffHours > 1 ? 's' : ''} restante${diffHours > 1 ? 's' : ''}`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} restante${diffMins > 1 ? 's' : ''}`;
  } else {
    return "Moins d'une minute restante";
  }
};

/**
 * Check if two dates are on the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

/**
 * Format a date range for display
 * If start and end are on the same day, shows date once with start and end times
 * Otherwise shows full date and time for both
 */
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  if (isSameDay(startDate, endDate)) {
    // Same day - show date once with start and end times
    return `Le ${formatDate(startDate)} de ${formatTime(startDate)} à ${formatTime(endDate)}`;
  } else {
    // Different days - show full date and time for both
    return `Du ${formatDateTime(startDate)} au ${formatDateTime(endDate)}`;
  }
};
