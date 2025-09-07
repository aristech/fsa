import { IProject, ITask } from "../models";

export interface IKanbanTask {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  labels: string[];
  assignee: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
  }>;
  due?: [string, string];
  reporter: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  clientId?: string;
  clientName?: string;
  clientCompany?: string;
  workOrderId?: string;
  workOrderNumber?: string;
}

export function transformProjectToKanbanTask(
  project: IProject,
  statuses: string[]
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
            avatarUrl: "/assets/images/mock/avatar/avatar-1.webp",
          },
        ]
      : [],
    due: project.endDate
      ? [project.endDate.toISOString(), project.endDate.toISOString()]
      : [],
    reporter: {
      id: project.managerId?.toString() || "unknown",
      name: "Project Manager", // This would be populated from user data
      avatarUrl: "/assets/images/mock/avatar/avatar-1.webp",
    },
    attachments: [], // Projects don't have attachments in the current model
    comments: [], // Projects don't have comments in the current model
    ...(project.clientId && {
      clientId: project.clientId.toString(),
      clientName: "Client Name", // This would be populated from client data
      clientCompany: "Client Company", // This would be populated from client data
    }),
  };
}

export function transformTaskToKanbanTask(
  task: ITask,
  statuses: string[]
): IKanbanTask {
  return {
    id: task._id.toString(),
    name: task.title,
    description: task.description,
    status: task.status || "todo",
    priority: task.priority || "medium",
    labels: task.tags || [],
    assignee: task.assignedTo
      ? [
          {
            id: task.assignedTo.toString(),
            name: "Assigned User", // This would be populated from user data
            avatarUrl: "/assets/images/mock/avatar/avatar-1.webp",
          },
        ]
      : [],
    due: task.dueDate
      ? [task.dueDate.toISOString(), task.dueDate.toISOString()]
      : [],
    reporter: {
      id: task.createdBy?.toString() || "unknown",
      name: "Task Creator", // This would be populated from user data
      avatarUrl: "/assets/images/mock/avatar/avatar-1.webp",
    },
    attachments: task.attachments || [],
    comments: task.comments || [],
    ...(task.clientId && {
      clientId: task.clientId.toString(),
      clientName: task.clientName,
      clientCompany: task.clientCompany,
    }),
    ...(task.workOrderId && {
      workOrderId: task.workOrderId.toString(),
      workOrderNumber: task.workOrderNumber,
    }),
  };
}
