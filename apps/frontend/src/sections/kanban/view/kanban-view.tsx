'use client';

import type { CSSObject } from '@mui/material/styles';
import type { IKanbanTask } from 'src/types/kanban';

import { mutate } from 'swr';
import { AnimatePresence } from 'framer-motion';
import { useBoolean } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import GlobalStyles from '@mui/material/GlobalStyles';
import FormControlLabel from '@mui/material/FormControlLabel';

import { extractTaskIdFromUrl } from 'src/utils/task-sharing';

import { useGetBoard } from 'src/actions/kanban';
import { useTranslate } from 'src/locales/use-locales';
import { DashboardContent } from 'src/layouts/dashboard';

import { EmptyContent } from 'src/components/empty-content';

import { kanbanClasses } from '../classes';
import { useBoardDnd } from '../hooks/use-board-dnd';
import { KanbanColumn } from '../column/kanban-column';
import { KanbanDetails } from '../details/kanban-details';
import { KanbanColumnAdd } from '../column/kanban-column-add';
import { KanbanTableView } from '../components/kanban-table-view';
import { KanbanColumnSkeleton } from '../components/kanban-skeleton';

// ----------------------------------------------------------------------

const inputGlobalStyles = () => (
  <GlobalStyles
    styles={{
      body: {
        '--kanban-item-gap': '16px',
        '--kanban-item-radius': '12px',
        '--kanban-column-gap': '12px',
        '--kanban-column-width': '336px',
        '--kanban-column-radius': '16px',
        '--kanban-column-pt': '20px',
        '--kanban-column-pb': '16px',
        '--kanban-column-px': '16px',
      },
    }}
  />
);

// ----------------------------------------------------------------------

type KanbanViewProps = {
  taskId?: string;
};

