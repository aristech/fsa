'use client';

import type { IReport, CreateReportData } from 'src/lib/models/Report';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

import { Box, Chip, Divider, Typography } from '@mui/material';

import { ReportService } from 'src/lib/services/report-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import {
  MobileCard,
  MobileInput,
  MobileButton,
  MobileSelect,
  MobileDatePicker,
} from 'src/components/mobile';

// ----------------------------------------------------------------------

const reportTypes = [
  { value: 'daily', label: 'Daily Report', icon: 'eva:calendar-fill' },
  { value: 'weekly', label: 'Weekly Report', icon: 'eva:clock-fill' },
  { value: 'monthly', label: 'Monthly Report', icon: 'eva:calendar-outline' },
  { value: 'incident', label: 'Incident Report', icon: 'eva:alert-triangle-fill' },
  { value: 'maintenance', label: 'Maintenance Report', icon: 'eva:settings-fill' },
  { value: 'inspection', label: 'Inspection Report', icon: 'eva:search-fill' },
  { value: 'completion', label: 'Completion Report', icon: 'eva:checkmark-circle-fill' },
  { value: 'safety', label: 'Safety Report', icon: 'eva:shield-fill' },
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'success' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'high', label: 'High', color: 'error' },
  { value: 'urgent', label: 'Urgent', color: 'error' },
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
    title: '',
    type: 'daily',
    description: '',
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
  const [currentStep, setCurrentStep] = useState(1);
  const [equipmentInput, setEquipmentInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleFieldChange = useCallback((field: keyof CreateReportData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAddEquipment = useCallback(() => {
    if (equipmentInput.trim()) {
      setFormData(prev => ({
        ...prev,
        equipment: [...(prev.equipment || []), equipmentInput.trim()]
      }));
      setEquipmentInput('');
    }
  }, [equipmentInput]);

  const handleRemoveEquipment = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  }, [tagInput, formData.tags]);

  const handleRemoveTag = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const validateStep = useCallback((step: number) => {
    switch (step) {
      case 1:
        return !!(formData.title?.trim() && formData.type && formData.description?.trim());
      case 2:
        return true; // Optional fields
      case 3:
        return true; // Optional fields
      default:
        return false;
    }
  }, [formData]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    } else {
      toast.error('Please fill in all required fields');
    }
  }, [currentStep, validateStep]);

  const handlePrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) {
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
  }, [formData, currentStep, validateStep, onSuccess]);

  const renderBasicInfo = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Basic Information
      </Typography>

      <MobileInput
        label="Report Title *"
        value={formData.title}
        onChange={(e) => handleFieldChange('title', e.target.value)}
        placeholder="Enter report title..."
        required
      />

      <MobileSelect
        label="Report Type *"
        value={formData.type}
        onChange={(value) => handleFieldChange('type', value)}
        options={reportTypes}
        required
      />

      <MobileSelect
        label="Priority"
        value={formData.priority}
        onChange={(value) => handleFieldChange('priority', value)}
        options={priorityOptions}
      />

      <MobileDatePicker
        label="Report Date *"
        value={formData.reportDate ? dayjs(formData.reportDate) : dayjs()}
        onChange={(date) => handleFieldChange('reportDate', date?.toDate())}
        required
      />

      <MobileInput
        label="Description *"
        value={formData.description}
        onChange={(e) => handleFieldChange('description', e.target.value)}
        placeholder="Describe the work performed, findings, or incident..."
        multiline
        rows={4}
        required
      />

      <MobileInput
        label="Location"
        value={formData.location}
        onChange={(e) => handleFieldChange('location', e.target.value)}
        placeholder="Work location or site address..."
      />

      <MobileInput
        label="Weather Conditions"
        value={formData.weather}
        onChange={(e) => handleFieldChange('weather', e.target.value)}
        placeholder="Sunny, rainy, windy, etc..."
      />
    </Box>
  );

  const renderRelationships = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Related Records
      </Typography>

      <MobileSelect
        label="Client"
        value={formData.clientId}
        onChange={(value) => handleFieldChange('clientId', value)}
        options={[{ value: '', label: 'Select Client...' }, ...mockClients]}
      />

      <MobileSelect
        label="Work Order"
        value={formData.workOrderId}
        onChange={(value) => handleFieldChange('workOrderId', value)}
        options={[{ value: '', label: 'Select Work Order...' }, ...mockWorkOrders]}
      />

      <MobileSelect
        label="Related Tasks"
        value={formData.taskIds?.[0] || ''}
        onChange={(value) => handleFieldChange('taskIds', value ? [value] : [])}
        options={[{ value: '', label: 'Select Task...' }, ...mockTasks]}
      />
    </Box>
  );

  const renderAdditionalInfo = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Additional Information
      </Typography>

      {/* Equipment */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Equipment Used
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <MobileInput
            label="Add Equipment"
            value={equipmentInput}
            onChange={(e) => setEquipmentInput(e.target.value)}
            placeholder="Equipment name..."
            onKeyPress={(e) => e.key === 'Enter' && handleAddEquipment()}
            sx={{ flex: 1 }}
          />
          <MobileButton
            variant="outline"
            onClick={handleAddEquipment}
            disabled={!equipmentInput.trim()}
          >
            Add
          </MobileButton>
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
      </Box>

      <Divider />

      {/* Tags */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Tags
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <MobileInput
            label="Add Tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Tag name..."
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            sx={{ flex: 1 }}
          />
          <MobileButton
            variant="outline"
            onClick={handleAddTag}
            disabled={!tagInput.trim() || formData.tags?.includes(tagInput.trim())}
          >
            Add
          </MobileButton>
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
      </Box>
    </Box>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfo();
      case 2:
        return renderRelationships();
      case 3:
        return renderAdditionalInfo();
      default:
        return null;
    }
  };

  const renderStepIndicator = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
      {[1, 2, 3].map((step) => (
        <Box
          key={step}
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 1,
            backgroundColor: step <= currentStep ? 'primary.main' : 'grey.300',
            color: step <= currentStep ? 'white' : 'text.secondary',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          {step}
        </Box>
      ))}
    </Box>
  );

  return (
    <MobileCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {renderStepIndicator()}

      <Box sx={{ flex: 1, mb: 3 }}>
        {renderStepContent()}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {currentStep > 1 && (
          <MobileButton
            variant="outline"
            onClick={handlePrevious}
            icon={<Iconify icon="eva:arrow-left-fill" width={16} />}
          >
            Previous
          </MobileButton>
        )}

        <MobileButton variant="outline" onClick={onCancel} sx={{ flex: 1 }}>
          Cancel
        </MobileButton>

        {currentStep < 3 ? (
          <MobileButton
            variant="primary"
            onClick={handleNext}
            disabled={!validateStep(currentStep)}
            icon={<Iconify icon="eva:arrow-right-fill" width={16} />}
            iconPosition="right"
          >
            Next
          </MobileButton>
        ) : (
          <MobileButton
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={!validateStep(currentStep)}
            icon={<Iconify icon="eva:save-fill" width={16} />}
          >
            Create Report
          </MobileButton>
        )}
      </Box>
    </MobileCard>
  );
}