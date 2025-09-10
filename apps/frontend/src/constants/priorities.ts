/**
 * Centralized priority system for tasks, work orders, and other entities
 * This ensures consistency across the entire application
 */

export interface PriorityOption {
  value: string;
  label: string;
  color: string;
  icon: string;
  order: number;
}

/**
 * Master priority definitions
 * Used across tasks, work orders, projects, and any other entities that need priorities
 */
export const PRIORITIES: PriorityOption[] = [
  {
    value: 'low',
    label: 'Low',
    color: 'success.main', // Material-UI theme color
    icon: 'solar:double-alt-arrow-down-bold-duotone',
    order: 1,
  },
  {
    value: 'medium',
    label: 'Medium', 
    color: 'warning.main', // Material-UI theme color
    icon: 'solar:double-alt-arrow-right-bold-duotone',
    order: 2,
  },
  {
    value: 'high',
    label: 'High',
    color: 'error.main', // Material-UI theme color
    icon: 'solar:double-alt-arrow-up-bold-duotone',
    order: 3,
  },
  {
    value: 'urgent',
    label: 'Urgent',
    color: 'error.dark', // Darker red for urgent
    icon: 'solar:danger-triangle-bold-duotone',
    order: 4,
  },
];

/**
 * Priority values as a typed array for validation
 */
export const PRIORITY_VALUES = PRIORITIES.map((p) => p.value) as readonly string[];

/**
 * Priority type for TypeScript
 */
export type Priority = (typeof PRIORITY_VALUES)[number];

/**
 * Default priority value
 */
export const DEFAULT_PRIORITY: Priority = 'medium';

/**
 * Get priority option by value
 */
export function getPriorityOption(value: string): PriorityOption | undefined {
  return PRIORITIES.find(p => p.value === value);
}

/**
 * Get priority options for dropdowns/selects (simple version)
 */
export function getPriorityOptions(): { value: string; label: string }[] {
  return PRIORITIES.map(p => ({ value: p.value, label: p.label }));
}

/**
 * Get priority options with full metadata for rich UI components
 */
export function getPriorityOptionsWithMetadata(): PriorityOption[] {
  return PRIORITIES;
}

/**
 * Validate if a priority value is valid
 */
export function isValidPriority(value: string): value is Priority {
  return PRIORITY_VALUES.includes(value as Priority);
}

/**
 * Get priority color by value
 */
export function getPriorityColor(value: string): string {
  const priority = getPriorityOption(value);
  return priority?.color || PRIORITIES[1].color; // fallback to medium
}

/**
 * Get priority icon by value
 */
export function getPriorityIcon(value: string): string {
  const priority = getPriorityOption(value);
  return priority?.icon || PRIORITIES[1].icon; // fallback to medium
}
