import type { IKanbanTask } from 'src/types/kanban';
import type { UseTaskItemDndReturn } from '../hooks/use-task-item-dnd';

import { toast } from 'sonner';
import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBoolean } from 'minimal-shared/hooks';
import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

import { deleteTask, updateTask } from 'src/actions/kanban';

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
