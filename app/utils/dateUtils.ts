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
  const dateStr = new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  
  const timeStr = new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  return `${dateStr} à ${timeStr}`;
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
    return `Du ${formatDate(startDate)} de ${formatTime(startDate)} à ${formatTime(endDate)}`;
  } else {
    // Different days - show full date and time for both
    return `Du ${formatDateTime(startDate)} au ${formatDateTime(endDate)}`;
  }
};
