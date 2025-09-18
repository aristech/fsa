'use client';

import useSWR from 'swr';
import { useMemo, useState, useCallback } from 'react';

import {
  Box,
  Card,
  Chip,
  Link,
  Stack,
  Avatar,
  Tooltip,
  CardHeader,
  Typography,
  CardContent,
} from '@mui/material';

import { fDate } from 'src/utils/format-time';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { KanbanDetails } from 'src/sections/kanban/details/kanban-details';

// ----------------------------------------------------------------------

const getPriorityColor = (priority: string) => {
  switch ((priority || '').toLowerCase()) {
    case 'urgent':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};

const getStatusColor = (status: string) => {
  const statusLower = (status || '').toLowerCase();
  if (statusLower.includes('complete') || statusLower.includes('done')) {
    return 'success';
  }
  if (statusLower.includes('progress') || statusLower.includes('doing')) {
    return 'info';
  }
  if (statusLower.includes('review') || statusLower.includes('testing')) {
    return 'warning';
  }
  return 'default';
};

// ----------------------------------------------------------------------

export function FsaRecentTasks() {
  const { data } = useSWR(endpoints.kanban, async (url: string) => {
    const res = await axiosInstance.get(url);
    return res.data;
  });

  const tasks: any[] = useMemo(() => {
    const list = data?.data?.board?.tasks || data?.board?.tasks || [];
    // Sort by createdAt desc when available, otherwise keep order
    return [...list]
      .sort((a: any, b: any) => {
        const ad = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      })
      .slice(0, 10);
  }, [data]);

  // Drawer state
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const handleOpenTask = useCallback((task: any) => setSelectedTask(task), []);
  const handleCloseTask = useCallback(() => setSelectedTask(null), []);

  return (
    <Card>
      <CardHeader
        title="Recent Tasks"
        action={
          <Link
            href="/dashboard/kanban"
            color="primary"
            variant="body2"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            View Board
            <Iconify icon="eva:arrow-ios-forward-fill" width={16} />
          </Link>
        }
      />

      <CardContent>
        <Stack spacing={2}>
          {tasks.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No tasks found
            </Typography>
          ) : (
            tasks.map((task: any) => (
              <Box
                key={task.id}
                onClick={() => handleOpenTask(task)}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Stack spacing={1}>
                  {/* Header: name, status, priority */}
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                      {task.name}
                    </Typography>
                    <Label color={getStatusColor(task.status)} variant="soft">
                      {task.status}
                    </Label>
                    <Label color={getPriorityColor(task.priority)} variant="soft">
                      {task.priority}
                    </Label>
                  </Stack>

                  {/* Secondary info: client, work order */}
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    {(task as any).clientName && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Iconify icon="eva:person-fill" width={14} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {(task as any).clientName}
                        </Typography>
                      </Stack>
                    )}
                    {(task as any).workOrderNumber && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Iconify icon="eva:hash-outline" width={14} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {(task as any).workOrderNumber}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>

                  {/* Assignees and reporter */}
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    {Array.isArray(task.assignee) && task.assignee.length > 0 ? (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {task.assignee.slice(0, 3).map((user: any) => (
                          <Tooltip
                            key={user.id}
                            title={`${user.name}${user.email ? ` • ${user.email}` : ''}`}
                          >
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                              {user.initials || user.name?.charAt(0)?.toUpperCase() || 'A'}
                            </Avatar>
                          </Tooltip>
                        ))}
                        {task.assignee.length > 3 && (
                          <Typography variant="caption" color="text.secondary">
                            +{task.assignee.length - 3}
                          </Typography>
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Unassigned
                      </Typography>
                    )}
                    {task.reporter?.name && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Iconify icon="eva:person-add-fill" width={14} />
                        <Typography variant="caption" color="text.secondary">
                          Reporter: {task.reporter.name}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>

                  {/* Dates and labels */}
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Typography variant="caption" color="text.secondary">
                      Created: {task.createdAt ? fDate(task.createdAt) : 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Due: {task.due?.[1] ? fDate(task.due[1]) : '—'}
                    </Typography>
                    {Array.isArray(task.labels) && task.labels.length > 0 && (
                      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                        {task.labels.slice(0, 3).map((label: string, idx: number) => (
                          <Chip key={idx} label={label} size="small" variant="outlined" />
                        ))}
                        {task.labels.length > 3 && (
                          <Typography variant="caption" color="text.secondary">
                            +{task.labels.length - 3}
                          </Typography>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </CardContent>

      {/* Task Details Drawer */}
      {selectedTask && (
        <KanbanDetails
          task={selectedTask}
          open={!!selectedTask}
          onClose={handleCloseTask}
          onUpdateTask={() => {}}
          onDeleteTask={() => {}}
        />
      )}
    </Card>
  );
}
