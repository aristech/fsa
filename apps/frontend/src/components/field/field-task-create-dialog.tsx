
import useSWR from 'swr';
import { useState } from 'react';

import {
  Box,
  Chip,
  Dialog,
  Button,
  Select,
  MenuItem,
  TextField,
  InputLabel,
  DialogTitle,
  FormControl,
  Autocomplete,
  DialogContent,
  DialogActions,
} from '@mui/material';

import axiosInstance from '../../lib/axios';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  status?: string;
  initialStartDate?: string;
  initialEndDate?: string;
};

export function FieldTaskCreateDialog({
  open,
  onClose,
  onSuccess,
  status = 'todo',
  initialStartDate,
  initialEndDate,
}: Props) {
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

  // Fetch clients for selection
  const { data: clientsData } = useSWR(open ? '/api/v1/clients?limit=100' : null, async (url) => {
    const response = await axiosInstance.get(url);
    return response.data;
  });

  const workOrders = Array.isArray(workOrdersData?.data?.workOrders)
    ? workOrdersData.data.workOrders
    : [];
  const personnel = Array.isArray(personnelData?.data?.personnel)
    ? personnelData.data.personnel
    : [];
  const clients = Array.isArray(clientsData?.data?.clients) ? clientsData.data.clients : [];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    clientId: '',
    workOrderId: '',
    assigneeIds: [] as string[],
    tags: [] as string[],
    startDate: initialStartDate || '',
    endDate: initialEndDate || '',
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const selectedClient = clients.find((client: any) => client._id === formData.clientId);
      const selectedWorkOrder = workOrders.find((wo: any) => wo._id === formData.workOrderId);

      const taskData = {
        name: formData.name,
        description: formData.description,
        priority: formData.priority,
        status,
        columnId: status,
        labels: formData.tags,
        tags: formData.tags,
        assignee: formData.assigneeIds.map((id) => {
          const person = personnel.find((p: any) => p._id === id);
          return {
            id,
            name: person ? `${person.firstName} ${person.lastName}` : 'Unknown',
            email: person?.email || '',
          };
        }),
        due:
          formData.startDate && formData.endDate
            ? [formData.startDate, formData.endDate]
            : undefined,
        ...(selectedClient && {
          clientId: selectedClient._id,
          clientName: selectedClient.name,
          clientCompany: selectedClient.company,
        }),
        ...(selectedWorkOrder && {
          workOrderId: selectedWorkOrder._id,
          workOrderNumber: selectedWorkOrder.number,
          workOrderTitle: selectedWorkOrder.title,
        }),
      };

      await axiosInstance.post('/api/v1/kanban/tasks', taskData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      clientId: '',
      workOrderId: '',
      assigneeIds: [],
      tags: [],
      startDate: initialStartDate || '',
      endDate: initialEndDate || '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Task</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <TextField
            label="Task Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            multiline
            rows={3}
            fullWidth
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                label="Priority"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Client</InputLabel>
              <Select
                value={formData.clientId}
                onChange={(e) => handleInputChange('clientId', e.target.value)}
                label="Client"
              >
                <MenuItem value="">No Client</MenuItem>
                {clients.map((client: any) => (
                  <MenuItem key={client._id} value={client._id}>
                    {client.name} {client.company ? `(${client.company})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Work Order</InputLabel>
            <Select
              value={formData.workOrderId}
              onChange={(e) => handleInputChange('workOrderId', e.target.value)}
              label="Work Order"
            >
              <MenuItem value="">No Work Order</MenuItem>
              {workOrders.map((wo: any) => (
                <MenuItem key={wo._id} value={wo._id}>
                  {wo.number} - {wo.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            multiple
            options={personnel}
            getOptionLabel={(option: any) => `${option.firstName} ${option.lastName}`}
            value={personnel.filter((p: any) => formData.assigneeIds.includes(p._id))}
            onChange={(_, newValue) => {
              handleInputChange(
                'assigneeIds',
                newValue.map((p: any) => p._id)
              );
            }}
            renderTags={(value, getTagProps) =>
              value.map((option: any, index: number) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option._id}
                  label={`${option.firstName} ${option.lastName}`}
                />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Assignees" placeholder="Select personnel..." />
            )}
          />

          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={formData.tags}
            onChange={(_, newValue) => handleInputChange('tags', newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip {...getTagProps({ index })} key={option} label={option} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Tags" placeholder="Add tags..." />
            )}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Start Date"
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End Date"
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting || !formData.name.trim()}
        >
          {isSubmitting ? 'Creating...' : 'Create Task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
