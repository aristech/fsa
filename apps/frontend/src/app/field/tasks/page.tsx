'use client';

import dayjs from 'dayjs';
import { Iconify } from '@/components/iconify';
import React, { useState, useCallback } from 'react';
import {
  MobileCard,
  MobileModal,
  MobileInput,
  MobileButton,
  MobileSelect,
  MobileDatePicker,
} from '@/components/mobile';

import { Box, Fab, Chip, alpha, Divider, useTheme, Typography } from '@mui/material';

// Mock data based on backend Task model
interface MockTask {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: Date;
  startDate: Date;
  estimatedHours: number;
  actualHours: number;
  client: {
    _id: string;
    name: string;
  };
  project: {
    _id: string;
    name: string;
  };
  assignedPersonnel: Array<{
    _id: string;
    firstName: string;
    lastName: string;
  }>;
  location: string;
  category: string;
  tags: string[];
  attachments: number;
  comments: number;
  createdAt: Date;
  updatedAt: Date;
}

const mockTasks: MockTask[] = [
  {
    _id: '1',
    title: 'HVAC System Installation',
    description:
      'Install and configure new HVAC system in Building A, including ductwork, electrical connections, and system testing.',
    status: 'in-progress',
    priority: 'high',
    dueDate: new Date(2024, 0, 20),
    startDate: new Date(2024, 0, 15),
    estimatedHours: 16,
    actualHours: 8,
    client: { _id: 'client1', name: 'ABC Corporation' },
    project: { _id: 'project1', name: 'Building A Renovation' },
    assignedPersonnel: [
      { _id: 'personnel1', firstName: 'John', lastName: 'Smith' },
      { _id: 'personnel2', firstName: 'Mike', lastName: 'Johnson' },
    ],
    location: 'Building A - Floor 2',
    category: 'Installation',
    tags: ['HVAC', 'Electrical', 'Installation'],
    attachments: 3,
    comments: 5,
    createdAt: new Date(2024, 0, 10),
    updatedAt: new Date(2024, 0, 15),
  },
  {
    _id: '2',
    title: 'Electrical Panel Maintenance',
    description:
      'Perform routine maintenance on electrical panels, check connections, and replace worn components.',
    status: 'pending',
    priority: 'medium',
    dueDate: new Date(2024, 0, 18),
    startDate: new Date(2024, 0, 16),
    estimatedHours: 4,
    actualHours: 0,
    client: { _id: 'client2', name: 'XYZ Industries' },
    project: { _id: 'project2', name: 'Electrical Maintenance' },
    assignedPersonnel: [{ _id: 'personnel3', firstName: 'Sarah', lastName: 'Wilson' }],
    location: 'Building B - Basement',
    category: 'Maintenance',
    tags: ['Electrical', 'Maintenance', 'Safety'],
    attachments: 1,
    comments: 2,
    createdAt: new Date(2024, 0, 12),
    updatedAt: new Date(2024, 0, 12),
  },
  {
    _id: '3',
    title: 'Plumbing Leak Repair',
    description:
      'Investigate and repair water leak in main plumbing line. Replace damaged pipes and test system.',
    status: 'completed',
    priority: 'urgent',
    dueDate: new Date(2024, 0, 14),
    startDate: new Date(2024, 0, 13),
    estimatedHours: 6,
    actualHours: 5.5,
    client: { _id: 'client3', name: 'DEF Construction' },
    project: { _id: 'project3', name: 'Emergency Repairs' },
    assignedPersonnel: [{ _id: 'personnel1', firstName: 'John', lastName: 'Smith' }],
    location: 'Building C - Ground Floor',
    category: 'Repair',
    tags: ['Plumbing', 'Emergency', 'Repair'],
    attachments: 4,
    comments: 3,
    createdAt: new Date(2024, 0, 13),
    updatedAt: new Date(2024, 0, 14),
  },
  {
    _id: '4',
    title: 'Safety Equipment Inspection',
    description:
      'Monthly inspection of all safety equipment including fire extinguishers, emergency exits, and safety signage.',
    status: 'pending',
    priority: 'medium',
    dueDate: new Date(2024, 0, 25),
    startDate: new Date(2024, 0, 22),
    estimatedHours: 3,
    actualHours: 0,
    client: { _id: 'client4', name: 'GHI Manufacturing' },
    project: { _id: 'project4', name: 'Safety Compliance' },
    assignedPersonnel: [
      { _id: 'personnel2', firstName: 'Mike', lastName: 'Johnson' },
      { _id: 'personnel4', firstName: 'David', lastName: 'Brown' },
    ],
    location: 'All Buildings',
    category: 'Inspection',
    tags: ['Safety', 'Inspection', 'Compliance'],
    attachments: 0,
    comments: 1,
    createdAt: new Date(2024, 0, 8),
    updatedAt: new Date(2024, 0, 8),
  },
  {
    _id: '5',
    title: 'Generator System Testing',
    description:
      'Test backup generator system, check fuel levels, and verify automatic startup procedures.',
    status: 'on-hold',
    priority: 'low',
    dueDate: new Date(2024, 0, 30),
    startDate: new Date(2024, 0, 28),
    estimatedHours: 2,
    actualHours: 0,
    client: { _id: 'client1', name: 'ABC Corporation' },
    project: { _id: 'project1', name: 'Building A Renovation' },
    assignedPersonnel: [{ _id: 'personnel3', firstName: 'Sarah', lastName: 'Wilson' }],
    location: 'Building A - Generator Room',
    category: 'Testing',
    tags: ['Generator', 'Testing', 'Backup Systems'],
    attachments: 2,
    comments: 0,
    createdAt: new Date(2024, 0, 5),
    updatedAt: new Date(2024, 0, 10),
  },
];

const taskStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

const taskPriorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const taskCategories = [
  { value: 'Installation', label: 'Installation' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Repair', label: 'Repair' },
  { value: 'Inspection', label: 'Inspection' },
  { value: 'Testing', label: 'Testing' },
];

const clients = [
  { value: 'abc-corp', label: 'ABC Corporation' },
  { value: 'xyz-industries', label: 'XYZ Industries' },
  { value: 'def-construction', label: 'DEF Construction' },
  { value: 'ghi-manufacturing', label: 'GHI Manufacturing' },
];

export default function FieldTasksPage() {
  const theme = useTheme();
  const [tasks] = useState<MockTask[]>(mockTasks);
  const [filteredTasks, setFilteredTasks] = useState<MockTask[]>(mockTasks);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MockTask | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    client: '',
    assignedTo: '',
    dueDateFrom: null as Date | null,
    dueDateTo: null as Date | null,
  });

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = tasks;

    if (filters.status) {
      filtered = filtered.filter((task) => task.status === filters.status);
    }

    if (filters.priority) {
      filtered = filtered.filter((task) => task.priority === filters.priority);
    }

    if (filters.category) {
      filtered = filtered.filter((task) => task.category === filters.category);
    }

    if (filters.client) {
      filtered = filtered.filter((task) =>
        task.client.name.toLowerCase().includes(filters.client.toLowerCase())
      );
    }

    if (filters.assignedTo) {
      filtered = filtered.filter((task) =>
        task.assignedPersonnel.some((person) =>
          `${person.firstName} ${person.lastName}`
            .toLowerCase()
            .includes(filters.assignedTo.toLowerCase())
        )
      );
    }

    if (filters.dueDateFrom) {
      filtered = filtered.filter((task) => task.dueDate >= filters.dueDateFrom!);
    }

    if (filters.dueDateTo) {
      filtered = filtered.filter((task) => task.dueDate <= filters.dueDateTo!);
    }

    setFilteredTasks(filtered);
  }, [tasks, filters]);

  const clearFilters = useCallback(() => {
    setFilters({
      status: '',
      priority: '',
      category: '',
      client: '',
      assignedTo: '',
      dueDateFrom: null,
      dueDateTo: null,
    });
    setFilteredTasks(tasks);
  }, [tasks]);

  const handleTaskSelect = useCallback((task: MockTask) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  }, []);

  const handleCreateTask = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in-progress':
        return 'info';
      case 'completed':
        return 'success';
      case 'on-hold':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      case 'urgent':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
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

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const getProgressPercentage = (task: MockTask) => {
    if (task.estimatedHours === 0) return 0;
    return Math.min((task.actualHours / task.estimatedHours) * 100, 100);
  };

  const isOverdue = (task: MockTask) => task.dueDate < new Date() && task.status !== 'completed';

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
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileSelect
                label="Status"
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
                options={[{ value: '', label: 'All Status' }, ...taskStatuses]}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileSelect
                label="Priority"
                value={filters.priority}
                onChange={(value) => handleFilterChange('priority', value)}
                options={[{ value: '', label: 'All Priorities' }, ...taskPriorities]}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileSelect
                label="Category"
                value={filters.category}
                onChange={(value) => handleFilterChange('category', value)}
                options={[{ value: '', label: 'All Categories' }, ...taskCategories]}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileInput
                label="Client"
                value={filters.client}
                onChange={(e) => handleFilterChange('client', e.target.value)}
                placeholder="Search client..."
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileInput
                label="Assigned To"
                value={filters.assignedTo}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                placeholder="Search personnel..."
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileDatePicker
                label="Due From"
                value={filters.dueDateFrom ? dayjs(filters.dueDateFrom) : null}
                onChange={(date) => handleFilterChange('dueDateFrom', date?.toDate() || null)}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileDatePicker
                label="Due To"
                value={filters.dueDateTo ? dayjs(filters.dueDateTo) : null}
                onChange={(date) => handleFilterChange('dueDateTo', date?.toDate() || null)}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileButton variant="outline" onClick={clearFilters} fullWidth>
                Clear Filters
              </MobileButton>
            </Box>
          </Box>

          <MobileButton
            variant="primary"
            onClick={applyFilters}
            fullWidth
            icon={<Iconify icon="eva:search-fill" width={16} />}
          >
            Apply Filters
          </MobileButton>
        </Box>
      </Box>

      {/* Tasks List */}
      <Box sx={{ flex: 1, overflow: 'auto', padding: theme.spacing(2, 2) }}>
        {' '}
        {/* Reduced from 3 to 2 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredTasks.map((task) => (
            <MobileCard
              key={task._id}
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
                      {task.title}
                    </Typography>
                    <Chip
                      label={task.status}
                      color={getStatusColor(task.status) as any}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {task.client.name} • {task.project.name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {task.description}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Iconify icon="eva:calendar-fill" width={14} />
                      <Typography variant="caption" color="text.secondary">
                        Due: {formatDate(task.dueDate)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Iconify icon="eva:pin-fill" width={14} />
                      <Typography variant="caption" color="text.secondary">
                        {task.location}
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
                        {task.assignedPersonnel.length} assigned
                      </Typography>
                    </Box>
                    {task.attachments > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Iconify icon="eva:paperclip-fill" width={14} />
                        <Typography variant="caption" color="text.secondary">
                          {task.attachments} files
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Progress Bar */}
                  {task.status === 'in-progress' && (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Progress
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {task.actualHours}h / {task.estimatedHours}h
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
          bottom: { xs: '100px', sm: '24px' },
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
      <MobileModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Task Details"
        size="large"
        actions={
          <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
            <MobileButton
              variant="outline"
              size="medium"
              icon={<Iconify icon="eva:edit-fill" width={16} />}
              onClick={() => console.log('Edit task')}
            >
              Edit
            </MobileButton>
            <MobileButton
              variant="primary"
              size="medium"
              icon={<Iconify icon="eva:play-fill" width={16} />}
              onClick={() => console.log('Start task')}
            >
              Start Task
            </MobileButton>
          </Box>
        }
      >
        {selectedTask && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Iconify
                  icon={getStatusIcon(selectedTask.status)}
                  width={28}
                  sx={{ color: theme.palette.primary.main }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {selectedTask.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label={selectedTask.status}
                    color={getStatusColor(selectedTask.status) as any}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                  <Chip
                    label={selectedTask.priority}
                    color={getPriorityColor(selectedTask.priority) as any}
                    size="small"
                    icon={<Iconify icon={getPriorityIcon(selectedTask.priority)} width={12} />}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>
              </Box>
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Description
                </Typography>
                <Typography variant="body1">{selectedTask.description}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Client & Project
                </Typography>
                <Typography variant="body1">
                  {selectedTask.client.name} • {selectedTask.project.name}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Location
                </Typography>
                <Typography variant="body1">{selectedTask.location}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Due Date
                </Typography>
                <Typography variant="body1">{formatDate(selectedTask.dueDate)}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Assigned Personnel
                </Typography>
                <Typography variant="body1">
                  {selectedTask.assignedPersonnel
                    .map((person) => `${person.firstName} ${person.lastName}`)
                    .join(', ')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Time Tracking
                </Typography>
                <Typography variant="body1">
                  {selectedTask.actualHours}h / {selectedTask.estimatedHours}h estimated
                </Typography>
              </Box>

              {selectedTask.tags.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedTask.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </MobileModal>

      {/* Create Task Modal */}
      <MobileModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Task"
        size="large"
        actions={
          <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
            <MobileButton variant="outline" size="medium" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </MobileButton>
            <MobileButton
              variant="primary"
              size="medium"
              icon={<Iconify icon="eva:save-fill" width={16} />}
              onClick={() => console.log('Create task')}
            >
              Create Task
            </MobileButton>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <MobileInput label="Task Title" placeholder="Enter task title..." />

          <MobileInput
            label="Description"
            placeholder="Enter task description..."
            multiline
            rows={4}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <MobileSelect label="Status" value="" onChange={() => {}} options={taskStatuses} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <MobileSelect
                label="Priority"
                value=""
                onChange={() => {}}
                options={taskPriorities}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <MobileSelect label="Client" value="" onChange={() => {}} options={clients} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <MobileSelect
                label="Category"
                value=""
                onChange={() => {}}
                options={taskCategories}
              />
            </Box>
          </Box>

          <MobileInput label="Location" placeholder="Enter task location..." />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <MobileDatePicker label="Start Date" value={null} onChange={() => {}} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <MobileDatePicker label="Due Date" value={null} onChange={() => {}} />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <MobileInput label="Estimated Hours" placeholder="0" type="number" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <MobileInput label="Location" placeholder="Enter location..." />
            </Box>
          </Box>
        </Box>
      </MobileModal>
    </Box>
  );
}
