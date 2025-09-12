// Time formatting utilities for work orders and time entries

export interface DurationConfig {
  workingDayHours?: number; // Default 8 hours per day
}

/**
 * Convert minutes to a human-readable format
 */
export function formatMinutesToDuration(minutes: number, config?: DurationConfig): string {
  if (!minutes || minutes <= 0) return '0 min';

  const workingDayHours = config?.workingDayHours || 8;
  const workingDayMinutes = workingDayHours * 60;

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (minutes < workingDayMinutes) {
    // Show as hours and minutes
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }

  // Show as days and hours for longer durations
  const days = Math.floor(minutes / workingDayMinutes);
  const remainingHours = Math.floor((minutes % workingDayMinutes) / 60);
  const finalMinutes = minutes % 60;

  let result = `${days}d`;
  if (remainingHours > 0) {
    result += ` ${remainingHours}h`;
  }
  if (finalMinutes > 0) {
    result += ` ${finalMinutes}m`;
  }

  return result;
}

/**
 * Convert estimated duration object to minutes
 */
export function estimatedDurationToMinutes(
  estimatedDuration: { value: number; unit: string } | null,
  config?: DurationConfig
): number {
  if (!estimatedDuration) return 0;

  const { value, unit } = estimatedDuration;
  const workingDayHours = config?.workingDayHours || 8;

  switch (unit) {
    case 'hours':
      return value * 60;
    case 'days':
      return value * workingDayHours * 60;
    case 'weeks':
      return value * 5 * workingDayHours * 60; // 5 working days per week
    case 'months':
      return value * 20 * workingDayHours * 60; // ~20 working days per month
    default:
      return value; // Assume minutes if unknown unit
  }
}

/**
 * Format estimated duration object to human-readable string
 */
export function formatEstimatedDuration(
  estimatedDuration: { value: number; unit: string } | null
): string {
  if (!estimatedDuration) return '—';

  const { value, unit } = estimatedDuration;
  return `${value} ${unit}`;
}

/**
 * Calculate progress percentage based on actual vs estimated time
 */
export function calculateTimeProgress(
  actualMinutes: number,
  estimatedDuration: { value: number; unit: string } | null,
  config?: DurationConfig
): number {
  if (!estimatedDuration || !actualMinutes) return 0;

  const estimatedMinutes = estimatedDurationToMinutes(estimatedDuration, config);
  if (estimatedMinutes <= 0) return 0;

  return Math.min(100, Math.round((actualMinutes / estimatedMinutes) * 100));
}
