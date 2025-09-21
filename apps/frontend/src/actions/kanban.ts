import type { SWRConfiguration } from 'swr';
import type {
  IKanban,
  ITimeEntry,
  IKanbanTask,
  IKanbanColumn,
  CreateTimeEntryPayload,
  UpdateTimeEntryPayload,
} from 'src/types/kanban';

import useSWR, { mutate } from 'swr';
import { useMemo, startTransition } from 'react';

import { useClient } from 'src/contexts/client-context';
import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const enableServer = true;

const KANBAN_ENDPOINT = endpoints.kanban;

const swrOptions: SWRConfiguration = {
  revalidateIfStale: enableServer,
  revalidateOnFocus: enableServer,
  revalidateOnReconnect: enableServer,
};

// ----------------------------------------------------------------------

type BoardData = {
  success: boolean;
  data: {
    board: {
      tasks: any[];
      columns: any[];
    };
  };
};

export function useGetBoard() {
  const { selectedClient } = useClient();

  // Build URL with client filter
  const url = selectedClient
    ? `${KANBAN_ENDPOINT}?clientId=${selectedClient._id}`
    : KANBAN_ENDPOINT;

  const { data, isLoading, error, isValidating } = useSWR<BoardData>(url, fetcher, {
    ...swrOptions,
  });

  const memoizedValue = useMemo(() => {
    const rawTasks = Array.isArray(data?.data?.board?.tasks) ? data.data.board.tasks : [];
    const rawColumns = Array.isArray(data?.data?.board?.columns) ? data.data.board.columns : [];

    // Transform backend data to frontend format
    const tasks: Record<string, any[]> = {};
    const columns = rawColumns.map((column: any) => ({
      id: column.id, // now backend returns Mongo _id
      name: column.title,
    }));

    // Initialize tasks object with empty arrays for each column
    columns.forEach((column) => {
      tasks[column.id] = [];
    });

    // Group tasks by column based on taskIds
    rawColumns.forEach((column: any) => {
      if (column.taskIds && Array.isArray(column.taskIds)) {
        tasks[column.id] = rawTasks.filter((task: any) => column.taskIds.includes(task.id));
      }
    });

    return {
      board: { tasks, columns },
      boardLoading: isLoading,
      boardError: error,
      boardValidating: isValidating,
      boardEmpty: !isLoading && !isValidating && !columns.length,
    };
  }, [data?.data?.board?.columns, data?.data?.board?.tasks, error, isLoading, isValidating]);

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function createColumn(columnData: IKanbanColumn) {
  /**
   * Work on server
   */
  if (enableServer) {
    const data = { name: columnData.name };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'create-column' } });
  }

  /**
   * Work in local
   */
  mutate(
    KANBAN_ENDPOINT,
    (currentData) => {
      const { data } = currentData as BoardData;
      const { board } = data;

      // add new column in board.columns
      const columns = [...board.columns, columnData];

      // add new task in board.tasks
      const tasks = { ...board.tasks, [columnData.id]: [] };

      return { ...currentData, data: { ...data, board: { ...board, columns, tasks } } };
    },
    false
  );
}

// ----------------------------------------------------------------------

export async function updateColumn(columnId: IKanbanColumn['id'], columnName: string) {
  /**
   * Work on server
   */
  if (enableServer) {
    const data = { columnId, name: columnName };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'rename-column' } });
  }

  /**
   * Work in local
   */
  startTransition(() => {
    mutate(
      KANBAN_ENDPOINT,
      (currentData) => {
        const { data } = currentData as BoardData;
        const { board } = data;

        const columns = board.columns.map((column) =>
          column.id === columnId
            ? {
                // Update data when found
                ...column,
                name: columnName,
              }
            : column
        );

        return { ...currentData, data: { ...data, board: { ...board, columns } } };
      },
      false
    );
  });
}

// ----------------------------------------------------------------------

