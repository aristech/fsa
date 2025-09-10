import type { IKanbanTask } from 'src/types/kanban';

import dayjs from 'dayjs';
import useSWR, { mutate } from 'swr';
import { varAlpha } from 'minimal-shared/utils';
import { useTabs, useBoolean } from 'minimal-shared/hooks';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import FormGroup from '@mui/material/FormGroup';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useTaskRealtime, useRealtimeComments } from 'src/hooks/use-realtime';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { useDateRangePicker, CustomDateRangePicker } from 'src/components/custom-date-range-picker';

import { KanbanDetailsToolbar } from './kanban-details-toolbar';
import { KanbanInputName } from '../components/kanban-input-name';
import { KanbanDetailsPriority } from './kanban-details-priority';
import { KanbanDetailsAttachments } from './kanban-details-attachments';
import { KanbanDetailsCommentList } from './kanban-details-comment-list';
import { KanbanDetailsCommentInput } from './kanban-details-comment-input';
import { KanbanContactsDialog } from '../components/kanban-contacts-dialog';

// ----------------------------------------------------------------------

interface ISubtask {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
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
  color: theme.vars.palette.text.secondary,
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

  const contactsDialog = useBoolean();

  const [taskName, setTaskName] = useState(task.name);
  const [priority, setPriority] = useState(task.priority);
  const [taskDescription, setTaskDescription] = useState(task.description);
  const [tags, setTags] = useState<string[]>(task.tags || task.labels || []);
  // Fetch subtasks from backend
  const { data: subtasksData } = useSWR(
    `/api/v1/subtasks/${task.id}`,
    async (url) => {
      const response = await axiosInstance.get(url);
      return response.data;
    }
  );
  const subtasks: ISubtask[] = subtasksData?.data || [];
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Fetch comments from backend
  const { data: commentsData } = useSWR(
    `/api/v1/comments/${task.id}`,
    async (url) => {
      const response = await axiosInstance.get(url);
      return response.data;
    }
  );
  const comments = commentsData?.data || [];

  // Fetch clients data for client selection
  const { data: clientsData } = useSWR(
    '/api/v1/clients?limit=100',
    async (url) => {
      try {
        const response = await axiosInstance.get(url);
        return response.data;
      } catch (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }
    }
  );
  const clients = Array.isArray(clientsData?.data?.clients) ? clientsData.data.clients : [];


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
  
