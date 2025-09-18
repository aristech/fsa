import type { IKanbanTask } from 'src/types/kanban';
import type { UseTaskItemDndReturn } from '../hooks/use-task-item-dnd';

import useSWR from 'swr';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { useMemo, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

import axiosInstance, { endpoints } from 'src/lib/axios';
import { deleteTask, updateTask } from 'src/actions/kanban';

import { Iconify } from 'src/components/iconify';
import { TimeTrackingIndicator } from 'src/components/time-tracking/time-tracking-indicator';

import { kanbanClasses } from '../classes';
import { KanbanDetails } from '../details/kanban-details';
import { useTaskItemDnd } from '../hooks/use-task-item-dnd';
import { getAttr, isSafari, taskMotionOptions } from '../utils/helpers';
import {
  ItemInfo,
  ItemName,
  ItemRoot,
  ItemStatus,
  ItemContent,
  ItemPreview,
  DropIndicator,
} from './styles';

// ----------------------------------------------------------------------

const renderDropIndicator = (
  state: UseTaskItemDndReturn['state'],
  closestEdge: 'top' | 'bottom'
) =>
  state.type === kanbanClasses.state.taskOver && state.closestEdge === closestEdge ? (
    <DropIndicator sx={{ height: state.dragRect.height }} />
  ) : null;

const renderTaskPreview = (state: UseTaskItemDndReturn['state'], task: IKanbanTask) =>
  state.type === kanbanClasses.state.preview
    ? createPortal(
        <ItemPreview
          sx={{
            width: state.dragRect.width,
            ...(!isSafari() && { borderRadius: 'var(--kanban-item-radius)' }),
          }}
        >
          <ItemStatus status={task.priority} />
          <ItemName name={task.name} />
        </ItemPreview>,
        state.container
      )
    : null;

// ----------------------------------------------------------------------

type TaskItemProps = React.ComponentProps<typeof ItemRoot> & {
  task: IKanbanTask;
  columnId: string;
};

export function KanbanTaskItem({ task, columnId, sx, ...other }: TaskItemProps) {
  const taskDetailsDialog = useBoolean();
  const { taskRef, state } = useTaskItemDnd(task, columnId);

  // Fetch time entries total hours for this task (lightweight)
  const timeKey = useMemo(
    () => [endpoints.fsa.timeEntries.list, { params: { taskId: task.id, limit: 100 } }] as const,
    [task.id]
  );
  const { data: timeData } = useSWR<{ success: boolean; data: { hours?: number }[] }>(
    timeKey,
    ([url, cfg]: [string, any]) => axiosInstance.get(url, cfg).then((r) => r.data),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
  const totalHours = useMemo(
    () => (timeData?.data || []).reduce((sum, e: any) => sum + (e.hours || 0), 0),
    [timeData?.data]
  );

  // Fetch subtasks count
  const { data: subtaskData } = useSWR<{ success: boolean; data: any[] }>(
    `/api/v1/subtasks/${task.id}`,
    (url) => axiosInstance.get(url).then((r) => r.data),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
  const subtaskCount = subtaskData?.data?.length || 0;

  const attachmentsCount = task.attachments?.length || 0;

  const startDate = (task as any).startDate || task.due?.[0];
  const dueDate = (task as any).endDate || task.due?.[1];
  const formatTime = (d?: any) => {
    if (!d) return '';
    try {
      const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : new Date(d);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '';
    }
  };

  const handleDeleteTask = useCallback(async () => {
    try {
      deleteTask(columnId, task.id, task);
      toast.success('Delete success!', { position: 'top-center' });
    } catch (error) {
      console.error(error);
    }
  }, [columnId, task]);

  const handleUpdateTask = useCallback(
    async (taskData: IKanbanTask) => {
      try {
        updateTask(columnId, taskData);
      } catch (error) {
        console.error(error);
      }
    },
    [columnId]
  );

  const renderTaskDetailsDialog = () => (
    <KanbanDetails
      task={task}
      open={taskDetailsDialog.value}
      onClose={taskDetailsDialog.onFalse}
      onUpdateTask={handleUpdateTask}
      onDeleteTask={handleDeleteTask}
    />
  );
  const renderTaskDisplay = () => (
    <ItemRoot
      ref={taskRef}
      {...taskMotionOptions(task.id)}
      {...{
        [getAttr('dataTaskId')]: task.id,
      }}
      className={mergeClasses([kanbanClasses.item.root], {
        [kanbanClasses.state.dragging]: state.type === kanbanClasses.state.dragging,
        [kanbanClasses.state.draggingAndLeftSelf]:
          state.type === kanbanClasses.state.draggingAndLeftSelf,
        [kanbanClasses.state.openDetails]: taskDetailsDialog.value,
      })}
      sx={sx}
      onClick={taskDetailsDialog.onTrue}
      {...other}
    >
      <ItemContent>
        <ItemStatus status={task.priority} completed={!!task.completeStatus} />
        <ItemName name={task.name} />
        {/* Client / Work order indicators */}
        {(task.clientName || (task as any).workOrderTitle || (task as any).workOrderNumber) && (
          <Box sx={{ mt: 0.5, mb: 0.5, display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
            {task.clientName && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Chip
                  size="small"
                  color="default"
                  variant="outlined"
                  label={task.clientName}
                  sx={{
                    maxWidth: 140,
                    fontSize: '0.7rem',
                    height: 20,
                    '& .MuiChip-label': {
                      px: 1,
                      display: 'block',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
                {(task as any).workOrderTitle && (
                  <Chip
                    size="small"
                    color="info"
                    variant="soft"
                    label={(task as any).workOrderTitle}
                    sx={{
                      maxWidth: 150,
                      fontSize: '0.7rem',
                      height: 20,
                      '& .MuiChip-label': {
                        px: 1,
                        display: 'block',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      },
                    }}
                  />
                )}
              </Box>
            )}
          </Box>
        )}
        {/* Quick info chips */}
        <Box sx={{ mt: 0.5, mb: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {(startDate || dueDate) && (
            <Chip
              size="small"
              variant="outlined"
              color="default"
              icon={<Iconify icon="solar:calendar-mark-bold" width={14} />}
              label={
                startDate && dueDate
                  ? `${formatTime(startDate)} → ${formatTime(dueDate)}`
                  : startDate
                  ? `Start: ${formatTime(startDate)}`
                  : `Due: ${formatTime(dueDate)}`
              }
              sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.72rem' } }}
            />
          )}
         
          
          <Chip
            size="small"
            variant="outlined"
            color="default"
            icon={<Iconify icon="solar:clock-circle-bold" width={14} />}
            label={`${totalHours.toFixed ? totalHours.toFixed(2) : Number(totalHours || 0).toFixed(2)}h`}
            sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.72rem' } }}
          />
        </Box>
        <Chip
            size="small"
            variant="outlined"
            color="default"
            icon={<Iconify icon="solar:folder-with-files-bold" width={14} />}
            label={`${subtaskCount}`}
            sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.72rem' } }}
          />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <ItemInfo
            comments={task.comments}
            assignee={task.assignee}
            attachments={task.attachments}
          />
          <TimeTrackingIndicator
            taskId={task.id}
            variant="compact"
            showPersonnel
            showDuration={false}
          />
        </Box>
      </ItemContent>
    </ItemRoot>
  );

  return (
    <>
      {renderDropIndicator(state, 'top')}
      {renderTaskDisplay()}
      {renderDropIndicator(state, 'bottom')}
      {renderTaskPreview(state, task)}

      {taskDetailsDialog.value && renderTaskDetailsDialog()}
    </>
  );
}
