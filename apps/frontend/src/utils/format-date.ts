/**
 * Date formatting utilities
 * Central place to manage date format across the application
 */

// Date format constants
export const DATE_FORMAT = 'DD/MM/YYYY';
export const DATE_TIME_FORMAT = 'DD/MM/YYYY HH:mm';
export const TIME_FORMAT = 'HH:mm';

/**
 * Format a date to DD/MM/YYYY
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date string
 */
export function formatDate(date: string | Date | number | null | undefined): string {
  if (!date) return '';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format a date to DD/MM/YYYY HH:mm
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date-time string
 */
export function formatDateTime(date: string | Date | number | null | undefined): string {
  if (!date) return '';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date-time:', error);
    return '';
  }
}

/**
 * Format time to HH:mm
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted time string
 */
export function formatTime(date: string | Date | number | null | undefined): string {
  if (!date) return '';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
}
