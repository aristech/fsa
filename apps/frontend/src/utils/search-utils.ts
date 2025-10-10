'use client';

import type { IKanbanTask } from 'src/types/kanban';

// ----------------------------------------------------------------------

export type SearchConfig = {
  searchableFields: {
    task: (keyof IKanbanTask)[];
    client: string[];
    workOrder: string[];
    personnel: string[];
  };
};

const defaultSearchConfig: SearchConfig = {
  searchableFields: {
    task: ['name', 'description', 'labels', 'tags', 'priority', 'status'],
    client: ['clientName', 'clientCompany'],
    workOrder: ['workOrderTitle', 'workOrderNumber'],
    personnel: ['assignee', 'reporter'],
  },
};

// ----------------------------------------------------------------------

/**
 * Comprehensive search function that searches through all entity types
 * @param tasks - Array of Kanban tasks to search
 * @param searchTerm - Search term to look for
 * @param config - Search configuration (optional)
 * @returns Filtered array of tasks
 */
export function searchTasks(
  tasks: IKanbanTask[],
  searchTerm: string,
  config: SearchConfig = defaultSearchConfig
): IKanbanTask[] {
  if (!searchTerm.trim()) return tasks;

  const lowerSearchTerm = searchTerm.toLowerCase();

  return tasks.filter((task) => {
    // Search in task fields
    const taskMatches = config.searchableFields.task.some((field) => {
      const value = task[field];
      if (Array.isArray(value)) {
        return value.some((item) => String(item).toLowerCase().includes(lowerSearchTerm));
      }
      return value && String(value).toLowerCase().includes(lowerSearchTerm);
    });

    // Search in client fields
    const clientMatches = config.searchableFields.client.some((field) => {
      const value = (task as any)[field];
      return value && String(value).toLowerCase().includes(lowerSearchTerm);
    });

    // Search in work order fields
    const workOrderMatches = config.searchableFields.workOrder.some((field) => {
      const value = (task as any)[field];
      return value && String(value).toLowerCase().includes(lowerSearchTerm);
    });

    // Search in personnel fields (assignees and reporter)
    const assigneeMatches = task.assignee?.some(
      (assignee) =>
        assignee.name?.toLowerCase().includes(lowerSearchTerm) ||
        assignee.email?.toLowerCase().includes(lowerSearchTerm)
    );

    const reporterMatches = task.reporter?.name?.toLowerCase().includes(lowerSearchTerm);

    const personnelMatches = assigneeMatches || reporterMatches;

    return taskMatches || clientMatches || workOrderMatches || personnelMatches;
  });
}

// ----------------------------------------------------------------------

/**
 * Advanced sorting function with support for nested properties
 * @param tasks - Array of tasks to sort
 * @param orderBy - Field to sort by
 * @param order - Sort direction
 * @returns Sorted array of tasks
 */
export function sortTasks(
  tasks: IKanbanTask[],
  orderBy: string,
  order: 'asc' | 'desc'
): IKanbanTask[] {
  return [...tasks].sort((a, b) => {
    let aValue: any = '';
    let bValue: any = '';

    switch (orderBy) {
      case 'name':
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
        break;
      case 'status':
        aValue = a.status?.toLowerCase() || '';
        bValue = b.status?.toLowerCase() || '';
        break;
      case 'priority': {
        const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
        aValue = priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] || 0;
        break;
      }
      case 'due':
        aValue = a.due && a.due[1] ? new Date(a.due[1]) : new Date(0);
        bValue = b.due && b.due[1] ? new Date(b.due[1]) : new Date(0);
        break;
      case 'assignee':
        aValue = a.assignee?.[0]?.name?.toLowerCase() || '';
        bValue = b.assignee?.[0]?.name?.toLowerCase() || '';
        break;
      case 'reporter':
        aValue = a.reporter?.name?.toLowerCase() || '';
        bValue = b.reporter?.name?.toLowerCase() || '';
        break;
      case 'client':
        aValue = ((a as any).clientName || (a as any).clientCompany || '').toLowerCase();
        bValue = ((b as any).clientName || (b as any).clientCompany || '').toLowerCase();
        break;
      case 'workOrder':
        aValue = ((a as any).workOrderTitle || (a as any).workOrderNumber || '').toLowerCase();
        bValue = ((b as any).workOrderTitle || (b as any).workOrderNumber || '').toLowerCase();
        break;
      case 'completedStatus':
        aValue = (a as any).completeStatus ? 1 : 0;
        bValue = (b as any).completeStatus ? 1 : 0;
        break;
      case 'created':
        // Use actual createdAt timestamp for proper sorting
        aValue = (a as any).createdAt ? new Date((a as any).createdAt) : new Date(0);
        bValue = (b as any).createdAt ? new Date((b as any).createdAt) : new Date(0);
        break;
      default:
        // Handle nested property access
        aValue = getNestedValue(a, orderBy);
        bValue = getNestedValue(b, orderBy);
    }

    if (order === 'desc') {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
    return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
  });
}

// ----------------------------------------------------------------------

/**
 * Get nested value from object using dot notation
 * @param obj - Object to get value from
 * @param path - Path to the value (e.g., 'user.name')
 * @returns The value at the path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj) || '';
}

// ----------------------------------------------------------------------

/**
 * Client type for search
 */
export type Client = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  vatNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactPerson?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Comprehensive search function for clients
 * @param clients - Array of clients to search
 * @param searchTerm - Search term to look for
 * @returns Filtered array of clients
 */
export function searchClients(clients: Client[], searchTerm: string): Client[] {
  if (!searchTerm.trim()) return clients;

  const lowerSearchTerm = searchTerm.toLowerCase();

  return clients.filter((client) => {
    const searchableFields = [
      client.name,
      client.email,
      client.company,
      client.vatNumber,
      client.phone,
      client.contactPerson?.name,
      client.contactPerson?.email,
      client.contactPerson?.phone,
      client.address?.street,
      client.address?.city,
      client.address?.state,
      client.address?.zipCode,
      client.address?.country,
      client.notes,
    ];

    return searchableFields
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(lowerSearchTerm));
  });
}
