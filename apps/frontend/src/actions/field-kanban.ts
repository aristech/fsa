import type { SWRConfiguration } from 'swr';

import useSWR from 'swr';
import { useMemo, useCallback } from 'react';

import { fetcher, endpoints } from '../lib/axios';

// ----------------------------------------------------------------------

const KANBAN_ENDPOINT = endpoints.kanban;

const swrOptions: SWRConfiguration = {
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

type BoardData = {
  data: {
    board: {
      tasks: any[];
      columns: any[];
    };
  };
};

export function useGetFieldBoard(myTasksOnly = false) {
  // Use the kanban endpoint with optional "my tasks" filtering for field environment
  const url = myTasksOnly ? `${KANBAN_ENDPOINT}?assignedToMe=true` : KANBAN_ENDPOINT;

  const { data, isLoading, error, isValidating, mutate } = useSWR<BoardData>(url, fetcher, {
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

  const refreshBoard = useCallback(() => mutate(), [mutate]);

  return {
    ...memoizedValue,
    refreshBoard,
  };
}
