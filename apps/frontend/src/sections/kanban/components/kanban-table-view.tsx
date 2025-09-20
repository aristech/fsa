'use client';

import type { IKanbanTask } from 'src/types/kanban';

import { mutate } from 'swr';
import { useBoolean } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Card,
  Chip,
  Stack,
  Table,
  Avatar,
  Button,
  Tooltip,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  Typography,
  AvatarGroup,
  InputAdornment,
  TableSortLabel,
} from '@mui/material';

import { fDate } from 'src/utils/format-time';
import { sortTasks, searchTasks } from 'src/utils/search-utils';

import { useTranslate } from 'src/locales/use-locales';
import { deleteTask, updateTask, useGetBoard } from 'src/actions/kanban';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { useTable, emptyRows, TableEmptyRows, TablePaginationCustom } from 'src/components/table';

import { KanbanDetails } from '../details/kanban-details';
import { KanbanTaskCreateDialog } from './kanban-task-create-dialog';

// ----------------------------------------------------------------------

type OrderBy =
  | 'name'
  | 'status'
  | 'priority'
  | 'due'
  | 'assignee'
  | 'reporter'
  | 'client'
  | 'workOrder'
  | 'completedStatus'
  | 'created';

// ----------------------------------------------------------------------

const getTableHead = (t: any) => [
  {
    id: 'name',
    label: t('task', { defaultValue: 'Task' }),
    align: 'left' as const,
    sortable: true,
  },
  {
    id: 'client',
    label: t('client', { defaultValue: 'Client' }),
    align: 'left' as const,
    sortable: true,
  },
  {
    id: 'workOrder',
    label: t('workOrder', { defaultValue: 'Work Order' }),
    align: 'left' as const,
    sortable: true,
  },
  {
    id: 'status',
    label: t('status', { defaultValue: 'Status' }),
    align: 'left' as const,
    sortable: true,
  },
  {
    id: 'assignee',
    label: t('assignee', { defaultValue: 'Assignee' }),
    align: 'left' as const,
    sortable: true,
  },
  {
    id: 'reporter',
    label: t('reporter', { defaultValue: 'Reporter' }),
    align: 'left' as const,
    sortable: true,
  },
  {
    id: 'completedStatus',
    label: t('completed', { defaultValue: 'Completed' }),
    align: 'center' as const,
    sortable: true,
  },
  {
    id: 'priority',
    label: t('priority', { defaultValue: 'Priority' }),
    align: 'center' as const,
    sortable: true,
  },
  {
    id: 'created',
    label: t('created', { defaultValue: 'Created' }),
    align: 'left' as const,
    sortable: true,
  },
  {
    id: 'due',
    label: t('dueDate', { defaultValue: 'Due Date' }),
    align: 'left' as const,
    sortable: true,
  },
  {
    id: 'labels',
    label: t('labels', { defaultValue: 'Labels' }),
    align: 'left' as const,
    sortable: false,
  },
];

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
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
  const statusLower = status.toLowerCase();
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

