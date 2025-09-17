'use client';

import type { IKanbanTask } from 'src/types/kanban';

import dayjs from 'dayjs';
import { type Dayjs } from 'dayjs';
import { useBoolean } from 'minimal-shared/hooks';
import React, { useMemo, useState, useCallback } from 'react';

import { Box, Fab, alpha, useTheme, Typography, IconButton } from '@mui/material';

import { useGetFieldBoard } from 'src/actions/field-kanban';

import { Iconify } from 'src/components/iconify';
import { FieldTaskDetails } from 'src/components/field/field-task-details';
import {
  MobileCalendar,
  MobileDatePicker,
  type CalendarView,
  type CalendarTask,
} from 'src/components/mobile';

import { KanbanTaskCreateDialog } from 'src/sections/kanban/components/kanban-task-create-dialog';

// Helper function to transform backend kanban task data to CalendarTask
const transformKanbanTaskToCalendarTask = (task: any): CalendarTask | null => {
  // For debugging: show all tasks, even without dates
  let startTime: Date;
  let endTime: Date;

  if (task.due && Array.isArray(task.due) && task.due.length >= 2) {
    // Use actual due dates
    startTime = task.due[0] ? new Date(task.due[0]) : new Date();
    endTime = task.due[1]
      ? new Date(task.due[1])
      : new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
  } else {
    // Fallback: use current date with default duration for tasks without dates
    startTime = new Date();
    endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
  }

  // Map kanban status to calendar status
  const getCalendarStatus = (status: string): CalendarTask['status'] => {
    switch (status?.toLowerCase()) {
      case 'todo':
      case 'pending':
        return 'pending';
      case 'in-progress':
      case 'in progress':
        return 'in-progress';
      case 'done':
      case 'completed':
        return 'completed';
      case 'cancelled':
      case 'cancel':
        return 'cancelled';
      default:
        return 'pending';
    }
  };

  // Map kanban priority to calendar priority
  const getCalendarPriority = (priority: string): CalendarTask['priority'] => {
    switch (priority?.toLowerCase()) {
      case 'low':
        return 'low';
      case 'medium':
        return 'medium';
      case 'high':
        return 'high';
      case 'urgent':
        return 'urgent';
      default:
        return 'medium';
    }
  };

  return {
    id: task.id,
    title: task.name,
    description: task.description,
    startTime,
    endTime,
    priority: getCalendarPriority(task.priority),
    status: getCalendarStatus(task.status || 'pending'),
    location: task.location || 'Field Location',
    assignees: task.assignee?.map((assignee: any) => assignee.id) || [],
    projectId: task.workOrderId,
    color: getPriorityColor(task.priority),
  };
};

// Helper function to get color based on priority
const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'low':
      return '#2e7d32';
    case 'medium':
      return '#ed6c02';
    case 'high':
      return '#d32f2f';
    case 'urgent':
      return '#7b1fa2';
    default:
      return '#1976d2';
  }
};

