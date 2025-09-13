'use client';

import { Iconify } from '@/components/iconify';
import React, { useState, useCallback } from 'react';
import {
  MobileCalendar,
  MobileTaskDetail,
  type CalendarView,
  type CalendarTask,
} from '@/components/mobile';

import { Box, Fab, alpha, useTheme, Typography } from '@mui/material';

// Mock data for calendar events/tasks
const mockTasks: CalendarTask[] = [
  {
    id: '1',
    title: 'HVAC Installation',
    description: 'Complete installation of the new HVAC system in Building A',
    startTime: new Date(2024, 0, 15, 9, 0), // January 15, 2024, 9:00 AM
    endTime: new Date(2024, 0, 15, 17, 0), // January 15, 2024, 5:00 PM
    priority: 'high',
    status: 'in-progress',
    location: 'Building A - Floor 2',
    assignees: ['personnel1'],
    projectId: 'project1',
    color: '#1976d2',
  },
  {
    id: '2',
    title: 'Electrical Inspection',
    description: 'Perform electrical safety inspection and testing',
    startTime: new Date(2024, 0, 15, 11, 30), // January 15, 2024, 11:30 AM
    endTime: new Date(2024, 0, 15, 15, 30), // January 15, 2024, 3:30 PM
    priority: 'medium',
    status: 'pending',
    location: 'Building B - Basement',
    assignees: ['personnel2'],
    projectId: 'project2',
    color: '#ed6c02',
  },
  {
    id: '3',
    title: 'Material Pickup',
    description: 'Pick up materials from supplier warehouse',
    startTime: new Date(2024, 0, 15, 14, 0), // January 15, 2024, 2:00 PM
    endTime: new Date(2024, 0, 15, 16, 0), // January 15, 2024, 4:00 PM
    priority: 'low',
    status: 'pending',
    location: 'Supplier Warehouse - Downtown',
    assignees: ['personnel1'],
    projectId: 'project1',
    color: '#2e7d32',
  },
  {
    id: '4',
    title: 'Safety Meeting',
    description: 'Weekly safety briefing and updates',
    startTime: new Date(2024, 0, 16, 8, 0), // January 16, 2024, 8:00 AM
    endTime: new Date(2024, 0, 16, 9, 0), // January 16, 2024, 9:00 AM
    priority: 'high',
    status: 'pending',
    location: 'Main Office - Conference Room',
    assignees: ['personnel1', 'personnel2'],
    projectId: 'project3',
    color: '#d32f2f',
  },
  {
    id: '5',
    title: 'Equipment Maintenance',
    description: 'Routine maintenance of field equipment',
    startTime: new Date(2024, 0, 16, 10, 0), // January 16, 2024, 10:00 AM
    endTime: new Date(2024, 0, 16, 12, 0), // January 16, 2024, 12:00 PM
    priority: 'medium',
    status: 'completed',
    location: 'Equipment Shed',
    assignees: ['personnel2'],
    projectId: 'project2',
    color: '#7b1fa2',
  },
  {
    id: '6',
    title: 'Client Site Visit',
    description: 'Visit client site for project assessment',
    startTime: new Date(2024, 0, 17, 13, 0), // January 17, 2024, 1:00 PM
    endTime: new Date(2024, 0, 17, 16, 0), // January 17, 2024, 4:00 PM
    priority: 'high',
    status: 'pending',
    location: 'Client Office - Downtown',
    assignees: ['personnel1'],
    projectId: 'project1',
    color: '#1976d2',
  },
];

export default function FieldCalendarPage() {
  const theme = useTheme();
  const [currentView, setCurrentView] = useState<CalendarView>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  const handleViewChange = useCallback((view: CalendarView) => {
    setCurrentView(view);
  }, []);

  const handleTaskSelect = useCallback((task: CalendarTask) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    console.log('Selected date:', date);
    // TODO: Filter tasks for selected date or show date-specific view
  }, []);

  const handleTaskCreate = useCallback((date: Date) => {
    console.log('Create new task for date:', date);
    // TODO: Open task creation modal or navigate to create task page
  }, []);

  const handleTaskDetailClose = useCallback(() => {
    setTaskDetailOpen(false);
    setSelectedTask(null);
  }, []);

  const handleTaskEdit = useCallback((task: CalendarTask) => {
    console.log('Edit task:', task);
    // TODO: Open task edit modal or navigate to edit page
  }, []);

  const handleTaskComplete = useCallback(
    (task: CalendarTask) => {
      console.log('Complete task:', task);
      // TODO: Update task status to completed
      handleTaskDetailClose();
    },
    [handleTaskDetailClose]
  );

  const handleTaskDelete = useCallback(
    (task: CalendarTask) => {
      console.log('Delete task:', task);
      // TODO: Delete task with confirmation
      handleTaskDetailClose();
    },
    [handleTaskDetailClose]
  );

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
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Calendar
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your tasks and schedule
        </Typography>
      </Box>

      {/* Calendar Component */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <MobileCalendar
          tasks={mockTasks}
          view={currentView}
          onViewChange={handleViewChange}
          onTaskSelect={handleTaskSelect}
          onDateSelect={handleDateSelect}
          onTaskCreate={handleTaskCreate}
          selectedDate={selectedDate}
        />
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="Add task"
        onClick={() => handleTaskCreate(selectedDate)}
        sx={{
          position: 'fixed',
          bottom: { xs: '100px', sm: '24px' }, // Account for bottom navigation on mobile
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

      {/* Task Detail Modal */}
      <MobileTaskDetail
        task={selectedTask}
        open={taskDetailOpen}
        onClose={handleTaskDetailClose}
        onEdit={handleTaskEdit}
        onComplete={handleTaskComplete}
        onDelete={handleTaskDelete}
      />
    </Box>
  );
}
