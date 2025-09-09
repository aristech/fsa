export const TASK_STATUSES = [
  'todo',
  'in-progress',
  'review',
  'done',
  'cancel',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];


