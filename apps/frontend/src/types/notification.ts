// ----------------------------------------------------------------------

export interface INotification {
  _id: string;
  tenantId: string;
  userId: string;
  type:
    | 'task_created'
    | 'task_updated'
    | 'task_assigned'
    | 'task_completed'
    | 'task_deleted'
    | 'time_logged'
    | 'time_updated';
  title: string;
  message?: string;
  category: 'task' | 'system' | 'reminder';
  relatedEntity: {
    entityType: 'task' | 'workorder' | 'project';
    entityId: string;
    entityTitle?: string;
  };
  metadata?: {
    taskId?: string;
    workOrderId?: string;
    projectId?: string;
    changes?: string[];
    assignerId?: string;
    reporterId?: string;
  };
  isRead: boolean;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCounts {
  total: number;
  unread: number;
  archived: number;
}

export interface NotificationFilters {
  isRead?: boolean;
  isArchived?: boolean;
  limit?: number;
  skip?: number;
}

// Transform backend notification to frontend format
export function transformNotification(backendNotification: INotification) {
  try {
    return {
      id: backendNotification._id || 'unknown',
      type: backendNotification.type || 'unknown',
      title: backendNotification.title || 'No title',
      category: backendNotification.category || 'system',
      isUnRead: !backendNotification.isRead,
      avatarUrl: null, // Will be enriched from user data if needed
      createdAt: backendNotification.createdAt || new Date().toISOString(),
      message: backendNotification.message,
      relatedEntity: backendNotification.relatedEntity,
      metadata: backendNotification.metadata,
    };
  } catch (error) {
    console.error('Error transforming notification:', error, backendNotification);
    return {
      id: 'error',
      type: 'unknown',
      title: 'Error loading notification',
      category: 'system',
      isUnRead: false,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      message: 'There was an error loading this notification',
      relatedEntity: undefined,
      metadata: undefined,
    };
  }
}
