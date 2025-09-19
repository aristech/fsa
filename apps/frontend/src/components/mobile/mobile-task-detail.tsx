'use client';

import React from 'react';

import { styled } from '@mui/material/styles';
import { Box, Chip, alpha, Divider, Typography } from '@mui/material';

import { Iconify } from '../iconify';
import { MobileButton } from './mobile-button';
import { MobileModal } from './mobile-feedback';
import { type CalendarTask } from './mobile-calendar';

export type MobileTaskDetailProps = {
  task: CalendarTask | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (task: CalendarTask) => void;
  onComplete?: (task: CalendarTask) => void;
  onDelete?: (task: CalendarTask) => void;
};

const TaskHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(2),
}));

const TaskInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}));

// const TaskActions = styled(Box)(({ theme }) => ({
//   display: 'flex',
//   gap: theme.spacing(1),
// }));

const TaskDetail = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const DetailRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const DetailLabel = styled(Typography)(({ theme }) => ({
  minWidth: '80px',
  fontWeight: 600,
  color: theme.palette.text.secondary,
}));

const DetailValue = styled(Typography)(({ theme }) => ({
  flex: 1,
  color: theme.palette.text.primary,
}));

const PriorityChip = styled(Chip, {
  shouldForwardProp: (prop) => !['priority'].includes(prop as string),
})<{ priority: string }>(({ theme, priority }) => {
  const priorityColors = {
    low: theme.palette.success.main,
    medium: theme.palette.warning.main,
    high: theme.palette.error.main,
    urgent: theme.palette.error.dark,
  };

  return {
    backgroundColor: alpha(
      priorityColors[priority as keyof typeof priorityColors] || theme.palette.grey[400],
      0.1
    ),
    color: priorityColors[priority as keyof typeof priorityColors] || theme.palette.grey[600],
    fontWeight: 600,
    textTransform: 'capitalize',
  };
});

const StatusChip = styled(Chip, {
  shouldForwardProp: (prop) => !['status'].includes(prop as string),
})<{ status: string }>(({ theme, status }) => {
  const statusColors = {
    pending: theme.palette.warning.main,
    'in-progress': theme.palette.info.main,
    completed: theme.palette.success.main,
    overdue: theme.palette.error.main,
    cancelled: theme.palette.grey[600],
  };

  return {
    backgroundColor: alpha(
      statusColors[status as keyof typeof statusColors] || theme.palette.grey[400],
      0.1
    ),
    color: statusColors[status as keyof typeof statusColors] || theme.palette.grey[600],
    fontWeight: 600,
    textTransform: 'capitalize',
  };
});

export function MobileTaskDetail({
  task,
  open,
  onClose,
  onEdit,
  onComplete,
  onDelete,
}: MobileTaskDetailProps) {
  // const theme = useTheme();

  if (!task) return null;

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'eva:clock-fill';
      case 'in-progress':
        return 'eva:arrow-forward-fill';
      case 'completed':
        return 'eva:checkmark-circle-fill';
      case 'overdue':
        return 'eva:alert-circle-fill';
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

  return (
    <MobileModal
      open={open}
      onClose={onClose}
      title="Task Details"
      size="medium"
      actions={
        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
          {onEdit && (
            <MobileButton
              variant="outline"
              size="medium"
              icon={<Iconify icon="eva:edit-fill" width={16} />}
              onClick={() => onEdit(task)}
            >
              Edit
            </MobileButton>
          )}
          {onComplete && task.status !== 'completed' && (
            <MobileButton
              variant="primary"
              size="medium"
              icon={<Iconify icon="eva:checkmark-fill" width={16} />}
              onClick={() => onComplete(task)}
            >
              Complete
            </MobileButton>
          )}
          {onDelete && (
            <MobileButton
              variant="danger"
              size="medium"
              icon={<Iconify icon="eva:trash-fill" width={16} />}
              onClick={() => onDelete(task)}
            >
              Delete
            </MobileButton>
          )}
        </Box>
      }
    >
      <TaskDetail>
        {/* Task Header */}
        <TaskHeader>
          <TaskInfo>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {task.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <PriorityChip
                priority={task.priority}
                icon={<Iconify icon={getPriorityIcon(task.priority)} width={16} />}
                label={task.priority}
                size="small"
              />
              <StatusChip
                status={task.status}
                icon={<Iconify icon={getStatusIcon(task.status)} width={16} />}
                label={task.status}
                size="small"
              />
            </Box>
          </TaskInfo>
        </TaskHeader>

        <Divider />

        {/* Task Description */}
        {task.description && (
          <>
            <DetailRow>
              <DetailLabel>Description:</DetailLabel>
              <DetailValue>{task.description}</DetailValue>
            </DetailRow>
            <Divider />
          </>
        )}

        {/* Date and Time */}
        <DetailRow>
          <DetailLabel>Date:</DetailLabel>
          <DetailValue>{formatDate(task.startTime)}</DetailValue>
        </DetailRow>

        <DetailRow>
          <DetailLabel>Time:</DetailLabel>
          <DetailValue>
            {formatTime(task.startTime)} - {formatTime(task.endTime)}
          </DetailValue>
        </DetailRow>

        {/* Location */}
        {task.location && (
          <>
            <Divider />
            <DetailRow>
              <DetailLabel>Location:</DetailLabel>
              <DetailValue>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Iconify icon="eva:pin-fill" width={16} />
                  {task.location}
                </Box>
              </DetailValue>
            </DetailRow>
          </>
        )}

        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 && (
          <>
            <Divider />
            <DetailRow>
              <DetailLabel>Assigned to:</DetailLabel>
              <DetailValue>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Iconify icon="eva:people-fill" width={16} />
                  {task.assignees.length} person{task.assignees.length > 1 ? 's' : ''}
                </Box>
              </DetailValue>
            </DetailRow>
          </>
        )}

        {/* Project */}
        {task.projectId && (
          <>
            <Divider />
            <DetailRow>
              <DetailLabel>Project:</DetailLabel>
              <DetailValue>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Iconify icon="eva:folder-fill" width={16} />
                  Project {task.projectId}
                </Box>
              </DetailValue>
            </DetailRow>
          </>
        )}
      </TaskDetail>
    </MobileModal>
  );
}