export async function moveColumn(updateColumns: IKanbanColumn[]) {
  /**
   * Work in local
   */
  startTransition(() => {
    // Create the mutation function
    const updateFunction = (currentData: any) => {
      if (!currentData) return currentData;
      const { data } = currentData as BoardData;
      const { board } = data;

      // Preserve existing tasks when reordering columns
      return {
        ...currentData,
        data: {
          ...data,
          board: {
            ...board,
            columns: updateColumns,
            tasks: board.tasks || {}, // Keep the existing tasks with fallback
          },
        },
      };
    };

    // Mutate the base kanban endpoint
    mutate(KANBAN_ENDPOINT, updateFunction, false);

    // Also mutate any client-filtered endpoints
    mutate(
      (key) =>
        typeof key === 'string' && key.startsWith(KANBAN_ENDPOINT) && key.includes('clientId'),
      updateFunction,
      false
    );
  });

  /**
   * Work on server
   */
  if (enableServer) {
    try {
      const data = { order: updateColumns.map((c, idx) => ({ id: c.id, order: idx })) };
      await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'reorder-columns' } });

      // Force revalidation after server update to ensure consistency
      startTransition(() => {
        // Revalidate base endpoint
        mutate(KANBAN_ENDPOINT);
        // Revalidate any client-filtered endpoints
        mutate((key) => typeof key === 'string' && key.startsWith(KANBAN_ENDPOINT));
      });
    } catch (error) {
      console.error('Failed to update column order on server:', error);
      // Revert optimistic update on error by revalidating
      startTransition(() => {
        mutate(KANBAN_ENDPOINT);
        mutate((key) => typeof key === 'string' && key.startsWith(KANBAN_ENDPOINT));
      });
      throw error;
    }
  }
}

// ----------------------------------------------------------------------

// clearColumn removed (no longer supported server-side)

// ----------------------------------------------------------------------

export async function deleteColumn(columnId: IKanbanColumn['id']) {
  /**
   * Work on server
   */
  if (enableServer) {
    const data = { columnId };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'delete-column' } });
  }

  /**
   * Work in local
   */
  mutate(
    KANBAN_ENDPOINT,
    (currentData) => {
      const { data } = currentData as BoardData;
      const { board } = data;

      // delete column in board.columns
      const columns = board.columns.filter((column) => column.id !== columnId);

      // delete tasks by column deleted
      const tasks = Object.keys(board.tasks)
        .filter((key) => key !== columnId)
        .reduce((obj: IKanban['tasks'], key) => {
          obj[key] = board.tasks[key as keyof typeof board.tasks];
          return obj;
        }, {});

      return { ...currentData, data: { ...data, board: { ...board, columns, tasks } } };
    },
    false
  );
}

// ----------------------------------------------------------------------

