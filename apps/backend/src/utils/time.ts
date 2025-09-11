// ----------------------------------------------------------------------

/**
 * Time and cost helper utilities for time entry processing
 */

export interface WorkingHoursConfig {
  workingDayHours?: number; // Default 8 if not provided
}

export interface NormalizedTimeInput {
  hours?: number;
  days?: number;
}

export interface NormalizedTimeResult {
  hours: number; // always >= 0
  days: number; // derived using workingDayHours
}

export function getWorkingDayHours(config?: WorkingHoursConfig): number {
  const hours = config?.workingDayHours ?? 8;
  return hours > 0 ? hours : 8;
}

export function hoursToDays(
  hours: number,
  config?: WorkingHoursConfig,
): number {
  const base = getWorkingDayHours(config);
  if (!isFinite(hours) || hours < 0) return 0;
  return hours / base;
}

export function daysToHours(days: number, config?: WorkingHoursConfig): number {
  const base = getWorkingDayHours(config);
  if (!isFinite(days) || days < 0) return 0;
  return days * base;
}

export function roundCurrency(value: number, precision: number = 2): number {
  if (!isFinite(value)) return 0;
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

export function computeLaborCost(
  hours: number,
  hourlyRate: number,
  options?: { precision?: number },
): number {
  const safeHours = isFinite(hours) && hours >= 0 ? hours : 0;
  const safeRate = isFinite(hourlyRate) && hourlyRate >= 0 ? hourlyRate : 0;
  const raw = safeHours * safeRate;
  return roundCurrency(raw, options?.precision ?? 2);
}

/**
 * Normalize hours/days. Accepts either hours or days (or both),
 * returns both populated consistently using workingDayHours.
 */
export function normalizeHoursDays(
  input: NormalizedTimeInput,
  config?: WorkingHoursConfig,
): NormalizedTimeResult {
  const base = getWorkingDayHours(config);
  const hasHours = typeof input.hours === "number" && isFinite(input.hours!);
  const hasDays = typeof input.days === "number" && isFinite(input.days!);

  let hours = 0;
  let days = 0;

  if (hasHours && !hasDays) {
    hours = Math.max(0, input.hours!);
    days = hours / base;
  } else if (!hasHours && hasDays) {
    days = Math.max(0, input.days!);
    hours = days * base;
  } else if (hasHours && hasDays) {
    // Trust hours, derive days from hours to avoid drift
    hours = Math.max(0, input.hours!);
    days = hours / base;
  } else {
    hours = 0;
    days = 0;
  }

  return { hours, days };
}

