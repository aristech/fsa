'use client';

import type { IReport, CreateReportData } from 'src/lib/models/Report';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

import {
  Box,
  Chip,
  Stack,
  Button,
  Select,
  Divider,
  MenuItem,
  TextField,
  Typography,
  InputLabel,
  FormControl,
  Autocomplete,
} from '@mui/material';

import { ReportService } from 'src/lib/services/report-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { MobileDatePicker } from 'src/components/mobile';

// ----------------------------------------------------------------------

const reportTypes = [
  { value: 'daily', label: 'Daily Report' },
  { value: 'weekly', label: 'Weekly Report' },
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'incident', label: 'Incident Report' },
  { value: 'maintenance', label: 'Maintenance Report' },
  { value: 'inspection', label: 'Inspection Report' },
  { value: 'completion', label: 'Completion Report' },
  { value: 'safety', label: 'Safety Report' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

// Mock data - In real app, fetch from APIs
const mockClients = [
  { value: 'client-1', label: 'ABC Corporation' },
  { value: 'client-2', label: 'XYZ Industries' },
  { value: 'client-3', label: 'DEF Construction' },
];

const mockWorkOrders = [
  { value: 'wo-1', label: 'WO-2024-001 - HVAC Installation' },
  { value: 'wo-2', label: 'WO-2024-002 - Electrical Maintenance' },
  { value: 'wo-3', label: 'WO-2024-003 - Plumbing Repair' },
];

const mockTasks = [
  { value: 'task-1', label: 'Install HVAC Unit' },
  { value: 'task-2', label: 'Test Electrical Systems' },
  { value: 'task-3', label: 'Replace Pipes' },
];

interface ReportCreateFormProps {
  onSuccess: (report: IReport) => void;
  onCancel: () => void;
  initialData?: Partial<CreateReportData>;
}

export function ReportCreateForm({ onSuccess, onCancel, initialData }: ReportCreateFormProps) {
  const [formData, setFormData] = useState<CreateReportData>({
    type: 'daily',
    location: '',
    weather: '',
    equipment: [],
    reportDate: new Date(),
    priority: 'medium',
    clientId: '',
    workOrderId: '',
    taskIds: [],
    tags: [],
    customFields: {},
    ...initialData,
  });

  const [loading, setLoading] = useState(false);
  const [equipmentInput, setEquipmentInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleFieldChange = useCallback((field: keyof CreateReportData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddEquipment = useCallback(() => {
    if (equipmentInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        equipment: [...(prev.equipment || []), equipmentInput.trim()],
      }));
      setEquipmentInput('');
    }
  }, [equipmentInput]);

  const handleRemoveEquipment = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      equipment: prev.equipment?.filter((_, i) => i !== index) || [],
    }));
  }, []);

  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  }, [tagInput, formData.tags]);

  const handleRemoveTag = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((_, i) => i !== index) || [],
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.type || !formData.location?.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await ReportService.createReport(formData);
      if (response.success) {
        toast.success('Report created successfully');
        onSuccess(response.data);
      } else {
        toast.error(response.message || 'Failed to create report');
      }
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('Failed to create report');
    } finally {
      setLoading(false);
    }
  }, [formData, onSuccess]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Basic Information */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Basic Information
        </Typography>
        <Stack spacing={3}>
          <FormControl fullWidth required>
            <InputLabel>Report Type</InputLabel>
            <Select
              value={formData.type}
              label="Report Type"
              onChange={(e) => handleFieldChange('type', e.target.value)}
            >
              {reportTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={formData.priority}
              label="Priority"
              onChange={(e) => handleFieldChange('priority', e.target.value)}
            >
              {priorityOptions.map((priority) => (
                <MenuItem key={priority.value} value={priority.value}>
                  {priority.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <MobileDatePicker
            label="Report Date"
            value={formData.reportDate ? dayjs(formData.reportDate) : dayjs()}
            onChange={(date) => handleFieldChange('reportDate', date?.toDate())}
          />

          <TextField
            fullWidth
            label="Location"
            value={formData.location}
            onChange={(e) => handleFieldChange('location', e.target.value)}
            placeholder="Work location or site address..."
            required
          />

          <TextField
            fullWidth
            label="Weather Conditions"
            value={formData.weather}
            onChange={(e) => handleFieldChange('weather', e.target.value)}
            placeholder="Sunny, rainy, windy, etc..."
          />
        </Stack>
      </Box>

      <Divider />

      {/* Related Records */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Related Records
        </Typography>
        <Stack spacing={3}>
          <Autocomplete
            options={mockClients}
            value={mockClients.find((c) => c.value === formData.clientId) || null}
            onChange={(event, newValue) => handleFieldChange('clientId', newValue?.value || '')}
            renderInput={(params) => (
              <TextField {...params} label="Client" placeholder="Select client..." />
            )}
          />

          <Autocomplete
            options={mockWorkOrders}
            value={mockWorkOrders.find((wo) => wo.value === formData.workOrderId) || null}
            onChange={(event, newValue) => handleFieldChange('workOrderId', newValue?.value || '')}
            renderInput={(params) => (
              <TextField {...params} label="Work Order" placeholder="Select work order..." />
            )}
          />

          <Autocomplete
            multiple
            options={mockTasks}
            value={mockTasks.filter((t) => formData.taskIds?.includes(t.value) || false)}
            onChange={(event, newValue) =>
              handleFieldChange(
                'taskIds',
                newValue.map((t) => t.value)
              )
            }
            renderInput={(params) => (
              <TextField {...params} label="Related Tasks" placeholder="Select tasks..." />
            )}
          />
        </Stack>
      </Box>

      <Divider />

      {/* Equipment */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Equipment Used
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              label="Add Equipment"
              value={equipmentInput}
              onChange={(e) => setEquipmentInput(e.target.value)}
              placeholder="Equipment name..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddEquipment()}
            />
            <Button
              variant="outlined"
              onClick={handleAddEquipment}
              disabled={!equipmentInput.trim()}
            >
              Add
            </Button>
          </Box>
          {formData.equipment && formData.equipment.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {formData.equipment.map((item, index) => (
                <Chip
                  key={index}
                  label={item}
                  onDelete={() => handleRemoveEquipment(index)}
                  size="small"
                />
              ))}
            </Box>
          )}
        </Stack>
      </Box>

      <Divider />

      {/* Tags */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Tags
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              label="Add Tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Tag name..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <Button
              variant="outlined"
              onClick={handleAddTag}
              disabled={!tagInput.trim() || formData.tags?.includes(tagInput.trim())}
            >
              Add
            </Button>
          </Box>
          {formData.tags && formData.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {formData.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => handleRemoveTag(index)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </Stack>
      </Box>

      <Divider />

      {/* Actions */}
      <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
        <Button variant="outlined" onClick={onCancel} sx={{ flex: 1 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          loading={loading}
          disabled={!formData.type || !formData.location?.trim()}
          startIcon={<Iconify icon="eva:save-fill" width={16} />}
          sx={{ flex: 1 }}
        >
          Create Report
        </Button>
      </Stack>
    </Box>
  );
}
