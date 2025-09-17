import type { IDateValue } from './common';

// ----------------------------------------------------------------------

export type IWorkOrderTimelineEntry = {
  _id: string;
  tenantId: string;
  workOrderId: string;
  entityType: 'work_order' | 'task';
  entityId?: string;
  eventType:
    | 'created'
    | 'updated'
    | 'status_changed'
    | 'assigned'
    | 'unassigned'
    | 'priority_changed'
    | 'due_date_changed'
    | 'progress_updated'
    | 'completed'
    | 'cancelled'
    | 'comment_added'
    | 'attachment_added'
    | 'attachment_removed';
  title: string;
  description?: string;
  metadata?: {
    oldValue?: any;
    newValue?: any;
    fieldName?: string;
    taskTitle?: string;
    taskId?: string;
    assigneeNames?: string[];
    priority?: string;
    status?: string;
    [key: string]: any;
  };
  userId: string;
  userName?: string;
  userAvatar?: string;
  timestamp: IDateValue;
  createdAt: IDateValue;
};

export type IWorkOrderTimeline = {
  timeline: IWorkOrderTimelineEntry[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export type IWorkOrderTimelineFilters = {
  entityType?: 'work_order' | 'task';
  limit?: number;
  offset?: number;
};