export function KanbanTableView() {
  // Get data from SWR hook for automatic updates
  const { board, boardLoading, boardError } = useGetBoard();
  const { t } = useTranslate('common');

  // Listen for kanban refresh events from AI
  useEffect(() => {
    const handleKanbanRefresh = (event: CustomEvent) => {
      console.log('[KanbanTableView] Refresh event received:', event.detail);

      // Trigger SWR revalidation to refresh the kanban data
      mutate('/api/v1/kanban');

      // Show a subtle notification
      console.log(`[KanbanTableView] Refreshing kanban after ${event.detail.type}`);
    };

    window.addEventListener('kanban-refresh', handleKanbanRefresh as EventListener);

    return () => {
      window.removeEventListener('kanban-refresh', handleKanbanRefresh as EventListener);
    };
  }, []);

  // Extract tasks and columns from board data
  const tasks = useMemo(() => Object.values(board?.tasks || {}).flat(), [board?.tasks]);
  const columns = board?.columns || [];
  const TABLE_HEAD = getTableHead(t);

  // All hooks must be called before any early returns
  const table = useTable({
    defaultOrderBy: 'created',
    defaultOrder: 'desc',
    defaultRowsPerPage: 10,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<IKanbanTask | null>(null);
  const taskDetailsDialog = useBoolean();
  const taskCreateDialog = useBoolean();

  // Get column name by id
  const getColumnName = (columnId?: string) => {
    if (!columnId) return t('unknown', { defaultValue: 'Unknown' });
    const column = columns.find((col) => col.id === columnId);
    return column?.name || t('unknown', { defaultValue: 'Unknown' });
  };

  // Filter and sort tasks using the modular search utility
  const filteredAndSortedTasks = useMemo(() => {
    // First apply search filter
    const searchFiltered = searchTasks(tasks, searchTerm);

    // Then apply sorting
    return sortTasks(searchFiltered, table.orderBy, table.order);
  }, [tasks, searchTerm, table.orderBy, table.order]);

  // Paginated tasks
  const paginatedTasks = useMemo(
    () =>
      filteredAndSortedTasks.slice(
        table.page * table.rowsPerPage,
        table.page * table.rowsPerPage + table.rowsPerPage
      ),
    [filteredAndSortedTasks, table.page, table.rowsPerPage]
  );

  const handleSort = (property: OrderBy) => {
    table.onSort(property);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    table.onResetPage();
  };

  const handleTaskClick = useCallback(
    (task: IKanbanTask) => {
      setSelectedTask(task);
      taskDetailsDialog.onTrue();
    },
    [taskDetailsDialog]
  );

  const handleUpdateTask = useCallback(
    async (taskData: IKanbanTask) => {
      try {
        const columnId = taskData.columnId || 'default';
        await updateTask(columnId, taskData);
        setSelectedTask(taskData);
        toast.success(t('taskUpdatedSuccessfully', { defaultValue: 'Task updated successfully' }));
      } catch (error) {
        console.error('Failed to update task:', error);
        toast.error(t('failedToUpdateTask', { defaultValue: 'Failed to update task' }));
      }
    },
    [t]
  );

  const handleDeleteTask = useCallback(async () => {
    if (!selectedTask) return;

    try {
      const columnId = selectedTask.columnId || 'default';
      await deleteTask(columnId, selectedTask.id, selectedTask);
      taskDetailsDialog.onFalse();
      setSelectedTask(null);
      toast.success(t('taskDeletedSuccessfully', { defaultValue: 'Task deleted successfully' }));
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error(t('failedToDeleteTask', { defaultValue: 'Failed to delete task' }));
    }
  }, [selectedTask, taskDetailsDialog, t]);

  // Show loading state
  if (boardLoading) {
    return (
      <Card
        sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Typography>{t('loadingTasks', { defaultValue: 'Loading tasks...' })}</Typography>
      </Card>
    );
  }

  // Show error state
  if (boardError) {
    return (
      <Card
        sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Typography color="error">
          {t('errorLoadingTasks', { defaultValue: 'Error loading tasks' })}: {boardError.message}
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 3, pb: 2, flexShrink: 0 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <TextField
            fullWidth
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={t('searchTasksPlaceholder', {
              defaultValue: 'Search across tasks, clients, work orders, and personnel...',
            })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            helperText={t('searchTasksHelper', {
              defaultValue:
                'Search by task name, description, labels, client info, work order details, assignee, or reporter',
            })}
          />
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={taskCreateDialog.onTrue}
            sx={{ flexShrink: 0, mt: 0 }}
            size="large"
          >
            {t('addNewTask', { defaultValue: 'Add New Task' })}
          </Button>
        </Stack>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Scrollbar
          sx={{
            flex: 1,
            minHeight: 400,
            maxHeight: 'calc(100vh - 280px)',
          }}
        >
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow>
                {TABLE_HEAD.map((headCell) => (
                  <TableCell
                    key={headCell.id}
                    align={headCell.align}
                    sortDirection={table.orderBy === headCell.id ? table.order : false}
                    sx={{
                      minWidth: headCell.id === 'name' ? 200 : headCell.id === 'labels' ? 150 : 120,
                      fontWeight: 600,
                    }}
                  >
                    {headCell.sortable ? (
                      <TableSortLabel
                        active={table.orderBy === headCell.id}
                        direction={table.orderBy === headCell.id ? table.order : 'asc'}
                        onClick={() => handleSort(headCell.id as OrderBy)}
                      >
                        {headCell.label}
                      </TableSortLabel>
                    ) : (
                      headCell.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={TABLE_HEAD.length} align="center" sx={{ py: 6 }}>
                    <Stack spacing={2} alignItems="center">
                      <Iconify
                        icon="solar:clipboard-list-bold"
                        width={48}
                        sx={{ color: 'text.disabled' }}
                      />
                      <Typography variant="h6" color="text.secondary">
                        {t('noTasksFound', { defaultValue: 'No tasks found' })}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.disabled"
                        sx={{ maxWidth: 400, textAlign: 'center' }}
                      >
                        {t('noTasksFoundHelper', {
                          defaultValue:
                            'Try adjusting your search criteria. You can search by task name, client info, work order details, assignees, or any other field.',
                        })}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTasks.map((task) => (
                  <TableRow key={task.id} hover>
                    {/* Task Name & Description */}
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Stack spacing={0.5}>
                        <Typography
                          variant="subtitle2"
                          noWrap
                          onClick={() => handleTaskClick(task)}
                          sx={{
                            cursor: 'pointer',
                            color: 'primary.main',
                            '&:hover': {
                              color: 'primary.dark',
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          {task.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {getColumnName(task.columnId)}
                        </Typography>
                        {task.description && (
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              maxWidth: 180,
                            }}
                          >
                            {task.description}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    {/* Client */}
                    <TableCell>
                      <Stack spacing={0.5}>
                        {(task as any).clientName && (
                          <Typography variant="body2" noWrap>
                            {(task as any).clientName}
                          </Typography>
                        )}
                        {(task as any).clientCompany && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {(task as any).clientCompany}
                          </Typography>
                        )}
                        {!(task as any).clientName && !(task as any).clientCompany && (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    {/* Work Order */}
                    <TableCell>
                      <Stack spacing={0.5}>
                        {(task as any).workOrderTitle && (
                          <Typography variant="body2" noWrap>
                            {(task as any).workOrderTitle}
                          </Typography>
                        )}
                        {(task as any).workOrderNumber && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            #{(task as any).workOrderNumber}
                          </Typography>
                        )}
                        {!(task as any).workOrderTitle && !(task as any).workOrderNumber && (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Chip
                        label={task.status}
                        size="small"
                        variant="soft"
                        color={getStatusColor(task.status)}
                      />
                    </TableCell>

                    {/* Assignee */}
                    <TableCell>
                      {task.assignee && task.assignee.length > 0 ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <AvatarGroup max={2} sx={{ justifyContent: 'flex-start' }}>
                            {task.assignee.map((assignee) => (
                              <Tooltip
                                key={assignee.id}
                                title={`${assignee.name} (${assignee.email || 'No email'})`}
                              >
                                <Avatar
                                  src={assignee.avatarUrl || undefined}
                                  alt={assignee.name}
                                  sx={{ width: 28, height: 28, fontSize: '0.75rem' }}
                                >
                                  {(assignee as any).initials ||
                                    assignee.name.charAt(0).toUpperCase()}
                                </Avatar>
                              </Tooltip>
                            ))}
                          </AvatarGroup>
                          {task.assignee.length === 1 && (
                            <Typography variant="body2" sx={{ ml: 1 }} noWrap>
                              {task.assignee[0].name}
                            </Typography>
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          {t('unassigned', { defaultValue: 'Unassigned' })}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Reporter */}
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar
                          src={task.reporter?.avatarUrl || undefined}
                          alt={task.reporter?.name}
                          sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                        >
                          {(task.reporter as any)?.initials ||
                            task.reporter?.name?.charAt(0).toUpperCase() ||
                            'R'}
                        </Avatar>
                        <Typography variant="body2" noWrap>
                          {task.reporter?.name || t('unknown', { defaultValue: 'Unknown' })}
                        </Typography>
                      </Stack>
                    </TableCell>

                    {/* Completed Status */}
                    <TableCell align="center">
                      <Chip
                        label={
                          (task as any).completeStatus
                            ? t('yes', { defaultValue: 'Yes' })
                            : t('no', { defaultValue: 'No' })
                        }
                        size="small"
                        color={(task as any).completeStatus ? 'success' : 'default'}
                        variant={(task as any).completeStatus ? 'filled' : 'outlined'}
                      />
                    </TableCell>

                    {/* Priority */}
                    <TableCell align="center">
                      <Chip
                        label={task.priority}
                        color={getPriorityColor(task.priority)}
                        variant="soft"
                        size="small"
                      />
                    </TableCell>

                    {/* Created */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {task.createdAt ? fDate(task.createdAt) : t('na', { defaultValue: 'N/A' })}
                      </Typography>
                    </TableCell>

                    {/* Due Date */}
                    <TableCell>
                      {task.due && task.due[1] ? (
                        fDate(task.due[1])
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          {t('noDueDate', { defaultValue: 'No due date' })}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Labels */}
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {task.labels && task.labels.length > 0 ? (
                          <>
                            {task.labels.slice(0, 2).map((label, index) => (
                              <Chip
                                key={index}
                                label={label}
                                size="small"
                                variant="outlined"
                                sx={{ mb: 0.5, fontSize: '0.7rem' }}
                              />
                            ))}
                            {task.labels.length > 2 && (
                              <Tooltip title={task.labels.slice(2).join(', ')}>
                                <Typography variant="caption" color="text.secondary">
                                  +{task.labels.length - 2}
                                </Typography>
                              </Tooltip>
                            )}
                          </>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}

              <TableEmptyRows
                height={table.dense ? 56 : 76}
                emptyRows={emptyRows(table.page, table.rowsPerPage, filteredAndSortedTasks.length)}
              />
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={filteredAndSortedTasks.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          sx={{
            flexShrink: 0,
            borderTop: (theme) => `1px solid ${theme.vars?.palette.divider}`,
          }}
        />
      </Box>

      {/* Task Details Drawer */}
      {selectedTask && (
        <KanbanDetails
          task={selectedTask}
          open={taskDetailsDialog.value}
          onClose={taskDetailsDialog.onFalse}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* Task Create Dialog */}
      <KanbanTaskCreateDialog
        open={taskCreateDialog.value}
        onClose={taskCreateDialog.onFalse}
        status={columns[0]?.id || 'todo'} // Default to first column or 'todo'
        onSuccess={() => {
          taskCreateDialog.onFalse();
        }}
      />
    </Card>
  );
}
