'use client';

import type { IKanbanTask } from 'src/types/kanban';
import type { RepeatSettings, ReminderSettings } from 'src/components/custom-date-range-picker';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
import useSWR, { mutate } from 'swr';
import { Label } from '@/components/label';
import { varAlpha } from 'minimal-shared/utils';
import { useTabs, useBoolean } from 'minimal-shared/hooks';
import { useRef, useMemo, useState, Fragment, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import { styled } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';

import { useTaskRealtime, useRealtimeComments } from 'src/hooks/use-realtime';

import { fDateTime } from 'src/utils/format-time';

import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { KanbanCheckInOut } from 'src/components/kanban/kanban-check-in-out';
import { useDateRangePicker, CustomDateRangePicker } from 'src/components/custom-date-range-picker';

import { ReportCreateDrawer } from 'src/sections/field/reports/report-create-drawer';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

import { SubtaskItem } from '../components/subtask-item';
import { KanbanDetailsTime } from './kanban-details-time';
import { KanbanDetailsToolbar } from './kanban-details-toolbar';
import { KanbanDetailsPriority } from './kanban-details-priority';
import { KanbanInputName } from '../components/kanban-input-name';
import { KanbanDetailsMaterials } from './kanban-details-materials';
import { KanbanDetailsAttachments } from './kanban-details-attachments';
import { KanbanDetailsCommentList } from './kanban-details-comment-list';
import { useSubtaskDropMonitor } from '../hooks/use-subtask-drop-monitor';
import { KanbanDetailsCommentInput } from './kanban-details-comment-input';
import { KanbanContactsDialog } from '../components/kanban-contacts-dialog';

// ----------------------------------------------------------------------

interface ISubtask {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  order: number;
  attachments?: Array<{
    _id: string;
    filename: string;
    originalName: string;
    size: number;
    mimetype: string;
    uploadedAt: string;
    uploadedBy: {
      _id: string;
      name: string;
      email?: string;
    };
  }>;
  createdBy: {
    _id: string;
    name: string;
    email?: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const BlockLabel = styled('span')(({ theme }) => ({
  ...theme.typography.caption,
  width: 100,
  flexShrink: 0,
  color: theme.vars?.palette.text.secondary,
  fontWeight: theme.typography.fontWeightSemiBold,
}));

// ----------------------------------------------------------------------

type Props = {
  task: IKanbanTask;
  open: boolean;
  onClose: () => void;
  onDeleteTask: () => void;
  onUpdateTask: (updateTask: IKanbanTask) => void;
};

export function KanbanDetails({ task, open, onUpdateTask, onDeleteTask, onClose }: Props) {
  const tabs = useTabs('overview');
  const { t } = useTranslate('common');
  const { user } = useAuthContext();

  const contactsDialog = useBoolean();
  const reportCreateDrawer = useBoolean();
  const confirmMakePublicDialog = useBoolean();

  // Function to map task data to report initial data
  const getReportInitialData = useCallback(
    () => ({
      type: 'completion' as const,
      clientId: task.clientId || '',
      location: (task as any)?.location || '',
      reportDate: new Date(),
      priority: (task.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
      workOrderId: (task as any)?.workOrderId || '',
      taskIds: [task.id],
      description: `${t('reportForTask', { defaultValue: 'Report for task' })}: ${task.name}`,
      equipment: (task as any)?.equipment || [],
      tags: task.tags || task.labels || [],
    }),
    [task, t]
  );

  const [taskName, setTaskName] = useState(task.name);
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.columnId || task.status);
  const [taskDescription, setTaskDescription] = useState(task.description || '');
  const [tags, setTags] = useState<string[]>(task.tags || task.labels || []);
  const [isPrivate, setIsPrivate] = useState((task as any).isPrivate || false);
  const [repeatData, setRepeatData] = useState<RepeatSettings | null>((task as any).repeat || null);
  const [reminderData, setReminderData] = useState<ReminderSettings | null>(
    (task as any).reminder || null
  );
  // Fetch subtasks from backend
  const { data: subtasksData } = useSWR(`/api/v1/subtasks/${task.id}`, async (url) => {
    const response = await axiosInstance.get(url);
    return response.data;
  });
  const subtasks: ISubtask[] = useMemo(() => subtasksData?.data || [], [subtasksData?.data]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [isSavingSubtask, setIsSavingSubtask] = useState(false);

  // Fetch comments from backend
  const { data: commentsData } = useSWR(`/api/v1/comments/${task.id}`, async (url) => {
    const response = await axiosInstance.get(url);
    return response.data;
  });
  const comments = commentsData?.data || [];

  // Fetch clients data for client selection
  const { data: clientsData } = useSWR('/api/v1/clients?limit=100', async (url) => {
    try {
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  });
  const clients = Array.isArray(clientsData?.data?.clients) ? clientsData.data.clients : [];

  // Fetch kanban meta data for statuses
  const { data: kanbanMeta } = useSWR(open ? '/api/v1/kanban/meta' : null, async (url) => {
    const response = await axiosInstance.get(url);
    return response.data;
  });
  const statuses = Array.isArray(kanbanMeta?.data?.statuses) ? kanbanMeta.data.statuses : [];

  // Real-time functionality for tasks and comments
  const { typingUsers, startTyping, stopTyping } = useTaskRealtime(task.id);

  // Ref for comments container to enable scrolling
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  // Function to scroll comments to bottom
  const scrollCommentsToBottom = useCallback(() => {
    if (commentsContainerRef.current) {
      requestAnimationFrame(() => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
        }
      });
    }
  }, []);

  // Auto-scroll to bottom when comments tab is opened or comments change
  useEffect(() => {
    if (tabs.value === 'comments' && comments.length > 0) {
      setTimeout(scrollCommentsToBottom, 100);
    }
  }, [tabs.value, comments.length, scrollCommentsToBottom]);

  // Update local state when task changes
  useEffect(() => {
    setTaskName(task.name);
    setPriority(task.priority);
    setStatus(task.columnId || task.status);
    setTaskDescription(task.description || '');
    setTags(task.tags || task.labels || []);
    setIsPrivate((task as any).isPrivate || false);

    // Handle repeat/reminder data - preserve existing local state if available
    const taskRepeat = (task as any).repeat;
    const taskReminder = (task as any).reminder;

    // Only update if we receive valid data from the task
    if (taskRepeat && taskRepeat.enabled !== undefined) {
      setRepeatData(taskRepeat);
    }

    if (taskReminder && taskReminder.enabled !== undefined) {
      setReminderData(taskReminder);
    }
  }, [task]);

  // Handle real-time comment events
  useRealtimeComments(task.id, {
    onCreated: (comment) => {
      // Refresh comments data when a new comment is created
      mutate(`/api/v1/comments/${task.id}`);
      toast.success(`${t('newCommentFrom', { defaultValue: 'New comment from' })} ${comment.name}`);
      // Auto-scroll to show new comment
      setTimeout(scrollCommentsToBottom, 100);
    },
    onUpdated: (commentId, comment) => {
      // Refresh comments data when a comment is updated
      mutate(`/api/v1/comments/${task.id}`);
    },
    onDeleted: (commentId) => {
      // Refresh comments data when a comment is deleted
      mutate(`/api/v1/comments/${task.id}`);
    },
  });

  // Start/Due date range - use individual fields first, fallback to due array
  const rangePicker = useDateRangePicker(
    (task as any).startDate
      ? dayjs((task as any).startDate)
      : task.due?.[0]
        ? dayjs(task.due[0])
        : null,
    (task as any).dueDate ? dayjs((task as any).dueDate) : task.due?.[1] ? dayjs(task.due[1]) : null
  );

  // Update rangePicker dates when task changes (after rangePicker is declared)
  const taskStartDateRaw = (task as any).startDate as unknown;
  const taskDueDateRaw = (task as any).dueDate as unknown;
  const taskDueArray = task.due as readonly [string, string] | undefined;
  const {
    startDate: pickerStartDate,
    endDate: pickerEndDate,
    setStartDate,
    setEndDate,
  } = rangePicker;

  useEffect(() => {
    // Don't reset picker dates when the user is actively selecting dates
    if (rangePicker.open) return;

    const newStartDate = taskStartDateRaw
      ? dayjs(taskStartDateRaw as string | Date)
      : taskDueArray?.[0]
        ? dayjs(taskDueArray[0])
        : null;

    const newDueDate = taskDueDateRaw
      ? dayjs(taskDueDateRaw as string | Date)
      : taskDueArray?.[1]
        ? dayjs(taskDueArray[1])
        : null;

    if (newStartDate && (!pickerStartDate || !newStartDate.isSame(pickerStartDate))) {
      setStartDate?.(newStartDate);
    }
    if (newDueDate && (!pickerEndDate || !newDueDate.isSame(pickerEndDate))) {
      setEndDate?.(newDueDate);
    }
  }, [
    task.id,
    taskStartDateRaw,
    taskDueDateRaw,
    taskDueArray,
    pickerStartDate,
    pickerEndDate,
    setStartDate,
    setEndDate,
    rangePicker.open, // Add this dependency to re-run when dialog closes
  ]);

  const handleChangeTaskName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTaskName(event.target.value);
  }, []);

  const handleUpdateTaskName = useCallback(async () => {
    try {
      if (taskName && taskName !== task.name) {
        await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, {
          taskData: { id: task.id, name: taskName },
        });
        onUpdateTask({ ...task, name: taskName });
        toast.success(t('taskNameUpdated', { defaultValue: 'Task name updated' }));
      }
    } catch (error) {
      console.error('Failed to update task name:', error);
      toast.error(t('failedToUpdateTaskName', { defaultValue: 'Failed to update task name' }));
      // Revert to original name on error
      setTaskName(task.name);
    }
  }, [onUpdateTask, task, taskName, t]);

  const handleKeyUpTaskName = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        await handleUpdateTaskName();
      }
    },
    [handleUpdateTaskName]
  );

  const handleChangeTaskDescription = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTaskDescription(event.target.value);
  }, []);

  const handleBlurTaskDescription = useCallback(async () => {
    try {
      if (taskDescription !== task.description) {
        await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, {
          taskData: { id: task.id, description: taskDescription },
        });
        onUpdateTask({ ...task, description: taskDescription });
        toast.success(t('taskDescriptionUpdated', { defaultValue: 'Task description updated' }));
      }
    } catch (error) {
      console.error('Failed to update description', error);
      toast.error(t('failedToUpdateDescription', { defaultValue: 'Failed to update description' }));
      // Revert to original description on error
      setTaskDescription(task.description || '');
    }
  }, [taskDescription, task, onUpdateTask, t]);
  // Keep local tags in sync with incoming task changes
  useEffect(() => {
    setTags(task.tags || task.labels || []);
  }, [task.tags, task.labels]);

  const handleChangeTags = async (_: any, newTags: string[]) => {
    try {
      setTags(newTags);
      await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, {
        taskData: { id: task.id, labels: newTags },
      });
      onUpdateTask({ ...task, labels: newTags, tags: newTags });
    } catch (e) {
      console.error('Failed to update tags', e);
    }
  };

  const handleChangeClient = async (clientId: string) => {
    try {
      const selectedClient = clients.find((client: any) => client._id === clientId);
      const taskData = {
        id: task.id,
        clientId: clientId || undefined,
        clientName: selectedClient?.name || undefined,
        clientCompany: selectedClient?.company || undefined,
      };

      await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, {
        taskData,
      });

      // Update the task in the parent state
      onUpdateTask({
        ...task,
        clientId,
        clientName: selectedClient?.name || undefined,
        clientCompany: selectedClient?.company || undefined,
      });
      toast.success(
        t('clientUpdatedSuccessfully', { defaultValue: 'Client updated successfully!' })
      );
    } catch (error) {
      console.error('Failed to update client:', error);
      toast.error(t('failedToUpdateClient', { defaultValue: 'Failed to update client' }));
    }
  };

  const handleChangePriority = useCallback(
    (newValue: string) => {
      setPriority(newValue);
      // Persist priority immediately
      axiosInstance
        .post(`${endpoints.kanban}?endpoint=update-task`, {
          taskData: { id: task.id, priority: newValue },
        })
        .catch((e) => console.error('Failed to update priority', e));
    },
    [task.id]
  );

  const handleChangeStatus = useCallback(
    (newValue: string) => {
      setStatus(newValue);
      // Move task to new column/status using the correct updateTasks format
      const updateTasks = {
        [newValue]: [{ id: task.id }],
      };

      axiosInstance
        .post(`${endpoints.kanban}?endpoint=move-task`, {
          updateTasks,
        })
        .then(() => {
          // Update the task in the parent component
          onUpdateTask({ ...task, columnId: newValue, status: newValue } as any);
          toast.success(
            t('taskStatusUpdatedSuccessfully', { defaultValue: 'Task status updated successfully' })
          );
        })
        .catch((e) => {
          console.error('Failed to update status', e);
          toast.error(
            t('failedToUpdateTaskStatus', { defaultValue: 'Failed to update task status' })
          );
          // Revert the status if update failed
          setStatus(task.columnId || task.status);
        });
    },
    [task, onUpdateTask, t]
  );

  const handleConfirmMakePublic = useCallback(async () => {
    try {
      const taskData: any = {
        id: task.id,
        isPrivate: false,
      };

      await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, { taskData });

      setIsPrivate(false);

      // Update parent task
      onUpdateTask({
        ...task,
        isPrivate: false,
      } as any);

      toast.success(t('taskMadePublic', { defaultValue: 'Task is now public' }));
      confirmMakePublicDialog.onFalse();
    } catch (error) {
      console.error('Failed to make task public:', error);
      toast.error(t('failedToUpdatePrivacy', { defaultValue: 'Failed to update privacy status' }));
    }
  }, [task, onUpdateTask, t, confirmMakePublicDialog]);
  // Persist date changes (start/end) with debounce to prevent conflicts during selection
  useEffect(() => {
    if (!rangePicker.startDate || !rangePicker.endDate) return undefined;

    const timeoutId = setTimeout(() => {
      const start = rangePicker.startDate?.utc().toISOString();
      const end = rangePicker.endDate?.utc().toISOString();
      axiosInstance
        .post(`${endpoints.kanban}?endpoint=update-task`, {
          taskData: { id: task.id, startDate: start, dueDate: end },
        })
        .catch((e) => console.error('Failed to update dates', e));
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangePicker.startDate, rangePicker.endDate]);

  // Handler to save repeat/reminder data AND current date selections
  const handleRepeatReminderSubmit = useCallback(
    async (data?: { repeat?: RepeatSettings; reminder?: ReminderSettings }) => {
      try {
        const taskData: any = { id: task.id };

        // Always save current date selections when Apply is pressed (in UTC)
        if (rangePicker.startDate && rangePicker.endDate) {
          taskData.startDate = rangePicker.startDate.utc().toISOString();
          taskData.dueDate = rangePicker.endDate.utc().toISOString();
        }

        // Handle repeat data - always include it if provided
        if (data?.repeat !== undefined) {
          taskData.repeat = data.repeat;
          setRepeatData(data.repeat);
        }

        // Handle reminder data - always include it if provided
        if (data?.reminder !== undefined) {
          taskData.reminder = data.reminder;
          setReminderData(data.reminder);
        }

        await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, { taskData });

        // Invalidate kanban cache to ensure UI updates
        await mutate(endpoints.kanban);

        // Update the task with the new data, including dates, repeat, and reminder
        const updatedTask = {
          ...task,
          ...(rangePicker.startDate &&
            rangePicker.endDate && {
              startDate: rangePicker.startDate.utc().toISOString(),
              dueDate: rangePicker.endDate.utc().toISOString(),
            }),
          repeat: data?.repeat !== undefined ? data.repeat : (task as any).repeat,
          reminder: data?.reminder !== undefined ? data.reminder : (task as any).reminder,
        };
        onUpdateTask(updatedTask as any);

        toast.success(t('scheduleUpdated', { defaultValue: 'Schedule updated successfully' }));
      } catch (error) {
        console.error('Failed to update repeat/reminder settings:', error);
        toast.error(
          t('failedToUpdateSchedule', { defaultValue: 'Failed to update schedule settings' })
        );
      }
    },
    [task, onUpdateTask, t, rangePicker.startDate, rangePicker.endDate]
  );

  // Subtask handlers
  const handleToggleSubtask = useCallback(
    async (subtaskId: string, completed: boolean) => {
      try {
        await axiosInstance.put(`/api/v1/subtasks/${task.id}/${subtaskId}`, { completed });
        mutate(`/api/v1/subtasks/${task.id}`);
        toast.success(
          completed
            ? t('subtaskCompleted', { defaultValue: 'Subtask completed' })
            : t('subtaskReopened', { defaultValue: 'Subtask reopened' })
        );
      } catch (error) {
        console.error('Failed to update subtask:', error);
        toast.error(t('failedToUpdateSubtask', { defaultValue: 'Failed to update subtask' }));
      }
    },
    [task.id, t]
  );

  const handleCreateSubtask = useCallback(async () => {
    if (!newSubtaskTitle.trim()) return;

    try {
      await axiosInstance.post(`/api/v1/subtasks/${task.id}`, { title: newSubtaskTitle.trim() });
      setNewSubtaskTitle('');
      mutate(`/api/v1/subtasks/${task.id}`);
      toast.success(t('subtaskCreated', { defaultValue: 'Subtask created' }));
    } catch (error) {
      console.error('Failed to create subtask:', error);
      toast.error(t('failedToCreateSubtask', { defaultValue: 'Failed to create subtask' }));
    }
  }, [task.id, newSubtaskTitle, t]);

  const handleDeleteSubtask = useCallback(
    async (subtaskId: string) => {
      try {
        await axiosInstance.delete(`/api/v1/subtasks/${task.id}/${subtaskId}`);
        mutate(`/api/v1/subtasks/${task.id}`);
        toast.success(t('subtaskDeleted', { defaultValue: 'Subtask deleted' }));
      } catch (error) {
        console.error('Failed to delete subtask:', error);
        toast.error(t('failedToDeleteSubtask', { defaultValue: 'Failed to delete subtask' }));
      }
    },
    [task.id, t]
  );

  const handleStartEditSubtask = useCallback((subtask: ISubtask) => {
    setEditingSubtaskId(subtask._id);
    setEditingSubtaskTitle(subtask.title);
  }, []);

  const handleCancelEditSubtask = useCallback(() => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  }, []);

  const handleSaveEditSubtask = useCallback(async () => {
    if (!editingSubtaskId) return;
    const title = editingSubtaskTitle.trim();
    if (!title) {
      handleCancelEditSubtask();
      return;
    }
    try {
      setIsSavingSubtask(true);
      await axiosInstance.put(`/api/v1/subtasks/${task.id}/${editingSubtaskId}`, { title });
      await mutate(`/api/v1/subtasks/${task.id}`);
      toast.success(t('subtaskUpdated', { defaultValue: 'Subtask updated' }));
    } catch (error) {
      console.error('Failed to update subtask title:', error);
      toast.error(t('failedToUpdateSubtask', { defaultValue: 'Failed to update subtask' }));
    } finally {
      setIsSavingSubtask(false);
      handleCancelEditSubtask();
    }
  }, [editingSubtaskId, editingSubtaskTitle, handleCancelEditSubtask, t, task.id]);

  const handleReorderSubtasks = useCallback(
    async ({
      subtaskId,
      targetSubtaskId,
      position,
    }: {
      subtaskId: string;
      targetSubtaskId: string;
      position: 'before' | 'after';
    }) => {
      try {
        // Find current positions
        const sourceIndex = subtasks.findIndex((s) => s._id === subtaskId);
        const targetIndex = subtasks.findIndex((s) => s._id === targetSubtaskId);

        if (sourceIndex === -1 || targetIndex === -1) return;

        // Calculate new order
        const reorderedSubtasks = [...subtasks];
        const [movedSubtask] = reorderedSubtasks.splice(sourceIndex, 1);

        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        const adjustedIndex = sourceIndex < targetIndex ? insertIndex - 1 : insertIndex;

        reorderedSubtasks.splice(adjustedIndex, 0, movedSubtask);

        // Create array of subtask IDs in new order
        const subtaskIds = reorderedSubtasks.map((s) => s._id);

        // Send reorder request to backend
        await axiosInstance.put(`/api/v1/subtasks/${task.id}/reorder`, { subtaskIds });

        // Refresh subtasks data
        mutate(`/api/v1/subtasks/${task.id}`);

        toast.success(t('subtasksReordered', { defaultValue: 'Subtasks reordered' }));
      } catch (error) {
        console.error('Failed to reorder subtasks:', error);
        toast.error(t('failedToReorderSubtasks', { defaultValue: 'Failed to reorder subtasks' }));
      }
    },
    [subtasks, task.id, t]
  );

  // Set up drag and drop monitor
  useSubtaskDropMonitor({ onReorder: handleReorderSubtasks });

  const handleUploadSubtaskAttachment = useCallback(
    async (subtaskId: string, files: File[]) => {
      try {
        const uploadPromises = files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);

          await axiosInstance.post(
            `/api/v1/subtasks/${task.id}/${subtaskId}/attachments`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );
        });

        await Promise.all(uploadPromises);

        // Refresh subtasks data
        mutate(`/api/v1/subtasks/${task.id}`);

        toast.success(
          t('attachmentsUploaded', { defaultValue: 'Attachments uploaded successfully' })
        );
      } catch (error) {
        console.error('Failed to upload attachments:', error);
        toast.error(
          t('failedToUploadAttachments', { defaultValue: 'Failed to upload attachments' })
        );
      }
    },
    [task.id, t]
  );

  const handleDeleteSubtaskAttachment = useCallback(
    async (subtaskId: string, attachmentId: string) => {
      try {
        await axiosInstance.delete(
          `/api/v1/subtasks/${task.id}/${subtaskId}/attachments/${attachmentId}`
        );

        // Refresh subtasks data
        mutate(`/api/v1/subtasks/${task.id}`);

        toast.success(t('attachmentDeleted', { defaultValue: 'Attachment deleted successfully' }));
      } catch (error) {
        console.error('Failed to delete attachment:', error);
        toast.error(t('failedToDeleteAttachment', { defaultValue: 'Failed to delete attachment' }));
      }
    },
    [task.id, t]
  );

  const renderToolbar = () => (
    <KanbanDetailsToolbar
      taskName={task.name}
      taskId={task.id}
      onDelete={onDeleteTask}
      taskStatus={task.status}
      workOrderId={(task as any)?.workOrderId}
      workOrderNumber={(task as any)?.workOrderNumber}
      completeStatus={task.completeStatus}
      onToggleComplete={async (next) => {
        try {
          await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, {
            taskData: { id: task.id, completeStatus: next },
          });
          onUpdateTask({ ...task, completeStatus: next });
          toast.success(
            next
              ? t('markedComplete', { defaultValue: 'Marked complete' })
              : t('markedIncomplete', { defaultValue: 'Marked incomplete' })
          );
        } catch (e) {
          console.error('Failed to toggle completion', e);
          toast.error(
            t('failedToUpdateCompletion', { defaultValue: 'Failed to update completion' })
          );
        }
      }}
      onChangeWorkOrder={async (wo) => {
        try {
          if (!wo) {
            await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, {
              taskData: {
                id: task.id,
                workOrderId: undefined,
                workOrderNumber: undefined,
                workOrderTitle: undefined,
              },
            });
            onUpdateTask({
              ...(task as any),
              workOrderId: undefined,
              workOrderNumber: undefined,
              workOrderTitle: undefined,
            } as any);

            // Invalidate kanban cache to refresh work order display
            try {
              await mutate(endpoints.kanban);
            } catch (error) {
              console.error('Failed to refresh kanban data:', error);
            }
            return;
          }

          // Fetch client info from WO first, then make single API call
          let clientData = {};
          try {
            const woResp = await axiosInstance.get(endpoints.fsa.workOrders.details(wo.id));
            const clientId = woResp?.data?.data?.clientId || woResp?.data?.data?.client?._id;
            const clientName = woResp?.data?.data?.clientName || woResp?.data?.data?.client?.name;
            const clientCompany =
              woResp?.data?.data?.clientCompany || woResp?.data?.data?.client?.company;
            if (clientId) {
              clientData = { clientId, clientName, clientCompany };
            }
          } catch (err) {
            console.warn('Failed to prefill client from work order', err);
          }

          // Single API call with all work order and client data
          await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, {
            taskData: {
              id: task.id,
              workOrderId: wo.id,
              workOrderNumber: wo.number,
              workOrderTitle: wo.label,
              ...clientData,
            },
          });

          // Update local task with all the new information
          onUpdateTask({
            ...(task as any),
            workOrderId: wo.id,
            workOrderNumber: wo.number,
            workOrderTitle: wo.label,
            ...clientData,
          } as any);
        } catch (e) {
          console.error('Failed to update work order on task', e);
        }

        // Invalidate kanban cache to refresh work order display
        try {
          await mutate(endpoints.kanban);
        } catch (error) {
          console.error('Failed to refresh kanban data:', error);
        }
      }}
      onCloseDetails={onClose}
      onCreateReport={reportCreateDrawer.onTrue}
      isPrivate={isPrivate}
      isCreator={user?.id === task.reporter?.id}
      onTogglePrivate={confirmMakePublicDialog.onTrue}
    />
  );
  const renderTabs = () => (
    <Tabs
      value={tabs.value}
      onChange={tabs.onChange}
      variant="fullWidth"
      indicatorColor="custom"
      sx={{ '--item-padding-x': 0 }}
    >
      {[
        { value: 'overview', label: t('overview', { defaultValue: 'Overview' }) },
        { value: 'time', label: t('time', { defaultValue: 'Time' }) },
        {
          value: 'subTasks',
          label: t('subtasks', { defaultValue: 'Subtasks' }),
          count: subtasks.length,
        },
        { value: 'materials', label: t('materials', { defaultValue: 'Materials' }) },
        {
          value: 'comments',
          label: t('comments', { defaultValue: 'Comments' }),
          count: comments.length,
        },
      ].map((tab) => (
        <Tab
          key={tab.value}
          value={tab.value}
          label={
            tab.count !== undefined ? (
              <Box sx={{ display: 'absolute', alignItems: 'center', gap: 1 }}>
                <span>{tab.label}</span>
                <Badge
                  badgeContent={tab.count}
                  invisible={!tab.count}
                  sx={{ position: 'absolute', top: 12, right: 12 }}
                />
              </Box>
            ) : (
              tab.label
            )
          }
        />
      ))}
    </Tabs>
  );

  const renderTabOverview = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      {/* Task name */}
      <KanbanInputName
        placeholder={t('taskName', { defaultValue: 'Task name' })}
        value={taskName}
        onChange={handleChangeTaskName}
        onKeyUp={handleKeyUpTaskName}
        onBlur={handleUpdateTaskName}
        inputProps={{ id: `${taskName}-task-input` }}
      />

      {/* Reporter */}
      {task.reporter && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BlockLabel>{t('reporter', { defaultValue: 'Reporter' })}</BlockLabel>
          <Tooltip title={task.reporter.name || t('reporter', { defaultValue: 'Reporter' })}>
            <Avatar>
              {task.reporter.initials ||
                task.reporter.name
                  ?.split(' ')
                  .map((n) => n.charAt(0))
                  .join('')
                  .toUpperCase() ||
                'R'}
            </Avatar>
          </Tooltip>
        </Box>
      )}
      {/* Assignee */}
      <Box sx={{ display: 'flex' }}>
        <BlockLabel sx={{ height: 40, lineHeight: '40px' }}>
          {t('assignee', { defaultValue: 'Assignee' })}
        </BlockLabel>

        <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
          {task.assignee &&
            Array.isArray(task.assignee) &&
            task.assignee.length > 0 &&
            task.assignee.map((assignee) => (
              <Tooltip
                key={assignee.id}
                title={`${assignee.name}${(assignee as any).email ? ` • ${(assignee as any).email}` : ''}`}
              >
                <Avatar>
                  {assignee.initials ||
                    assignee.name
                      ?.split(' ')
                      .map((n) => n.charAt(0))
                      .join('')
                      .toUpperCase() ||
                    'A'}
                </Avatar>
              </Tooltip>
            ))}

          <Tooltip title={t('addAssignee', { defaultValue: 'Add assignee' })}>
            <IconButton
              onClick={contactsDialog.onTrue}
              sx={[
                (theme) => ({
                  border: `dashed 1px ${theme.vars?.palette.divider}`,
                  bgcolor: varAlpha(theme.vars?.palette.grey['500Channel'] || '0 0 0', 0.08),
                }),
              ]}
            >
              <Iconify icon="mingcute:add-line" />
            </IconButton>
          </Tooltip>

          <KanbanContactsDialog
            assignee={task.assignee}
            open={contactsDialog.value}
            onClose={contactsDialog.onFalse}
            onAssign={async (list) => {
              try {
                await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, {
                  taskData: { id: task.id, assignees: list.map((p) => p.id) },
                });
                onUpdateTask({ ...task, assignee: list });
              } catch (e) {
                console.error('Failed to update assignees', e);
              }
            }}
          />
        </Box>
      </Box>
      {/* Labels / Tags (editable) */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel sx={{ height: 40, lineHeight: '40px' }}>
          {t('labels', { defaultValue: 'Labels' })}
        </BlockLabel>
        <Autocomplete
          multiple
          freeSolo
          options={[]}
          value={tags}
          onChange={handleChangeTags}
          renderTags={(value: readonly string[], getTagProps) =>
            value.map((option: string, index: number) => (
              <Chip
                {...getTagProps({ index })}
                key={`${option}-${index}`}
                label={option}
                size="small"
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder={t('addLabel', { defaultValue: 'Add label' })}
            />
          )}
          sx={{ flexGrow: 1 }}
        />
      </Box>

      {/* Client */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel>{t('client', { defaultValue: 'Client' })}</BlockLabel>
        <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
          <Select
            value={task.clientId || ''}
            onChange={(e) => handleChangeClient(e.target.value)}
            displayEmpty
            disabled={!clientsData}
          >
            <MenuItem value="">
              <em>{t('noClient', { defaultValue: 'No Client' })}</em>
            </MenuItem>
            {clients.map((client: any) => (
              <MenuItem key={client._id} value={client._id}>
                {client.name}
                {client.company && ` (${client.company})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Tags display row is merged with Labels above */}
      {/* Start / Due date */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel>{t('startDue', { defaultValue: 'Start / Due' })}</BlockLabel>

        {rangePicker.selected ? (
          <Button size="small" onClick={rangePicker.onOpen}>
            <Chip
              size="small"
              variant="outlined"
              color="default"
              icon={<Iconify icon="solar:calendar-mark-bold" width={14} />}
              label={
                rangePicker.startDate && rangePicker.endDate
                  ? `${fDateTime(rangePicker.startDate)} → ${fDateTime(rangePicker.endDate)}`
                  : rangePicker.startDate
                    ? `Start: ${fDateTime(rangePicker.startDate)}`
                    : `Due: ${fDateTime(rangePicker.endDate)}`
              }
              sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.72rem' } }}
            />

            {/* <Stack direction="column" spacing={0.5} alignItems="flex-start">
              {rangePicker.shortLabel}

              {rangePicker.startDate && rangePicker.endDate && (
                <Chip
                  size="small"
                  label={`${rangePicker.startDate.format('HH:mm')} - ${rangePicker.endDate.format('HH:mm')}`}
                  sx={{ ml: 0.5 }}
                />
              )}
            </Stack> */}
          </Button>
        ) : (
          <Tooltip title={t('addDueDate', { defaultValue: 'Add due date' })}>
            <IconButton
              onClick={rangePicker.onOpen}
              sx={[
                (theme) => ({
                  border: `dashed 1px ${theme.vars?.palette.divider}`,
                  bgcolor: varAlpha(theme.vars?.palette.grey['500Channel'] || '0 0 0', 0.08),
                }),
              ]}
            >
              <Iconify icon="mingcute:add-line" />
            </IconButton>
          </Tooltip>
        )}

        <CustomDateRangePicker
          variant="calendar"
          title={t('chooseTaskDatesTimes', { defaultValue: 'Choose task dates & times' })}
          enableTime
          enableRepeat
          enableReminder
          startDate={rangePicker.startDate}
          endDate={rangePicker.endDate}
          onChangeStartDate={rangePicker.onChangeStartDate}
          onChangeEndDate={rangePicker.onChangeEndDate}
          open={rangePicker.open}
          onClose={rangePicker.onClose}
          selected={rangePicker.selected}
          error={rangePicker.error}
          existingRepeat={repeatData || undefined}
          existingReminder={reminderData || undefined}
          onSubmit={handleRepeatReminderSubmit}
        />
      </Box>

      {/* Repeat/Reminder indicators */}
      {(repeatData?.enabled === true || reminderData?.enabled === true) && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BlockLabel>{t('schedule', { defaultValue: 'Schedule' })}</BlockLabel>
          <Stack direction="row" spacing={1}>
            {repeatData?.enabled && (
              <Chip
                size="small"
                variant="soft"
                color="info"
                icon={<Iconify icon="solar:refresh-square-bold" width={16} />}
                label={`${t('recurring', { defaultValue: 'Recurring' })}: ${
                  repeatData.type === 'daily'
                    ? t('daily', { defaultValue: 'Daily' })
                    : repeatData.type === 'weekly'
                      ? t('weekly', { defaultValue: 'Weekly' })
                      : repeatData.type === 'monthly'
                        ? t('monthly', { defaultValue: 'Monthly' })
                        : repeatData.type === 'yearly'
                          ? t('yearly', { defaultValue: 'Yearly' })
                          : repeatData.type === 'custom'
                            ? `${t('every', { defaultValue: 'Every' })} ${repeatData.frequency || 1} ${repeatData.customType || 'weeks'}`
                            : repeatData.type || t('daily', { defaultValue: 'Daily' })
                }`}
              />
            )}
            {reminderData?.enabled && (
              <Chip
                size="small"
                variant="soft"
                color="warning"
                icon={<Iconify icon="solar:bell-bold" width={16} />}
                label={`${t('reminder', { defaultValue: 'Reminder' })}: ${
                  reminderData.type === '1hour'
                    ? t('1hour', { defaultValue: '1 hour' })
                    : reminderData.type === '1day'
                      ? t('1day', { defaultValue: '1 day' })
                      : reminderData.type === '1week'
                        ? t('1week', { defaultValue: '1 week' })
                        : reminderData.type === '1month'
                          ? t('1month', { defaultValue: '1 month' })
                          : reminderData.type || t('1hour', { defaultValue: '1 hour' })
                } ${t('before', { defaultValue: 'before' })}`}
              />
            )}
          </Stack>
        </Box>
      )}

      {/* Priority */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel>{t('priority', { defaultValue: 'Priority' })}</BlockLabel>
        {/* Fallback to existing control if you prefer icons; for now, keep it and treat options dynamically */}
        <KanbanDetailsPriority priority={priority} onChangePriority={handleChangePriority} />
      </Box>

      {/* Status */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel>{t('status', { defaultValue: 'Status' })}</BlockLabel>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={status || ''}
            onChange={(event) => handleChangeStatus(event.target.value)}
            displayEmpty
            sx={{ ml: 1 }}
          >
            {statuses.map((statusOption: any) => (
              <MenuItem key={statusOption.id} value={statusOption.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: statusOption.color || '#888',
                    }}
                  />
                  {statusOption.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {/* Description */}
      <Box sx={{ display: 'flex' }}>
        <BlockLabel>{t('description', { defaultValue: 'Description' })}</BlockLabel>
        <TextField
          fullWidth
          multiline
          size="small"
          minRows={4}
          value={taskDescription}
          onChange={handleChangeTaskDescription}
          onBlur={handleBlurTaskDescription}
          slotProps={{ input: { sx: { typography: 'body2' } } }}
        />
      </Box>
      {/* Attachments */}
      <Box sx={{ display: 'flex' }}>
        <BlockLabel>{t('attachments', { defaultValue: 'Attachments' })}</BlockLabel>
        <KanbanDetailsAttachments
          attachments={task.attachments}
          taskId={task.id}
          onChange={async (files: any[]) => {
            try {
              await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, {
                taskData: { id: task.id, attachments: files },
              });
              onUpdateTask({ ...(task as any), attachments: files } as any);
            } catch (e) {
              console.error('Failed to update attachments', e);
            }
          }}
        />
      </Box>
    </Box>
  );

  const renderTabSubtasks = () => {
    const completedCount = subtasks.filter((s) => s.completed).length;
    const totalCount = subtasks.length;

    return (
      <Box
        sx={{
          gap: 3,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
        }}
      >
        <div>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {completedCount} {t('of', { defaultValue: 'of' })} {totalCount}{' '}
            {t('completed', { defaultValue: 'completed' })}
          </Typography>

          <LinearProgress
            variant="determinate"
            value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0}
          />
        </div>
        <Label variant="soft" sx={{ letterSpacing: 1, color: 'text.secondary' }}>
          Double click to edit • Drag to reorder
        </Label>
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
          {subtasks.map((subtask, index) => (
            <Fragment key={subtask._id}>
              <SubtaskItem
                subtask={subtask}
                taskId={task.id}
                isEditing={editingSubtaskId === subtask._id}
                editingTitle={editingSubtaskTitle}
                isSaving={isSavingSubtask}
                onToggleCompleted={handleToggleSubtask}
                onStartEdit={handleStartEditSubtask}
                onEditTitleChange={setEditingSubtaskTitle}
                onSaveEdit={handleSaveEditSubtask}
                onCancelEdit={handleCancelEditSubtask}
                onDelete={handleDeleteSubtask}
                onUploadAttachment={handleUploadSubtaskAttachment}
                onDeleteAttachment={handleDeleteSubtaskAttachment}
              />
              {index < subtasks.length - 1 && <Divider sx={{ my: 1 }} />}
            </Fragment>
          ))}
        </Box>

        {/* Add new subtask */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'flex-start',
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <TextField
            size="small"
            multiline
            minRows={1}
            maxRows={4}
            placeholder={t('addSubtask', { defaultValue: 'Add subtask...' })}
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCreateSubtask();
              }
            }}
            sx={{
              flexGrow: 1,
              minWidth: 0,
              '& .MuiInputBase-root': {
                alignItems: 'flex-start',
              },
              '& .MuiInputBase-input': {
                resize: 'none',
              },
            }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleCreateSubtask}
            disabled={!newSubtaskTitle.trim()}
            sx={{
              mt: 0.5,
              flexShrink: 0,
              minWidth: 'auto',
              px: 1.5,
            }}
          >
            {t('add', { defaultValue: 'Add' })}
          </Button>
        </Box>
      </Box>
    );
  };

  const renderTabComments = () => (
    <Box
      ref={commentsContainerRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '400px',
        overflowY: 'auto',
        scrollBehavior: 'smooth',
      }}
    >
      <KanbanDetailsCommentList comments={comments} />

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <Box
          sx={{
            px: 2.5,
            py: 1,
            fontSize: '0.875rem',
            color: 'text.secondary',
            fontStyle: 'italic',
          }}
        >
          {typingUsers.length === 1
            ? `${typingUsers[0].userEmail} ${t('isTyping', { defaultValue: 'is typing...' })}`
            : `${typingUsers.map((u) => u.userEmail).join(', ')} ${t('areTyping', { defaultValue: 'are typing...' })}`}
        </Box>
      )}
    </Box>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      aria-hidden={!open}
      anchor="right"
      slotProps={{
        backdrop: { invisible: true },
        paper: { sx: { width: { xs: 1, sm: 480 } } },
      }}
    >
      {renderToolbar()}

      {/* CheckIn/CheckOut Header */}
      <Box sx={{ px: 2.5, pt: 2 }}>
        <KanbanCheckInOut
          taskId={task.id}
          workOrderId={(task as any)?.workOrderId}
          onTimeEntryCreated={() => {
            // Refresh time entries when a new one is created
            if (tabs.value === 'time') {
              // This will trigger a refresh of the time tab
              window.dispatchEvent(new CustomEvent('timeEntryCreated'));
            }
          }}
        />
      </Box>

      {renderTabs()}

      <Scrollbar fillContent sx={{ py: 3, px: 2.5 }}>
        {tabs.value === 'overview' && renderTabOverview()}
        {tabs.value === 'time' && (
          <KanbanDetailsTime taskId={task.id} workOrderId={(task as any)?.workOrderId} />
        )}
        {tabs.value === 'subTasks' && renderTabSubtasks()}
        {tabs.value === 'materials' && <KanbanDetailsMaterials taskId={task.id} />}
        {tabs.value === 'comments' && renderTabComments()}
      </Scrollbar>

      {tabs.value === 'comments' && (
        <KanbanDetailsCommentInput
          taskId={task.id}
          onStartTyping={startTyping}
          onStopTyping={stopTyping}
          onCommentSent={scrollCommentsToBottom}
        />
      )}

      {/* Report Create Drawer */}
      <ReportCreateDrawer
        open={reportCreateDrawer.value}
        onClose={reportCreateDrawer.onFalse}
        onSuccess={() => {
          toast.success(
            t('reportCreatedSuccessfully', { defaultValue: 'Report created successfully' })
          );
          reportCreateDrawer.onFalse();
        }}
        initialData={getReportInitialData}
      />

      {/* Confirm Make Public Dialog */}
      <ConfirmDialog
        open={confirmMakePublicDialog.value}
        onClose={confirmMakePublicDialog.onFalse}
        title={t('makeTaskPublic', { defaultValue: 'Make Task Public?' })}
        content={
          <Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {t('makeTaskPublicWarning', {
                defaultValue:
                  'Are you sure you want to make this task public? This action is irreversible.',
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('makeTaskPublicInfo', {
                defaultValue: 'Once public, you will not be able to make this task private again.',
              })}
            </Typography>
          </Box>
        }
        action={
          <Button variant="contained" color="error" onClick={handleConfirmMakePublic}>
            {t('makePublic', { defaultValue: 'Make Public' })}
          </Button>
        }
      />
    </Drawer>
  );
}
