import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
import useSWR, { mutate } from 'swr';
import { useBoolean } from 'minimal-shared/hooks';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { Tooltip } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';

// import { createTask } from 'src/actions/kanban';
import { useClient } from 'src/contexts/client-context';
import axiosInstance, { endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { useDateRangePicker, CustomDateRangePicker } from 'src/components/custom-date-range-picker';

import { KanbanContactsDialog } from '../components/kanban-contacts-dialog';

// ----------------------------------------------------------------------

const TaskSchema = zod.object({
  name: zod.string().min(1, 'Task name is required'),
  description: zod.string().optional(),
  priority: zod.enum(['low', 'medium', 'high', 'urgent']),
  workOrderId: zod.string().optional(),
  clientId: zod.string().optional(),
  assignees: zod.array(zod.string()).optional(),
  labels: zod.array(zod.string()).optional(),
  isPrivate: zod.boolean().optional(),
});

type TaskFormData = zod.infer<typeof TaskSchema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (task: any) => void;
  status: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialWorkOrderId?: string;
  initialClientId?: string;
};

export function KanbanTaskCreateDialog({
  open,
  onClose,
  onSuccess,
  status,
  initialStartDate,
  initialEndDate,
  initialWorkOrderId,
  initialClientId,
}: Props) {
  const { selectedClient } = useClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contactsDialog = useBoolean();

  // Fetch work orders for selection
  const { data: workOrdersData } = useSWR(
    open ? '/api/v1/work-orders?limit=100' : null,
    async (url) => {
      const response = await axiosInstance.get(url);
      return response.data;
    }
  );

  // Fetch personnel for assignee selection
  const { data: personnelData } = useSWR(
    open ? '/api/v1/personnel?limit=100' : null,
    async (url) => {
      const response = await axiosInstance.get(url);
      return response.data;
    }
  );

  // Fetch priorities from kanban meta
  const { data: kanbanMeta } = useSWR(open ? '/api/v1/kanban/meta' : null, async (url) => {
    const response = await axiosInstance.get(url);
    return response.data;
  });

  // Fetch clients for selection
  const { data: clientsData } = useSWR(open ? '/api/v1/clients?limit=100' : null, async (url) => {
    try {
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching clients in Create Task:', error);
      throw error;
    }
  });

  const workOrders = useMemo(
    () => (Array.isArray(workOrdersData?.data?.workOrders) ? workOrdersData.data.workOrders : []),
    [workOrdersData?.data?.workOrders]
  );
  const personnel = Array.isArray(personnelData?.data) ? personnelData.data : [];
  const priorities = Array.isArray(kanbanMeta?.data?.priorities) ? kanbanMeta.data.priorities : [];
  const clients = Array.isArray(clientsData?.data?.clients) ? clientsData.data.clients : [];

  // Date range picker for start and due dates
  const rangePicker = useDateRangePicker(null, null);

  const preserveTimeIfMidnight = useCallback((newDate: Dayjs | null, prevDate: Dayjs | null) => {
    if (!newDate) return null;
    if (!prevDate) return newDate;
    const isMidnight =
      newDate.hour() === 0 && newDate.minute() === 0 && (newDate.second?.() ?? 0) === 0;
    if (isMidnight) {
      return newDate.hour(prevDate.hour()).minute(prevDate.minute());
    }
    return newDate;
  }, []);

  const handleChangeStartDate = useCallback(
    (next: Dayjs | null) => {
      const adjusted = preserveTimeIfMidnight(next, rangePicker.startDate);
      rangePicker.onChangeStartDate(adjusted);
    },
    [preserveTimeIfMidnight, rangePicker]
  );

  const handleChangeEndDate = useCallback(
    (next: Dayjs | null) => {
      const adjusted = preserveTimeIfMidnight(next, rangePicker.endDate);
      rangePicker.onChangeEndDate(adjusted);
    },
    [preserveTimeIfMidnight, rangePicker]
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<TaskFormData>({
    resolver: zodResolver(TaskSchema),
    defaultValues: {
      name: '',
      description: '',
      priority: 'medium',
      workOrderId: '',
      clientId: '',
      assignees: [],
      labels: [],
      isPrivate: false,
    },
  });

  const watchedWorkOrderId = watch('workOrderId');
  const watchedClientId = watch('clientId');
  const watchedIsPrivate = watch('isPrivate');

  // Auto-populate assignees when work order is selected (unless private)
  useEffect(() => {
    if (watchedWorkOrderId) {
      const selectedWorkOrder = workOrders.find((wo: any) => wo._id === watchedWorkOrderId);
      if (
        selectedWorkOrder?.personnelIds &&
        Array.isArray(selectedWorkOrder.personnelIds) &&
        !watchedIsPrivate
      ) {
        // Extract just the _id values from personnel objects
        const personnelIds = selectedWorkOrder.personnelIds
          .map((person: any) =>
            // Handle both object format {_id: "...", employeeId: "..."} and string format
            typeof person === 'object' ? person._id : person
          )
          .filter(Boolean); // Remove any null/undefined values

        setValue('assignees', personnelIds);
      }
      // Also auto-select client from the selected work order
      const woClient = selectedWorkOrder?.clientId;
      const derivedClientId = woClient && typeof woClient === 'object' ? woClient._id : woClient;
      if (derivedClientId && derivedClientId !== watchedClientId) {
        setValue('clientId', derivedClientId, { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [watchedWorkOrderId, watchedClientId, watchedIsPrivate, workOrders, setValue]);

  // Pre-populate form with initial values when dialog opens
  useEffect(() => {
    if (open && (initialWorkOrderId || initialClientId)) {
      if (initialWorkOrderId) {
        setValue('workOrderId', initialWorkOrderId, { shouldDirty: true, shouldValidate: true });
      }
      if (initialClientId) {
        setValue('clientId', initialClientId, { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [open, initialWorkOrderId, initialClientId, setValue]);

  const onSubmit = handleSubmit(
    async (data) => {
      setIsSubmitting(true);
      try {
        // Find selected work order and client for additional data
        const selectedWorkOrder = workOrders.find((wo: any) => wo._id === data.workOrderId);
        const selectedClientFromForm = clients.find((client: any) => client._id === data.clientId);

        // If private, ensure no assignees
        const assigneeIds: string[] = data.isPrivate
          ? []
          : Array.from(new Set(data.assignees || []));
        const taskData = {
          name: data.name,
          description: data.description,
          priority: data.priority,
          labels: data.labels,
          // Backend expects `assignees` as array of personnel IDs; also send single `assignee` for compatibility
          assignees: assigneeIds,
          ...(assigneeIds.length > 0 ? { assignee: assigneeIds[0] } : {}),
          workOrderId: data.workOrderId || undefined,
          workOrderNumber: selectedWorkOrder?.workOrderNumber || undefined,
          workOrderTitle: selectedWorkOrder?.title || undefined,
          // Include isPrivate flag
          isPrivate: data.isPrivate || false,
          // Persist explicit start/due dates so time is saved (in UTC)
          ...(rangePicker.startDate && { startDate: rangePicker.startDate.utc().toISOString() }),
          ...(rangePicker.endDate && { dueDate: rangePicker.endDate.utc().toISOString() }),
          createdAt: new Date().toISOString(),
          status: 'Todo', // Default status
          columnId: status,
          // Add client information from form selection or context
          ...(selectedClientFromForm && {
            clientId: selectedClientFromForm._id,
            clientName: selectedClientFromForm.name,
            clientCompany: selectedClientFromForm.company,
          }),
          // Fallback to context client if no form selection
          ...(!selectedClientFromForm &&
            selectedClient && {
              clientId: selectedClient._id,
              clientName: selectedClient.name,
              clientCompany: selectedClient.company,
            }),
          // Final fallback: derive client from selected work order if available
          ...(!selectedClientFromForm &&
            !selectedClient &&
            selectedWorkOrder?.clientId && {
              clientId: (selectedWorkOrder.clientId as any)?._id || selectedWorkOrder.clientId,
              clientName: (selectedWorkOrder.clientId as any)?.name,
              clientCompany: (selectedWorkOrder.clientId as any)?.company,
            }),
        };

        // Create task on server directly to obtain created ID
        const resp = await axiosInstance.post(
          endpoints.kanban,
          { columnId: status, taskData },
          { params: { endpoint: 'create-task' } }
        );
        const created = resp?.data?.data;
        const createdTaskId = created?._id || created?.id;

        // Ensure assignees persist even if WO inheritance runs after creation
        if (createdTaskId && assigneeIds.length > 0) {
          try {
            await axiosInstance.post(
              endpoints.kanban,
              { taskData: { id: createdTaskId, assignees: assigneeIds } },
              { params: { endpoint: 'update-task' } }
            );
          } catch (e) {
            console.warn('Failed to enforce assignees post-create', e);
          }
        }

        // Revalidate kanban and calendar caches
        await Promise.all([
          mutate(endpoints.kanban),
          mutate((key: any) => typeof key === 'string' && key.startsWith(endpoints.kanban)),
          mutate(endpoints.calendar),
          taskData.clientId
            ? mutate(`${endpoints.calendar}?clientId=${taskData.clientId}`)
            : Promise.resolve(),
        ]);

        toast.success('Task created successfully!');
        onSuccess({ ...taskData, id: createdTaskId });
        handleClose();
      } catch (error) {
        console.error('Failed to create task:', error);
        toast.error('Failed to create task. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    (validationErrors) => {
      console.error('Form validation failed:', validationErrors);
      toast.error('Please fix the form errors before submitting.');
    }
  );

  const handleClose = useCallback(() => {
    reset();
    rangePicker.onReset?.();
    onClose();
  }, [reset, rangePicker, onClose]);

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      anchor="right"
      slotProps={{
        backdrop: { invisible: true },
        paper: { sx: { width: { xs: 1, sm: 480 } } },
      }}
    >
      <form onSubmit={onSubmit}>
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2.5, py: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6">Create New Task</Typography>
            <Tooltip title="Make task private">
              <IconButton
                onClick={() => {
                  const newPrivateValue = !watchedIsPrivate;
                  setValue('isPrivate', newPrivateValue);
                  // Clear assignees when going private
                  if (newPrivateValue) {
                    setValue('assignees', []);
                  }
                }}
                color={watchedIsPrivate ? 'error' : 'default'}
                size="small"
              >
                <Iconify
                  icon={watchedIsPrivate ? 'solar:lock-bold' : 'solar:lock-unlocked-bold'}
                  width={20}
                />
              </IconButton>
            </Tooltip>
          </Stack>
          <Button color="inherit" onClick={handleClose}>
            Close
          </Button>
        </Stack>
        <Divider />

        <Scrollbar fillContent sx={{ py: 3, px: 2.5 }}>
          <Stack spacing={3}>
            {/* Task Name */}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Task Name"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  autoFocus
                />
              )}
            />

            {/* Client Information */}
            {selectedClient && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                  Client Information
                </Typography>
                <Chip
                  label={`${selectedClient.name}${selectedClient.company ? ` (${selectedClient.company})` : ''}`}
                  color="info"
                  variant="outlined"
                />
              </Box>
            )}

            {/* Work Order */}
            <Controller
              name="workOrderId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Work Order (Optional)</InputLabel>
                  <Select {...field} label="Work Order (Optional)">
                    <MenuItem value="">
                      <em>No Work Order</em>
                    </MenuItem>
                    {workOrders.map((workOrder: any) => {
                      // Get client name from the work order
                      const clientName =
                        typeof workOrder.clientId === 'object'
                          ? workOrder.clientId?.name
                          : workOrder.clientName || 'Unknown Client';

                      return (
                        <MenuItem key={workOrder._id} value={workOrder._id}>
                          {workOrder.workOrderNumber} - {workOrder.title} ({clientName})
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )}
            />

            {/* Client */}
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Client (Optional)</InputLabel>
                  <Select {...field} label="Client (Optional)" disabled={!clientsData}>
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
              )}
            />

            {/* Priority */}
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select {...field} label="Priority">
                    {priorities.map((priority: any) => (
                      <MenuItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            {/* Assignees (consistent with KanbanDetails) - hidden when private */}
            {!watchedIsPrivate && (
              <Controller
                name="assignees"
                control={control}
                render={({ field }) => {
                  const selectedIds: string[] = field.value || [];
                  const selectedPeople = personnel.filter((p: any) => selectedIds.includes(p._id));
                  return (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                        Assignees
                      </Typography>
                      <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
                        {selectedPeople.length > 0 ? (
                          selectedPeople.map((user: any) => (
                            <Avatar key={user._id}>
                              {user.name
                                ?.split(' ')
                                .map((n: string) => n.charAt(0))
                                .join('')
                                .toUpperCase() || 'A'}
                            </Avatar>
                          ))
                        ) : (
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            No assignees
                          </Typography>
                        )}
                        <Button
                          onClick={contactsDialog.onTrue}
                          startIcon={<Iconify icon="mingcute:add-line" />}
                          variant="outlined"
                          size="small"
                          sx={{ ml: 0.5 }}
                        >
                          Add
                        </Button>
                      </Box>
                      <KanbanContactsDialog
                        assignee={selectedPeople.map((p: any) => ({ id: p._id, name: p.name }))}
                        open={contactsDialog.value}
                        onClose={contactsDialog.onFalse}
                        onAssign={(list) => {
                          const ids = list.map((p) => p.id);
                          field.onChange(ids);
                        }}
                      />
                    </Box>
                  );
                }}
              />
            )}

            {/* Date Range */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                Task Schedule (Optional)
              </Typography>

              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:calendar-date-bold" />}
                onClick={rangePicker.onOpen}
                sx={{
                  justifyContent: 'flex-start',
                  color: 'text.secondary',
                  borderColor: 'divider',
                }}
                fullWidth
              >
                {rangePicker.startDate || rangePicker.endDate
                  ? `${rangePicker.startDate?.format('MMM DD, YYYY') || 'Start date'} - ${rangePicker.endDate?.format('MMM DD, YYYY') || 'Due date'}`
                  : 'Choose task dates'}
              </Button>

              <CustomDateRangePicker
                variant="calendar"
                title="Choose task dates & times"
                enableTime
                startDate={rangePicker.startDate}
                endDate={rangePicker.endDate}
                onChangeStartDate={handleChangeStartDate}
                onChangeEndDate={handleChangeEndDate}
                open={rangePicker.open}
                onClose={rangePicker.onClose}
              />
            </Box>

            {/* Description */}
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description"
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              )}
            />

            {/* Labels/Tags */}
            <Controller
              name="labels"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  multiple
                  freeSolo
                  options={[]}
                  value={field.value || []}
                  onChange={(_, newValue) => {
                    field.onChange(newValue);
                  }}
                  renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => (
                      <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Labels" placeholder="Add labels" />
                  )}
                />
              )}
            />
          </Stack>
        </Scrollbar>

        {/* Footer Actions */}
        <Divider />
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={1.5}
          sx={{ px: 2.5, py: 2 }}
        >
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={isSubmitting}
            loadingIndicator="Creating..."
          >
            Create Task
          </LoadingButton>
        </Stack>
      </form>
    </Drawer>
  );
}
