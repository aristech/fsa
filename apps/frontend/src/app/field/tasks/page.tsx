'use client';

import type { IKanbanTask } from 'src/types/kanban';

// dayjs import removed - no longer needed for date pickers
import { useBoolean } from 'minimal-shared/hooks';
import React, { useMemo, useState, useCallback } from 'react';

import {
  Box,
  Fab,
  Chip,
  alpha,
  useTheme,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material';

import { searchTasks } from 'src/utils/search-utils';

import { useGetFieldBoard } from 'src/actions/field-kanban';

import { Iconify } from 'src/components/iconify';
import { FieldTaskDetails } from 'src/components/field/field-task-details';
import { MobileCard, MobileButton, MobileSelect } from 'src/components/mobile';

import { KanbanTaskCreateDialog } from 'src/sections/kanban/components/kanban-task-create-dialog';

// Status options will be generated from kanban columns

const taskPriorities = [
  { value: 'all-priorities', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

// Category filter removed

export default function FieldTasksPage() {
  const theme = useTheme();

  // Get kanban board data with real tasks
  const { board, refreshBoard } = useGetFieldBoard();

  // Generate status options from kanban columns
  const taskStatuses = useMemo(() => {
    if (!board?.columns) return [{ value: 'all-statuses', label: 'All Statuses' }];

    return [
      { value: 'all-statuses', label: 'All Statuses' },
      ...board.columns.map((column) => ({
        value: column.id,
        label: column.name,
      })),
    ];
  }, [board?.columns]);

  // Client filter removed

  const [selectedTask, setSelectedTask] = useState<IKanbanTask | null>(null);

  // Modal states
  const taskDetailsDialog = useBoolean();
  const taskCreateDialog = useBoolean();

  // Filter states
  const [filters, setFilters] = useState({
    status: 'all-statuses',
    priority: 'all-priorities',
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Get all tasks from kanban board
  const allTasks = useMemo(() => {
    if (!board?.tasks) return [];

    const tasks: IKanbanTask[] = [];
    Object.values(board.tasks).forEach((columnTasks) => {
      tasks.push(...columnTasks);
    });

    return tasks;
  }, [board?.tasks]);

  // Apply filters and search to tasks
  const filteredTasks = useMemo(() => {
    let filtered = allTasks;

    // Apply search first
    if (searchTerm.trim()) {
      filtered = searchTasks(filtered, searchTerm);
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all-statuses') {
      filtered = filtered.filter((task) => {
        const taskColumnId = task.columnId || task.status;
        return taskColumnId === filters.status;
      });
    }

    // Apply priority filter
    if (filters.priority && filters.priority !== 'all-priorities') {
      filtered = filtered.filter((task) => task.priority === filters.priority);
    }

    return filtered;
  }, [allTasks, searchTerm, filters, board?.columns]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all-statuses',
      priority: 'all-priorities',
    });
    setSearchTerm('');
  }, []);

  const handleTaskSelect = useCallback(
    (task: IKanbanTask) => {
      setSelectedTask(task);
      taskDetailsDialog.onTrue();
    },
    [taskDetailsDialog]
  );

  const handleCreateTask = useCallback(() => {
    taskCreateDialog.onTrue();
  }, [taskCreateDialog]);

  const handleConvertToReport = useCallback((task: IKanbanTask) => {
    // This will be handled by the FieldTaskDetails component
    console.log('Converting task to report:', task);
  }, []);

  const handleTaskUpdate = useCallback((updatedTask: IKanbanTask) => {
    console.log('Task updated:', updatedTask);
    setSelectedTask(updatedTask);
    // Note: We'll refresh the data when the drawer is closed instead
  }, []);

  const getStatusColor = (status: string) => {
    // Get the actual column name from the board
    const columnName = board?.columns.find((col) => col.id === status)?.name || status;
    const normalizedStatus = columnName.toLowerCase().replace(/[^a-z]/g, '-');

    const statusMap: Record<string, string> = {
      pending: 'warning',
      'in-progress': 'info',
      'in progress': 'info',
      todo: 'warning',
      doing: 'info',
      completed: 'success',
      done: 'success',
      'on-hold': 'default',
      cancelled: 'error',
      review: 'secondary',
    };

    return statusMap[normalizedStatus] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const priorityMap: Record<string, string> = {
      low: 'success',
      medium: 'warning',
      high: 'error',
      urgent: 'error',
      critical: 'error',
    };

    return priorityMap[priority.toLowerCase()] || 'default';
  };

  const getStatusIcon = (status: string) => {
    // Get the actual column name from the board
    const columnName = board?.columns.find((col) => col.id === status)?.name || status;
    const normalizedStatus = columnName.toLowerCase().replace(/[^a-z]/g, '-');

    switch (normalizedStatus) {
      case 'pending':
        return 'eva:clock-fill';
      case 'in-progress':
        return 'eva:arrow-forward-fill';
      case 'completed':
        return 'eva:checkmark-circle-fill';
      case 'on-hold':
        return 'eva:pause-fill';
      case 'cancelled':
        return 'eva:close-circle-fill';
      default:
        return 'eva:info-fill';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'eva:arrow-downward-fill';
      case 'medium':
        return 'eva:minus-fill';
      case 'high':
        return 'eva:arrow-upward-fill';
      case 'urgent':
        return 'eva:flash-fill';
      default:
        return 'eva:info-fill';
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getProgressPercentage = (task: IKanbanTask) => {
    // Check if task is completed
    if (task.completeStatus) return 100;

    // For now, return 50% for in-progress tasks
    const taskStatus = task.columnId || task.status;
    const columnName = board?.columns.find((col) => col.id === taskStatus)?.name || taskStatus;

    if (
      columnName.toLowerCase().includes('progress') ||
      columnName.toLowerCase().includes('doing')
    ) {
      return 50;
    }

    return 0;
  };

  const isOverdue = (task: IKanbanTask) => {
    const dueDate = task.due?.[1] || task.endDate;
    if (!dueDate) return false;

    const taskStatus = task.columnId || task.status;
    const columnName = board?.columns.find((col) => col.id === taskStatus)?.name || taskStatus;
    const isCompleted =
      task.completeStatus ||
      columnName.toLowerCase().includes('done') ||
      columnName.toLowerCase().includes('completed');

    return new Date(dueDate) < new Date() && !isCompleted;
  };

  const getTaskStatus = (task: IKanbanTask) => {
    const columnName = board?.columns.find((col) => col.id === task.columnId)?.name || task.status;
    return columnName || 'Unknown';
  };

  const getTaskLocation = (task: IKanbanTask) => 'Field Location';

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          padding: theme.spacing(2, 2), // Reduced from 3 to 2
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Tasks
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your field tasks and assignments
        </Typography>
      </Box>

      {/* Filters */}
      <Box
        sx={{
          padding: theme.spacing(2, 2), // Reduced from 3 to 2
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Filters
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Search Component */}
          <TextField
            fullWidth
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search across tasks, clients, work orders, and personnel..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            helperText="Search by task name, description, labels, client info, work order details, assignee, or reporter"
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '16px', // Prevent zoom on iOS
              },
            }}
          />

          {/* Filter Controls */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileSelect
                label="Status"
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
                options={taskStatuses}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileSelect
                label="Priority"
                value={filters.priority}
                onChange={(value) => handleFilterChange('priority', value)}
                options={taskPriorities}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileButton variant="outline" onClick={clearFilters} fullWidth>
                Clear All
              </MobileButton>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Tasks List */}
      <Box sx={{ flex: 1, overflow: 'auto', padding: theme.spacing(2, 2) }}>
        {' '}
        {/* Reduced from 3 to 2 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredTasks.map((task) => (
            <MobileCard
              key={task.id}
              variant="outlined"
              size="medium"
              onTap={() => handleTaskSelect(task)}
              sx={{ cursor: 'pointer' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Iconify
                    icon={getStatusIcon(task.status)}
                    width={24}
                    sx={{ color: theme.palette.primary.main }}
                  />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                      {task.name}
                    </Typography>
                    <Chip
                      label={getTaskStatus(task)}
                      color={getStatusColor(getTaskStatus(task)) as any}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {task.clientName || task.clientCompany || 'No Client'} •{' '}
                    {(task as any).workOrderTitle || 'No Work Order'}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {task.description || 'No description available'}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Iconify icon="eva:calendar-fill" width={14} />
                      <Typography variant="caption" color="text.secondary">
                        Due: {task.due?.[1] ? formatDate(new Date(task.due[1])) : 'No due date'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Iconify icon="eva:pin-fill" width={14} />
                      <Typography variant="caption" color="text.secondary">
                        {getTaskLocation(task)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={task.priority}
                      color={getPriorityColor(task.priority) as any}
                      size="small"
                      icon={<Iconify icon={getPriorityIcon(task.priority)} width={12} />}
                      sx={{ textTransform: 'capitalize' }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Iconify icon="eva:people-fill" width={14} />
                      <Typography variant="caption" color="text.secondary">
                        {task.assignee?.length || 0} assigned
                      </Typography>
                    </Box>
                    {task.attachments?.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Iconify icon="eva:paperclip-fill" width={14} />
                        <Typography variant="caption" color="text.secondary">
                          {task.attachments.length} files
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Progress Bar */}
                  {getTaskStatus(task).toLowerCase().includes('progress') && (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Progress
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getProgressPercentage(task)}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: '100%',
                          height: 4,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${getProgressPercentage(task)}%`,
                            height: '100%',
                            backgroundColor: theme.palette.primary.main,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  )}

                  {/* Overdue Indicator */}
                  {isOverdue(task) && (
                    <Box
                      sx={{
                        mt: 1,
                        padding: theme.spacing(0.5, 1),
                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Iconify
                        icon="eva:alert-triangle-fill"
                        width={14}
                        sx={{ color: theme.palette.error.main }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: theme.palette.error.main, fontWeight: 600 }}
                      >
                        Overdue
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </MobileCard>
          ))}

          {filteredTasks.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: theme.spacing(4),
                textAlign: 'center',
              }}
            >
              <Iconify
                icon="eva:clipboard-outline"
                width={64}
                sx={{ color: theme.palette.text.disabled, mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Tasks Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or create a new task
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="Create task"
        onClick={handleCreateTask}
        sx={{
          position: 'fixed',
          bottom: '100px', // Account for bottom navigation on all screen sizes
          right: '24px',
          zIndex: theme.zIndex.speedDial,
          boxShadow: theme.shadows[8],
          '&:hover': {
            boxShadow: theme.shadows[12],
            transform: 'scale(1.05)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <Iconify icon="eva:plus-fill" width={24} />
      </Fab>

      {/* Task Details Drawer */}
      <FieldTaskDetails
        task={selectedTask}
        open={taskDetailsDialog.value}
        onClose={() => {
          taskDetailsDialog.onFalse();
          // Refresh the board data when the drawer is closed
          setTimeout(() => {
            refreshBoard();
          }, 500);
        }}
        onUpdateTask={handleTaskUpdate}
        onDeleteTask={() => {
          // Handle task deletion if needed
          taskDetailsDialog.onFalse();
          // Refresh the board data to reflect the deleted task
          setTimeout(() => {
            refreshBoard();
          }, 500);
        }}
        onConvertToReport={handleConvertToReport}
      />

      {/* Create Task Dialog */}
      <KanbanTaskCreateDialog
        open={taskCreateDialog.value}
        onClose={() => {
          taskCreateDialog.onFalse();
          // Refresh the board data when the dialog is closed
          setTimeout(() => {
            refreshBoard();
          }, 500);
        }}
        status={board?.columns[0]?.id || 'todo'}
        onSuccess={() => {
          taskCreateDialog.onFalse();
          // Refresh the board data to show the newly created task
          setTimeout(() => {
            refreshBoard();
          }, 500);
        }}
      />
    </Box>
  );
}
