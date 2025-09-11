import { IProject, ITask } from "../models";

export interface IKanbanTask {
  id: string;
  name: string;
  description?: string;
  status: string;
  columnId?: string; // Add columnId for new architecture
  priority: string;
  labels: string[];
  tags?: string[];
  assignee: Array<{
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  }>;
  due?: [string, string];
  reporter: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
  clientId?: string;
  clientName?: string;
  clientCompany?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  workOrderTitle?: string;
  attachments?: any[];
  comments?: any[];
  completeStatus?: boolean;
}

export function transformProjectToKanbanTask(
  project: IProject,
  statuses: string[],
): IKanbanTask {
  return {
    id: project._id.toString(),
    name: project.name,
    description: project.description,
    status: project.status || "todo",
    priority: project.priority || "medium",
    labels: project.tags || [],
    assignee: project.managerId
      ? [
          {
            id: project.managerId.toString(),
            name: "Project Manager", // This would be populated from user data
            avatarUrl: undefined,
          },
        ]
      : [],
    due: project.endDate
      ? [project.endDate.toISOString(), project.endDate.toISOString()]
      : undefined,
    reporter: {
      id: project.managerId?.toString() || "unknown",
      name: "Project Manager", // This would be populated from user data
      avatarUrl: undefined,
    },
    attachments: [], // Projects don't have attachments in the current model
    comments: [], // Projects don't have comments in the current model
    ...(project.clientId && {
      clientId: project.clientId.toString(),
      clientName: "Client Name", // This would be populated from client data
      clientCompany: "Client Company", // This would be populated from client data
    }),
    completeStatus: false, // Projects don't have completeStatus, default to false
  };
}

export function transformTaskToKanbanTask(
  task: ITask,
  statuses: string[],
  lookups?: {
    userById?: Record<
      string,
      { name?: string; email?: string; avatar?: string }
    >;
    personnelById?: Record<
      string,
      { name?: string; email?: string; avatar?: string }
    >;
    subtasksCount?: number;
    commentsCount?: number;
    workOrderById?: Record<
      string,
      { title?: string; workOrderNumber?: string }
    >;
    columnById?: Record<string, { name: string; slug: string }>;
  },
): IKanbanTask {
  const workOrder =
    task.workOrderId && lookups?.workOrderById
      ? lookups.workOrderById[task.workOrderId.toString()] || undefined
      : undefined;

  // Determine status/column information
  const column =
    task.columnId && lookups?.columnById
      ? lookups.columnById[task.columnId]
      : null;
  const statusFromColumn = column ? column.slug : task.status || "todo";

  return {
    id: task._id.toString(),
    name: task.title,
    description: task.description,
    status: statusFromColumn,
    columnId: task.columnId,
    priority: task.priority || "medium",
    labels: task.tags || [],
    tags: task.tags || [],
    assignee: Array.isArray((task as any).assignees)
      ? (task as any).assignees.map((id: string) => {
          const p = lookups?.personnelById?.[id];
          const name = p?.name || "Assignee";
          return {
            id,
            name,
            email: p?.email,
            avatarUrl: null,
            initials:
              name
                .split(" ")
                .map((n) => n.charAt(0))
                .join("")
                .toUpperCase() || "A",
          };
        })
      : [],
    due:
      task.startDate || task.dueDate
        ? [
            (task as any).startDate?.toISOString() ||
              task.dueDate?.toISOString() ||
              "",
            task.dueDate?.toISOString() ||
              (task as any).startDate?.toISOString() ||
              "",
          ]
        : undefined,
    reporter: (() => {
      const id = task.createdBy?.toString() || "unknown";
      const u = lookups?.userById?.[id];
      const name = u?.name || "Reporter";
      return {
        id,
        name,
        email: u?.email,
        avatarUrl: undefined,
        initials:
          name
            .split(" ")
            .map((n) => n.charAt(0))
            .join("")
            .toUpperCase() || "R",
      };
    })(),
    attachments: task.attachments || [],
    comments: [], // Comments not available in current Task model
    ...(task.clientId && {
      clientId: task.clientId.toString(),
      clientName: task.clientName,
      clientCompany: task.clientCompany,
    }),
    ...(task.workOrderId && {
      workOrderId: task.workOrderId.toString(),
      workOrderNumber: task.workOrderNumber || workOrder?.workOrderNumber,
      workOrderTitle: (task as any).workOrderTitle || workOrder?.title,
    }),
    completeStatus: (task as any).completeStatus || false,
  };
}