export default function FieldCalendarPage() {
  const theme = useTheme();
  const [currentView, setCurrentView] = useState<CalendarView>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<IKanbanTask | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Dialog states
  const taskDetailsDialog = useBoolean();
  const taskCreateDialog = useBoolean();

  // Get kanban data
  const { board, boardLoading, boardError, refreshBoard } = useGetFieldBoard();

  // Transform kanban tasks to calendar tasks
  const calendarTasks = useMemo(() => {
    if (!board?.tasks) return [];

    const allTasks = Object.values(board.tasks).flat();
 

    // Debug: Check which tasks have due dates
    const _tasksWithDates = allTasks.filter(
      (task) => task.due && Array.isArray(task.due) && task.due.length >= 2
    );
  

    const transformedTasks = allTasks
      .map((task, index) => {
        const transformed = transformKanbanTaskToCalendarTask(task);
        if (transformed) {
          console.log(`Task ${index} transformed:`, {
            id: transformed.id,
            title: transformed.title,
            startTime: transformed.startTime,
            endTime: transformed.endTime,
            status: transformed.status,
            priority: transformed.priority,
          });
        } else {
          console.log(`Task ${index} filtered out:`, task);
        }
        return transformed;
      })
      .filter((task): task is CalendarTask => task !== null);

    console.log('Transformed calendar tasks:', transformedTasks);
    console.log('Number of calendar tasks:', transformedTasks.length);
    console.log('Current date:', new Date().toISOString());
    console.log('Selected date:', selectedDate.toISOString());

    // Add a test task for debugging
    const testTask: CalendarTask = {
      id: 'test-task',
      title: 'Test Task',
      description: 'This is a test task',
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      priority: 'medium',
      status: 'pending',
      location: 'Test Location',
      assignees: [],
      projectId: 'test-project',
      color: '#1976d2',
    };

    const finalTasks = [...transformedTasks, testTask];
    console.log('Final tasks with test task:', finalTasks);
    return finalTasks;
  }, [board?.tasks, selectedDate]);

  const handleViewChange = useCallback((view: CalendarView) => {
    setCurrentView(view);
  }, []);

  const handleTaskSelect = useCallback(
    (calendarTask: CalendarTask) => {
      // Find the original backend task data
      if (!board?.tasks) return;

      const allTasks = Object.values(board.tasks).flat();
      const backendTask = allTasks.find((task) => task.id === calendarTask.id);

      if (backendTask) {
        // The backend task is already in IKanbanTask format from the transformer
        setSelectedTask(backendTask);
        taskDetailsDialog.onTrue();
      }
    },
    [board?.tasks, taskDetailsDialog]
  );

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    console.log('Selected date:', date);
    // TODO: Filter tasks for selected date or show date-specific view
  }, []);

  const handleDatePickerChange = useCallback((date: Dayjs | null) => {
    if (date) {
      setSelectedDate(date.toDate());
      setDatePickerOpen(false);
    }
  }, []);

  const handleTaskCreate = useCallback(
    (date: Date) => {
      console.log('Create new task for date:', date);
      taskCreateDialog.onTrue();
    },
    [taskCreateDialog]
  );

  const handleTaskUpdate = useCallback((updatedTask: IKanbanTask) => {
    console.log('Task updated:', updatedTask);
    setSelectedTask(updatedTask);
  }, []);

  const handleConvertToReport = useCallback((task: IKanbanTask) => {
    console.log('Converting task to report:', task);
  }, []);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Calendar Header */}
      <Box
        sx={{
          padding: theme.spacing(2, 3),
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Calendar
          </Typography>
          <IconButton
            onClick={() => setDatePickerOpen(true)}
            sx={{
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
            }}
          >
            <Iconify icon="eva:calendar-outline" width={24} />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Manage your tasks and schedule
          {boardError && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
              Error loading tasks: {boardError.message}
            </Typography>
          )}
        </Typography>
      </Box>

      {/* Calendar Component */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <MobileCalendar
          tasks={calendarTasks}
          view={currentView}
          onViewChange={handleViewChange}
          onTaskSelect={handleTaskSelect}
          onDateSelect={handleDateSelect}
          onTaskCreate={handleTaskCreate}
          selectedDate={selectedDate}
          loading={boardLoading}
        />
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="Add task"
        onClick={() => handleTaskCreate(selectedDate)}
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
        initialStartDate={selectedDate.toISOString()}
        initialEndDate={selectedDate.toISOString()}
        onSuccess={() => {
          taskCreateDialog.onFalse();
          // Refresh the board data to show the newly created task
          setTimeout(() => {
            refreshBoard();
          }, 500);
        }}
      />

      {/* Date Picker Modal - Hidden off-screen but accessible */}
      <Box
        sx={{
          position: 'fixed',
          top: datePickerOpen ? '50%' : '-100%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: theme.zIndex.modal,
          transition: 'top 0.3s ease-in-out',
          backgroundColor: theme.palette.background.paper,
          borderRadius: '12px',
          boxShadow: theme.shadows[8],
          p: 3,
          minWidth: '280px',
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
          Select Date
        </Typography>
        <MobileDatePicker
          label="Go to Date"
          value={dayjs(selectedDate)}
          onChange={handleDatePickerChange}
        />
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <IconButton onClick={() => setDatePickerOpen(false)}>
            <Iconify icon="eva:close-fill" width={24} />
          </IconButton>
        </Box>
      </Box>

      {/* Backdrop */}
      {datePickerOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: theme.zIndex.modal - 1,
          }}
          onClick={() => setDatePickerOpen(false)}
        />
      )}
    </Box>
  );
}
