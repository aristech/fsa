import type { IDateValue } from './common';

// ----------------------------------------------------------------------

export type IKanbanComment = {
  id: string;
  name: string;
  message: string;
  avatarUrl: string | null;
  initials?: string;
  createdAt: IDateValue;
  messageType: 'image' | 'text';
};

export type IKanbanAssignee = {
  id: string;
  name: string;
  role: string;
  email: string;
  status: string;
  address: string;
  avatarUrl: string | null;
  initials?: string;
  phoneNumber: string;
  lastActivity: IDateValue;
};

export type IKanbanTask = {
  id: string;
  name: string;
  status: string;
  columnId?: string; // Reference to column _id
  priority: string;
  labels: string[];
  tags?: string[];
  description?: string;
  attachments: string[];
  comments: IKanbanComment[];
  assignee: IKanbanAssignee[];
  due: [IDateValue, IDateValue]; // [startDate, endDate]
  startDate?: IDateValue;
  endDate?: IDateValue;
  completeStatus?: boolean;
  subtaskCount?: number;
  reporter: {
    id: string;
    name: string;
    avatarUrl: string | null;
    initials?: string;
  };
  // Client information (optional)
  clientId?: string;
  clientName?: string;
  clientCompany?: string;
  // Private task flag
  isPrivate?: boolean;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
};

export type IKanbanColumn = {
  id: string;
  name: string;
};

export type IKanban = {
  columns: IKanbanColumn[];
  tasks: Record<IKanbanColumn['id'], IKanbanTask[]>;
};

// ----------------------------------------------------------------------

export type ITimeEntry = {
  _id: string;
  tenantId: string;
  taskId: string;
  workOrderId?: string;
  personnelId: string;
  date: string; // ISO
  hours: number;
  days?: number;
  notes?: string;
  cost?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTimeEntryPayload = {
  taskId: string;
  workOrderId?: string;
  personnelId: string;
  date: string;
  hours?: number;
  days?: number;
  notes?: string;
};

export type UpdateTimeEntryPayload = {
  hours?: number;
  days?: number;
  notes?: string;
};