export function KanbanView({ taskId }: KanbanViewProps = {}) {
  const { t } = useTranslate('common');
  const searchParams = useSearchParams();
  const router = useRouter();

  const [columnFixed, setColumnFixed] = useState(false);
  const [tableView, setTableView] = useState(false);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [selectedTask, setSelectedTask] = useState<IKanbanTask | null>(null);
  const taskDetailsDialog = useBoolean();

  const { board, boardLoading, boardEmpty } = useGetBoard(myTasksOnly);
  const { boardRef } = useBoardDnd(board);

  // Find task by ID from all tasks in the board
  const findTaskById = useCallback(
    (id: string): IKanbanTask | null => {
      if (!board?.tasks) return null;

      for (const columnTasks of Object.values(board.tasks)) {
        const task = columnTasks.find((tsk) => tsk.id === id);
        if (task) return task;
      }
      return null;
    },
    [board?.tasks]
  );

  // Handle task selection from URL parameters
  useEffect(() => {
    if (!board?.tasks) return;

    // Get task ID from either prop or URL parameters
    const urlTaskId = taskId || extractTaskIdFromUrl(searchParams, window.location.pathname);

    if (urlTaskId) {
      const task = findTaskById(urlTaskId);
      if (task) {
        setSelectedTask(task);
        taskDetailsDialog.onTrue();
      }
    }
  }, [board?.tasks, taskId, searchParams, findTaskById, taskDetailsDialog]);

  // Listen for kanban refresh events from AI
  useEffect(() => {
    const handleKanbanRefresh = (event: CustomEvent) => {
      // Trigger SWR revalidation to refresh the kanban data
      mutate('/api/v1/kanban');
    };

    window.addEventListener('kanban-refresh', handleKanbanRefresh as EventListener);

    return () => {
      window.removeEventListener('kanban-refresh', handleKanbanRefresh as EventListener);
    };
  }, []);

  const renderLoading = () => (
    <Box sx={{ gap: 'var(--kanban-column-gap)', display: 'flex', alignItems: 'flex-start' }}>
      <KanbanColumnSkeleton />
    </Box>
  );

  const renderEmpty = () => <EmptyContent filled sx={{ py: 10, maxHeight: { md: 480 } }} />;

  const handleTaskUpdate = useCallback((updatedTask: IKanbanTask) => {
    setSelectedTask(updatedTask);
  }, []);

  const handleTaskDelete = useCallback(() => {
    setSelectedTask(null);
    taskDetailsDialog.onFalse();
  }, [taskDetailsDialog]);

  const handleCloseTask = useCallback(() => {
    setSelectedTask(null);
    taskDetailsDialog.onFalse();

    // Update URL to remove task ID when closing drawer
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;

    // Handle path-based task ID (e.g., /dashboard/kanban/{id})
    if (currentPath.includes('/dashboard/kanban/') && currentPath !== '/dashboard/kanban') {
      router.push('/dashboard/kanban');
    }
    // Handle query-based task ID (e.g., /dashboard/kanban?task={id})
    else if (currentSearch.includes('task=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('task');
      router.push(url.pathname + url.search);
    }
  }, [taskDetailsDialog, router]);

  const renderList = () => {
    if (tableView) {
      return <KanbanTableView myTasksOnly={myTasksOnly} />;
    }

    return (
      <FlexibleColumnContainer columnFixed={columnFixed}>
        <AnimatePresence>
          {board.columns.map((column) => (
            <KanbanColumn key={column.id} column={column} tasks={board.tasks[column.id]} />
          ))}
        </AnimatePresence>
        <KanbanColumnAdd />
      </FlexibleColumnContainer>
    );
  };

  const renderHead = () => (
    <Box
      sx={{
        mb: 3,
        pr: { sm: 3 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Typography variant="h4">{t('kanban', { defaultValue: 'Kanban' })}</Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControlLabel
          label={t('myTasks', { defaultValue: 'My tasks' })}
          labelPlacement="start"
          control={
            <Switch
              checked={myTasksOnly}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setMyTasksOnly(event.target.checked);
              }}
              slotProps={{ input: { id: 'my-tasks-switch' } }}
            />
          }
        />

        <FormControlLabel
          label={t('tableView', { defaultValue: 'Table view' })}
          labelPlacement="start"
          control={
            <Switch
              checked={tableView}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setTableView(event.target.checked);
              }}
              slotProps={{ input: { id: 'table-view-switch' } }}
            />
          }
        />

        {!tableView && (
          <FormControlLabel
            label={t('fixedColumn', { defaultValue: 'Fixed column' })}
            labelPlacement="start"
            control={
              <Switch
                checked={columnFixed}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setColumnFixed(event.target.checked);
                }}
                slotProps={{ input: { id: 'fixed-column-switch' } }}
              />
            }
          />
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {inputGlobalStyles()}

      <DashboardContent
        maxWidth={false}
        sx={{
          pb: 0,
          pl: { sm: 3 },
          pr: { sm: 0 },
          minHeight: 0,
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {renderHead()}

        <ScrollContainer ref={boardRef} tableView={tableView}>
          {boardLoading ? renderLoading() : <>{boardEmpty ? renderEmpty() : renderList()}</>}
        </ScrollContainer>
      </DashboardContent>

      {/* Task Details Drawer */}
      {selectedTask && (
        <KanbanDetails
          task={selectedTask}
          open={taskDetailsDialog.value}
          onClose={handleCloseTask}
          onUpdateTask={handleTaskUpdate}
          onDeleteTask={handleTaskDelete}
        />
      )}
    </>
  );
}

// ----------------------------------------------------------------------

const flexStyles: CSSObject = {
  minHeight: 0,
  flex: '1 1 auto',
};

const ScrollContainer = styled('div', {
  shouldForwardProp: (prop: string) => !['tableView', 'sx'].includes(prop),
})<{ tableView?: boolean }>(({ theme }) => ({
  ...theme.mixins.scrollbarStyles(theme),
  ...flexStyles,
  display: 'flex',
  overflowX: 'auto',
  flexDirection: 'column',
  variants: [
    {
      props: { tableView: true },
      style: {
        overflowX: 'visible',
        ...flexStyles,
      },
    },
  ],
}));

const FlexibleColumnContainer = styled('ul', {
  shouldForwardProp: (prop: string) => !['columnFixed', 'sx'].includes(prop),
})<{ columnFixed?: boolean }>(({ theme }) => ({
  display: 'flex',
  gap: 'var(--kanban-column-gap)',
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
  variants: [
    {
      props: { columnFixed: true },
      style: {
        ...flexStyles,
        [`& .${kanbanClasses.column.root}`]: { ...flexStyles },
      },
    },
  ],
}));
