import type { SWRConfiguration } from 'swr';
import type { IKanban, IKanbanTask, IKanbanColumn } from 'src/types/kanban';

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
    board: IKanban;
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
      id: column.id,
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
    const data = { columnData };
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
    const data = { columnId, columnName };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'update-column' } });
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
    mutate(
      KANBAN_ENDPOINT,
      (currentData) => {
        const { data } = currentData as BoardData;
        const { board } = data;

        return { ...currentData, data: { ...data, board: { ...board, columns: updateColumns } } };
      },
      false
    );
  });

  /**
   * Work on server
   */
  if (enableServer) {
    const data = { updateColumns };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'move-column' } });
  }
}

// ----------------------------------------------------------------------

export async function clearColumn(columnId: IKanbanColumn['id']) {
  /**
   * Work on server
   */
  if (enableServer) {
    const data = { columnId };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'clear-column' } });
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

        // remove all tasks in column
        const tasks = { ...board.tasks, [columnId]: [] };

        return { ...currentData, data: { ...data, board: { ...board, tasks } } };
      },
      false
    );
  });
}

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
          obj[key] = board.tasks[key];
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

    // Revalidate the cache to get fresh data from server
    // Revalidate both the base URL and the client-filtered URL if applicable
    mutate(KANBAN_ENDPOINT);
    if (taskData.clientId) {
      mutate(`${KANBAN_ENDPOINT}?clientId=${taskData.clientId}`);
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
          const existingTasks = board.tasks[columnId] || [];
          const tasks = { ...board.tasks, [columnId]: [taskData, ...existingTasks] };

          return { ...currentData, data: { ...data, board: { ...board, tasks } } };
        },
        false
      );
    });
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
          const tasksInColumn = board.tasks[columnId] || [];

          // find and update task
          const updateTasks = tasksInColumn.map((task) =>
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
        const existingTasks = board.tasks[columnId] || [];
        const tasks = {
          ...board.tasks,
          [columnId]: existingTasks.filter((task) => task.id !== taskId),
        };

        return { ...currentData, data: { ...data, board: { ...board, tasks } } };
      },
      false
    );
  }
}