export async function createTask(columnId: IKanbanColumn['id'], taskData: IKanbanTask) {
  /**
   * Work on server
   */
  if (enableServer) {
    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticTask = { ...taskData, id: tempId };

    // Build URLs to update
    const urlsToUpdate: string[] = [KANBAN_ENDPOINT];
    if (taskData.clientId) {
      urlsToUpdate.push(`${KANBAN_ENDPOINT}?clientId=${taskData.clientId}`);
    }

    // Optimistically add the task immediately
    urlsToUpdate.forEach((url) => {
      mutate(
        url as any,
        (currentData) => {
          if (!currentData) return currentData;
          const { data } = currentData as BoardData;

          // We need to update the raw data structure that comes from the server
          // The useGetBoard hook rebuilds tasks based on column.taskIds
          const rawTasks = [...(data.board?.tasks || []), optimisticTask];
          const rawColumns = (data.board?.columns || []).map((col: any) => {
            if (col.id === columnId) {
              return {
                ...col,
                taskIds: [optimisticTask.id, ...(col.taskIds || [])],
              };
            }
            return col;
          });

          return {
            ...currentData,
            data: {
              ...data,
              board: {
                ...data.board,
                tasks: rawTasks,
                columns: rawColumns,
              },
            },
          };
        },
        false
      );
    });

    try {
      const data = {
        columnId,
        taskData: {
          ...taskData,
          // Include client information if available
          ...(taskData.clientId && {
            clientId: taskData.clientId,
            clientName: taskData.clientName,
            clientCompany: taskData.clientCompany,
          }),
        },
      };

      await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'create-task' } });

      // Revalidate to get fresh data from server (this will replace optimistic updates)
      await Promise.all(urlsToUpdate.map((url) => mutate(url)));

      // Also revalidate calendar cache since new tasks with dates appear there
      mutate(endpoints.calendar);
      if (taskData.clientId) {
        mutate(`${endpoints.calendar}?clientId=${taskData.clientId}`);
      }
    } catch (error) {
      // Remove optimistic task on error
      urlsToUpdate.forEach((url) => {
        mutate(
          url,
          (currentData) => {
            if (!currentData) return currentData;
            const { data } = currentData as BoardData;

            // Remove the optimistic task from both tasks and column taskIds
            const rawTasks = (data.board?.tasks || []).filter((task: any) => task.id !== tempId);
            const rawColumns = (data.board?.columns || []).map((col: any) => {
              if (col.id === columnId) {
                return {
                  ...col,
                  taskIds: (col.taskIds || []).filter((id: string) => id !== tempId),
                };
              }
              return col;
            });

            return {
              ...currentData,
              data: {
                ...data,
                board: {
                  ...data.board,
                  tasks: rawTasks,
                  columns: rawColumns,
                },
              },
            };
          },
          false
        );
      });
      throw error;
    }
  } else {
    /**
     * Work in local (fallback for when server is disabled)
     */
    startTransition(() => {
      mutate(
        KANBAN_ENDPOINT,
        (currentData) => {
          const { data } = currentData as BoardData;
          const { board } = data;

          // add task in board.tasks
          const existingTasks = board.tasks[columnId as keyof typeof board.tasks] || [];
          const tasks = { ...board.tasks, [columnId]: [taskData, ...existingTasks] };

          return { ...currentData, data: { ...data, board: { ...board, tasks } } };
        },
        false
      );
    });
  }
}

// ----------------------------------------------------------------------

export async function updateTaskDates(
  taskId: string,
  startDate: string | null,
  dueDate: string | null
) {
  /**
   * Update task dates specifically for calendar drag/drop operations
   */
  if (enableServer) {
    const taskData = {
      id: taskId,
      startDate,
      dueDate,
    };

    await axios.post(KANBAN_ENDPOINT, { taskData }, { params: { endpoint: 'update-task' } });

    // Revalidate both kanban and calendar caches
    mutate(KANBAN_ENDPOINT);
    mutate(endpoints.calendar);

    // Also revalidate client-filtered endpoints (common patterns)
    mutate((key) => typeof key === 'string' && key.includes(KANBAN_ENDPOINT));
    mutate((key) => typeof key === 'string' && key.includes(endpoints.calendar));
  }
}

// ----------------------------------------------------------------------

export async function updateTask(columnId: IKanbanColumn['id'], taskData: IKanbanTask) {
  /**
   * Work on server
   */
  if (enableServer) {
    const data = { columnId, taskData };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'update-task' } });

    // Revalidate the cache to get fresh data from server
    // Revalidate both the base URL and the client-filtered URL if applicable
    mutate(KANBAN_ENDPOINT);
    if (taskData.clientId) {
      mutate(`${KANBAN_ENDPOINT}?clientId=${taskData.clientId}`);
    }

    // Also revalidate calendar cache since tasks appear in both views
    mutate(endpoints.calendar);
    if (taskData.clientId) {
      mutate(`${endpoints.calendar}?clientId=${taskData.clientId}`);
    }
  } else {
    /**
     * Work in local (fallback for when server is disabled)
     */
    startTransition(() => {
      mutate(
        KANBAN_ENDPOINT,
        (currentData) => {
          const { data } = currentData as BoardData;
          const { board } = data;

          // tasks in column
          const tasksInColumn = board.tasks[columnId as keyof typeof board.tasks] || [];

          // find and update task
          const updateTasks = tasksInColumn.map((task: any) =>
            task.id === taskData.id
              ? {
                  // Update data when found
                  ...task,
                  ...taskData,
                }
              : task
          );

          const tasks = { ...board.tasks, [columnId]: updateTasks };

          return { ...currentData, data: { ...data, board: { ...board, tasks } } };
        },
        false
      );
    });
  }
}

