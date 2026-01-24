import { format, toZonedTime } from 'date-fns-tz';

/**
 * Format a UTC timestamp in user's timezone
 * @param {string|Date} utcTimestamp - UTC timestamp
 * @param {string} timezone - IANA timezone (e.g., 'America/New_York')
 * @param {string} formatStr - date-fns format string
 * @returns {string} Formatted date string
 */
export function formatInTimezone(utcTimestamp, timezone = 'America/New_York', formatStr = 'MMM dd, yyyy h:mm a') {
  if (!utcTimestamp) return '';
  
  try {
    const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
    const zonedDate = toZonedTime(date, timezone);
    return format(zonedDate, formatStr, { timeZone: timezone });
  } catch (error) {
    console.error('Timezone formatting error:', error);
    return new Date(utcTimestamp).toLocaleString();
  }
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(utcTimestamp) {
  if (!utcTimestamp) return '';
  
  const now = new Date();
  const date = new Date(utcTimestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return format(date, 'MMM dd, yyyy');
}