  // Handle real-time comment events
  useRealtimeComments(task.id, {
    onCreated: (comment) => {
      // Refresh comments data when a new comment is created
      mutate(`/api/v1/comments/${task.id}`);
      toast.success(`New comment from ${comment.name}`);
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

  // Start/Due date range
  const rangePicker = useDateRangePicker(
    task.due[0] ? dayjs(task.due[0]) : null,
    task.due[1] ? dayjs(task.due[1]) : null
  );

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
        toast.success('Task name updated');
      }
    } catch (error) {
      console.error('Failed to update task name:', error);
      toast.error('Failed to update task name');
      // Revert to original name on error
      setTaskName(task.name);
    }
  }, [onUpdateTask, task, taskName]);

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
        toast.success('Task description updated');
      }
    } catch (error) {
      console.error('Failed to update description', error);
      toast.error('Failed to update description');
      // Revert to original description on error
      setTaskDescription(task.description || '');
    }
  }, [taskDescription, task, onUpdateTask]);
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
      toast.success('Client updated successfully!');
    } catch (error) {
      console.error('Failed to update client:', error);
      toast.error('Failed to update client');
    }
  };


  const handleChangePriority = useCallback((newValue: string) => {
    setPriority(newValue);
    // Persist priority immediately
    axiosInstance
      .post(`${endpoints.kanban}?endpoint=update-task`, { taskData: { id: task.id, priority: newValue } })
      .catch((e) => console.error('Failed to update priority', e));
  }, [task.id]);
  // Persist date changes (start/end)
  useEffect(() => {
    if (!rangePicker.startDate || !rangePicker.endDate) return;
    const start = rangePicker.startDate?.toDate();
    const end = rangePicker.endDate?.toDate();
    axiosInstance
      .post(`${endpoints.kanban}?endpoint=update-task`, {
        taskData: { id: task.id, startDate: start, dueDate: end },
      })
      .catch((e) => console.error('Failed to update dates', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangePicker.startDate, rangePicker.endDate]);


  // Subtask handlers
  const handleToggleSubtask = useCallback(async (subtaskId: string, completed: boolean) => {
    try {
      await axiosInstance.put(`/api/v1/subtasks/${task.id}/${subtaskId}`, { completed });
      mutate(`/api/v1/subtasks/${task.id}`);
      toast.success(completed ? 'Subtask completed' : 'Subtask reopened');
    } catch (error) {
      console.error('Failed to update subtask:', error);
      toast.error('Failed to update subtask');
    }
  }, [task.id]);

  const handleCreateSubtask = useCallback(async () => {
    if (!newSubtaskTitle.trim()) return;
    
    try {
      await axiosInstance.post(`/api/v1/subtasks/${task.id}`, { title: newSubtaskTitle.trim() });
      setNewSubtaskTitle('');
      mutate(`/api/v1/subtasks/${task.id}`);
      toast.success('Subtask created');
    } catch (error) {
      console.error('Failed to create subtask:', error);
      toast.error('Failed to create subtask');
    }
  }, [task.id, newSubtaskTitle]);

  const handleDeleteSubtask = useCallback(async (subtaskId: string) => {
    try {
      await axiosInstance.delete(`/api/v1/subtasks/${task.id}/${subtaskId}`);
      mutate(`/api/v1/subtasks/${task.id}`);
      toast.success('Subtask deleted');
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      toast.error('Failed to delete subtask');
    }
  }, [task.id]);

  const renderToolbar = () => (
    <KanbanDetailsToolbar
      taskName={task.name}
      onDelete={onDeleteTask}
      taskStatus={task.status}
      workOrderId={task.workOrderId}
      workOrderNumber={task.workOrderNumber}
      completeStatus={task.completeStatus}
      onToggleComplete={async (next) => {
        try {
          await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, {
            taskData: { id: task.id, completeStatus: next },
          });
          onUpdateTask({ ...task, completeStatus: next });
          toast.success(next ? 'Marked complete' : 'Marked incomplete');
        } catch (e) {
          console.error('Failed to toggle completion', e);
          toast.error('Failed to update completion');
        }
      }}
      onChangeWorkOrder={async (wo) => {
        try {
          await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, {
            taskData: { id: task.id, workOrderId: wo.id, workOrderNumber: wo.number },
          });
          onUpdateTask({ ...task, workOrderId: wo.id, workOrderNumber: wo.number });
        } catch (e) {
          console.error('Failed to update work order on task', e);
        }
      }}
      onCloseDetails={onClose}
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
        { value: 'overview', label: 'Overview' },
        { value: 'subTasks', label: `Subtasks (${subtasks.length})` },
        { value: 'comments', label: `Comments (${comments.length})` },
      ].map((tab) => (
        <Tab key={tab.value} value={tab.value} label={tab.label} />
      ))}
    </Tabs>
  );

  const renderTabOverview = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      {/* Task name */}
      <KanbanInputName
        placeholder="Task name"
        value={taskName}
        onChange={handleChangeTaskName}
        onKeyUp={handleKeyUpTaskName}
        onBlur={handleUpdateTaskName}
        inputProps={{ id: `${taskName}-task-input` }}
      />

      {/* Reporter */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel>Reporter</BlockLabel>
        <Tooltip title={`${task.reporter.name}${task.reporter.email ? ` • ${task.reporter.email}` : ''}`}>
          <Avatar>
            {task.reporter.initials || task.reporter.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase() || 'R'}
          </Avatar>
        </Tooltip>
      </Box>
      {/* Assignee */}
      <Box sx={{ display: 'flex' }}>
        <BlockLabel sx={{ height: 40, lineHeight: '40px' }}>Assignee</BlockLabel>

        <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
          {task.assignee.map((user) => (
            <Tooltip key={user.id} title={`${user.name}${(user as any).email ? ` • ${(user as any).email}` : ''}`}>
              <Avatar>
                {user.initials || user.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase() || 'A'}
              </Avatar>
            </Tooltip>
          ))}

          <Tooltip title="Add assignee">
            <IconButton
              onClick={contactsDialog.onTrue}
              sx={[
                (theme) => ({
                  border: `dashed 1px ${theme.vars.palette.divider}`,
                  bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
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
        <BlockLabel sx={{ height: 40, lineHeight: '40px' }}>Labels</BlockLabel>
        <Autocomplete
          multiple
          freeSolo
          options={[]}
          value={tags}
          onChange={handleChangeTags}
          renderTags={(value: readonly string[], getTagProps) =>
            value.map((option: string, index: number) => (
              <Chip {...getTagProps({ index })} key={`${option}-${index}`} label={option} size="small" />
            ))
          }
          renderInput={(params) => <TextField {...params} size="small" placeholder="Add label" />}
          sx={{ flexGrow: 1 }}
        />
      </Box>

      {/* Client */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel>Client</BlockLabel>
        <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
          <Select
            value={task.clientId || ''}
            onChange={(e) => handleChangeClient(e.target.value)}
            displayEmpty
            disabled={!clientsData}
          >
            <MenuItem value="">
              <em>No Client</em>
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
        <BlockLabel> Start / Due </BlockLabel>

        {rangePicker.selected ? (
          <Button size="small" onClick={rangePicker.onOpen}>
            {rangePicker.shortLabel}
          </Button>
        ) : (
          <Tooltip title="Add due date">
            <IconButton
              onClick={rangePicker.onOpen}
              sx={[
                (theme) => ({
                  border: `dashed 1px ${theme.vars.palette.divider}`,
                  bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
                }),
              ]}
            >
              <Iconify icon="mingcute:add-line" />
            </IconButton>
          </Tooltip>
        )}

        <CustomDateRangePicker
          variant="calendar"
          title="Choose task dates"
          startDate={rangePicker.startDate}
          endDate={rangePicker.endDate}
          onChangeStartDate={rangePicker.onChangeStartDate}
          onChangeEndDate={rangePicker.onChangeEndDate}
          open={rangePicker.open}
          onClose={rangePicker.onClose}
          selected={rangePicker.selected}
          error={rangePicker.error}
        />
      </Box>
      {/* Priority */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel>Priority</BlockLabel>
        {/* Fallback to existing control if you prefer icons; for now, keep it and treat options dynamically */}
        <KanbanDetailsPriority priority={priority} onChangePriority={handleChangePriority} />
      </Box>
      {/* Description */}
      <Box sx={{ display: 'flex' }}>
        <BlockLabel> Description </BlockLabel>
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
        <BlockLabel>Attachments</BlockLabel>
        <KanbanDetailsAttachments
          attachments={task.attachments}
          onChange={async (files) => {
            try {
              await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, {
                taskData: { id: task.id, attachments: files },
              });
              onUpdateTask({ ...task, attachments: files });
            } catch (e) {
              console.error('Failed to update attachments', e);
            }
          }}
        />
      </Box>
    </Box>
  );

  const renderTabSubtasks = () => {
    const completedCount = subtasks.filter(s => s.completed).length;
    const totalCount = subtasks.length;

    return (
      <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
        <div>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {completedCount} of {totalCount} completed
          </Typography>

          <LinearProgress
            variant="determinate"
            value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0}
          />
        </div>

        <FormGroup>
          {subtasks.map((subtask) => (
            <Box key={subtask._id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    disableRipple
                    checked={subtask.completed}
                    onChange={(e) => handleToggleSubtask(subtask._id, e.target.checked)}
                  />
                }
                label={subtask.title}
                sx={{ flexGrow: 1 }}
              />
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteSubtask(subtask._id)}
                sx={{ ml: 1 }}
              >
                <Iconify icon="mingcute:delete-2-line" width={18} />
              </IconButton>
            </Box>
          ))}
        </FormGroup>

        {/* Add new subtask */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Add subtask..."
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateSubtask();
              }
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleCreateSubtask}
            disabled={!newSubtaskTitle.trim()}
          >
            Add
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
        scrollBehavior: 'smooth'
      }}
    >
      <KanbanDetailsCommentList comments={comments} />
      
      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <Box sx={{ px: 2.5, py: 1, fontSize: '0.875rem', color: 'text.secondary', fontStyle: 'italic' }}>
          {typingUsers.length === 1 
            ? `${typingUsers[0].userEmail} is typing...`
            : `${typingUsers.map(u => u.userEmail).join(', ')} are typing...`
          }
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
      {renderTabs()}

      <Scrollbar fillContent sx={{ py: 3, px: 2.5 }}>
        {tabs.value === 'overview' && renderTabOverview()}
        {tabs.value === 'subTasks' && renderTabSubtasks()}
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
    </Drawer>
  );
}
