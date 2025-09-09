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
};

export type IKanbanColumn = {
  id: string;
  name: string;
};

export type IKanban = {
  columns: IKanbanColumn[];
  tasks: Record<IKanbanColumn['id'], IKanbanTask[]>;
};