// ----------------------------------------------------------------------

export async function moveTask(updateTasks: IKanban['tasks']) {
  /**
   * Work on server
   */
  if (enableServer) {
    const data = { updateTasks };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'move-task' } });

    // Revalidate the cache to get fresh data from server
    // Revalidate both the base URL and the client-filtered URL if applicable
    mutate(KANBAN_ENDPOINT);

    // Extract client ID from any task in the updateTasks
    const allTasks = Object.values(updateTasks).flat();
    const clientId = allTasks.find((task) => task.clientId)?.clientId;
    if (clientId) {
      mutate(`${KANBAN_ENDPOINT}?clientId=${clientId}`);
    }
  } else {
    /**
     * Work in local (fallback for when server is disabled)
     */
    startTransition(() => {
      mutate(
        KANBAN_ENDPOINT,
        (currentData) => {
          const { data } = currentData as BoardData;
          const { board } = data;

          // update board.tasks
          const tasks = updateTasks;

          return { ...currentData, data: { ...data, board: { ...board, tasks } } };
        },
        false
      );
    });
  }
}

// ----------------------------------------------------------------------

export async function deleteTask(
  columnId: IKanbanColumn['id'],
  taskId: IKanbanTask['id'],
  taskData?: IKanbanTask
) {
  /**
   * Work on server
   */
  if (enableServer) {
    const data = { columnId, taskId };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'delete-task' } });

    // Revalidate the cache to get fresh data from server
    // Revalidate both the base URL and the client-filtered URL if applicable
    mutate(KANBAN_ENDPOINT);
    if (taskData?.clientId) {
      mutate(`${KANBAN_ENDPOINT}?clientId=${taskData.clientId}`);
    }

    // Also revalidate calendar cache since deleted tasks should be removed from calendar
    mutate(endpoints.calendar);
    if (taskData?.clientId) {
      mutate(`${endpoints.calendar}?clientId=${taskData.clientId}`);
    }
  } else {
    /**
     * Work in local (fallback for when server is disabled)
     */
    mutate(
      KANBAN_ENDPOINT,
      (currentData) => {
        const { data } = currentData as BoardData;
        const { board } = data;

        // delete task in column
        const existingTasks = board.tasks[columnId as keyof typeof board.tasks] || [];
        const tasks = {
          ...board.tasks,
          [columnId]: existingTasks.filter((task: any) => task.id !== taskId),
        };

        return { ...currentData, data: { ...data, board: { ...board, tasks } } };
      },
      false
    );
  }
}

// ----------------------------------------------------------------------
// Time entries actions

export async function listTimeEntries(params: {
  taskId?: string;
  workOrderId?: string;
  personnelId?: string;
  from?: string;
  to?: string;
  limit?: number;
  skip?: number;
}): Promise<{ success: boolean; data: ITimeEntry[] }> {
  const response = await axios.get(endpoints.fsa.timeEntries.list, { params });
  return response.data;
}

export async function createTimeEntry(
  payload: CreateTimeEntryPayload
): Promise<{ success: boolean; data: ITimeEntry }> {
  const response = await axios.post(endpoints.fsa.timeEntries.create, payload);
  return response.data;
}

export async function updateTimeEntry(
  id: string,
  payload: UpdateTimeEntryPayload
): Promise<{ success: boolean; data: ITimeEntry }> {
  const response = await axios.put(endpoints.fsa.timeEntries.update(id), payload);
  return response.data;
}

export async function deleteTimeEntry(id: string): Promise<{ success: boolean }> {
  const response = await axios.delete(endpoints.fsa.timeEntries.delete(id));
  return response.data;
}
