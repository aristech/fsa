import type { IKanbanTask } from 'src/types/kanban';
import type { UseTaskItemDndReturn } from '../hooks/use-task-item-dnd';

import { toast } from 'sonner';
import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBoolean } from 'minimal-shared/hooks';
import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

import { fDateTime } from 'src/utils/format-time';

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

  // Use pre-computed values from backend to avoid N+1 queries
  const totalHours = (task as any).timeEntriesTotalHours ?? 0;
  const subtaskCount = (task as any).subtasksCount ?? 0;

  // const attachmentsCount = task.attachments?.length || 0;

  const startDate = (task as any).startDate || task.due?.[0];
  const dueDate = (task as any).dueDate || task.due?.[1];

  const handleDeleteTask = useCallback(async () => {
    try {
      await deleteTask(columnId, task.id, task);
      toast.success('Delete success!', { position: 'top-center' });
    } catch (error) {
      console.error(error);
    }
  }, [columnId, task]);

  const handleUpdateTask = useCallback(
    async (taskData: IKanbanTask) => {
      try {
        await updateTask(columnId, taskData);
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
      onCloseAction={taskDetailsDialog.onFalse}
      onUpdateTaskAction={handleUpdateTask}
      onDeleteTaskAction={handleDeleteTask}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TimeTrackingIndicator
            taskId={task.id}
            variant="compact"
            showPersonnel
            showDuration={false}
          />
          {(task as any).isPrivate && (
            <Iconify
              icon="solar:lock-bold"
              width={16}
              sx={{
                color: 'error.main',
                opacity: 0.8,
              }}
            />
          )}
        </Box>
        <ItemName name={task.name} />
        {/* Client / Work order indicators */}
        {(task.clientName ||
          task.clientId ||
          (task as any).workOrderTitle ||
          (task as any).workOrderNumber ||
          (task as any).workOrderId) && (
          <Box sx={{ mt: 0.5, mb: 0.5, display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {(task.clientName || task.clientId) && (
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5 }}>
                <Chip
                  size="small"
                  color="default"
                  variant="outlined"
                  label={task.clientName || `Client: ${task.clientId?.slice(-6) || 'Unknown'}`}
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
                {((task as any).workOrderTitle ||
                  (task as any).workOrderNumber ||
                  (task as any).workOrderId) && (
                  <Chip
                    size="small"
                    color="info"
                    variant="soft"
                    label={
                      (task as any).workOrderTitle ||
                      (task as any).workOrderNumber ||
                      `WO: ${(task as any).workOrderId?.slice(-6) || 'Unknown'}`
                    }
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
                  ? `${fDateTime(startDate)} → ${fDateTime(dueDate)}`
                  : startDate
                    ? `Start: ${fDateTime(startDate)}`
                    : `Due: ${fDateTime(dueDate)}`
              }
              sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.72rem' } }}
            />
          )}

          {/* Recurring indicator */}
          {(task as any).repeat?.enabled && (
            <Chip
              size="small"
              variant="soft"
              color="info"
              icon={<Iconify icon="solar:refresh-square-bold" width={14} />}
              label="Recurring"
              sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.72rem' } }}
            />
          )}

          {/* Reminder indicator */}
          {(task as any).reminder?.enabled && (
            <Chip
              size="small"
              variant="soft"
              color="warning"
              icon={<Iconify icon="solar:bell-bold" width={14} />}
              label="Reminder"
              sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.72rem' } }}
            />
          )}

          {totalHours > 0 && (
            <Chip
              size="small"
              variant="outlined"
              color="default"
              icon={<Iconify icon="solar:clock-circle-bold" width={14} />}
              label={`${totalHours.toFixed ? totalHours.toFixed(2) : Number(totalHours || 0).toFixed(2)}h`}
              sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.72rem' } }}
            />
          )}
        </Box>

        <ItemInfo
          subtaskCount={subtaskCount}
          comments={task.comments}
          assignee={task.assignee}
          attachments={task.attachments}
        />
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
