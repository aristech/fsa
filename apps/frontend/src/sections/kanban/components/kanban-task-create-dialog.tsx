import useSWR from 'swr';
import { z as zod } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';

import axiosInstance from 'src/lib/axios';
import { useClient } from 'src/contexts/client-context';
import { createTask } from 'src/actions/kanban';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { useDateRangePicker, CustomDateRangePicker } from 'src/components/custom-date-range-picker';

// ----------------------------------------------------------------------

const TaskSchema = zod.object({
  name: zod.string().min(1, 'Task name is required'),
  description: zod.string().optional(),
  priority: zod.enum(['low', 'medium', 'high', 'urgent']),
  workOrderId: zod.string().optional(),
  clientId: zod.string().optional(),
  assignees: zod.array(zod.string()).optional(),
  labels: zod.array(zod.string()).optional(),
});

type TaskFormData = zod.infer<typeof TaskSchema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (task: any) => void;
  status: string;
};

export function KanbanTaskCreateDialog({ open, onClose, onSuccess, status }: Props) {
  const { selectedClient } = useClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    },
  });

  const watchedWorkOrderId = watch('workOrderId');
  const watchedClientId = watch('clientId');

  // Auto-populate assignees when work order is selected
  useEffect(() => {
    if (watchedWorkOrderId) {
      const selectedWorkOrder = workOrders.find((wo: any) => wo._id === watchedWorkOrderId);
      if (selectedWorkOrder?.personnelIds && Array.isArray(selectedWorkOrder.personnelIds)) {
        // Extract just the _id values from personnel objects
        const personnelIds = selectedWorkOrder.personnelIds
          .map((person: any) => 
            // Handle both object format {_id: "...", employeeId: "..."} and string format
            typeof person === 'object' ? person._id : person
          )
          .filter(Boolean); // Remove any null/undefined values
        
        console.log('Auto-populating assignees from work order:', personnelIds.length, 'personnel');
        setValue('assignees', personnelIds);
      }
      // Also auto-select client from the selected work order
      const woClient = selectedWorkOrder?.clientId;
      const derivedClientId = woClient && typeof woClient === 'object' ? woClient._id : woClient;
      if (derivedClientId && derivedClientId !== watchedClientId) {
        setValue('clientId', derivedClientId, { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [watchedWorkOrderId, watchedClientId, workOrders, setValue]);

  const onSubmit = handleSubmit(
    async (data) => {
      setIsSubmitting(true);
      try {
        // Find selected work order and client for additional data
        const selectedWorkOrder = workOrders.find((wo: any) => wo._id === data.workOrderId);
        const selectedClientFromForm = clients.find((client: any) => client._id === data.clientId);

        const taskData = {
          name: data.name,
          description: data.description,
          priority: data.priority,
          labels: data.labels,
          assignee: data.assignees?.map((id: string) => {
            const person = personnel.find((p: any) => p._id === id);
            return {
              id,
              name: person?.name || 'Unknown',
              email: person?.email,
              avatarUrl: person?.avatarUrl,
            };
          }) || [],
          reporter: {
            id: 'current-user', // You might want to get this from auth context
            name: 'Current User',
            email: 'user@example.com',
          },
          workOrderId: data.workOrderId || undefined,
          workOrderNumber: selectedWorkOrder?.workOrderNumber || undefined,
          workOrderTitle: selectedWorkOrder?.title || undefined,
          due: rangePicker.startDate && rangePicker.endDate ? [
            rangePicker.startDate.toISOString(),
            rangePicker.endDate.toISOString()
          ] : undefined,
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

        // Use the optimistic createTask function
        await createTask(status, taskData as any);
        
        toast.success('Task created successfully!');
        onSuccess(taskData);
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

  const handleSubmitClick = () => {
    // Debug helper - can be removed in production
    console.log('Submit button clicked');
  };

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
          <Typography variant="h6">Create New Task</Typography>
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
                    {workOrders.map((workOrder: any) => (
                      <MenuItem key={workOrder._id} value={workOrder._id}>
                        {workOrder.workOrderNumber} - {workOrder.title}
                      </MenuItem>
                    ))}
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

            {/* Assignees */}
            <Controller
              name="assignees"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  multiple
                  options={personnel}
                  getOptionLabel={(option: any) => option.name || 'Unknown'}
                  value={personnel.filter((p: any) => field.value?.includes(p._id)) || []}
                  onChange={(_, newValue) => {
                    field.onChange(newValue.map((person: any) => person._id));
                  }}
                  renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option: any, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option._id}
                        label={option.name || 'Unknown'}
                        avatar={
                          <Avatar>
                            {option.name
                              ?.split(' ')
                              .map((n: string) => n.charAt(0))
                              .join('')
                              .toUpperCase() || 'P'}
                          </Avatar>
                        }
                        size="small"
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Assignees" placeholder="Select assignees" />
                  )}
                />
              )}
            />

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
                title="Choose task dates"
                startDate={rangePicker.startDate}
                endDate={rangePicker.endDate}
                onChangeStartDate={rangePicker.onChangeStartDate}
                onChangeEndDate={rangePicker.onChangeEndDate}
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
            onClick={handleSubmitClick}
          >
            Create Task
          </LoadingButton>
        </Stack>
      </form>
    </Drawer>
  );
}
