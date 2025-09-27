'use client';

import type { IReport, CreateReportData } from 'src/lib/models/Report';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import { Box, Chip, Divider, Typography } from '@mui/material';

import { offlineStorage } from 'src/lib/offline-storage';
import { offlineSyncService } from 'src/lib/offline-sync';
import { ReportService } from 'src/lib/services/report-service';
import { getNetworkStatus, addNetworkStatusListener } from 'src/lib/network-utils';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import {
  MobileCard,
  MobileInput,
  MobileButton,
  MobileSelect,
  MobileDatePicker,
} from 'src/components/mobile';

import { useAuthContext } from 'src/auth/hooks';

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
  const { user } = useAuthContext();

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
  const [currentStep, setCurrentStep] = useState(1);
  const [equipmentInput, setEquipmentInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = addNetworkStatusListener((status) => {
      setIsOffline(!status.isOnline);
    });
    return unsubscribe;
  }, []);

  // Trigger sync when component mounts (if online)
  useEffect(() => {
    if (getNetworkStatus().isOnline) {
      offlineSyncService.syncPendingDrafts();
    }
  }, []);

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

  const validateStep = useCallback(
    (step: number) => {
      switch (step) {
        case 1:
          return !!(formData.type && formData.location?.trim());
        case 2:
          return true; // Optional fields
        case 3:
          return true; // Optional fields
        default:
          return false;
      }
    },
    [formData]
  );

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    } else {
      toast.error('Please fill in all required fields');
    }
  }, [currentStep, validateStep]);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  // Helper function to save draft offline
  const saveOfflineDraft = useCallback(
    async (reportData: any) => {
      try {
        // Save to offline storage
        const draftId = offlineStorage.saveDraft(
          reportData,
          user?._id || 'unknown',
          user?.email || 'unknown@example.com'
        );

        const statusMessage = isOffline
          ? 'Report saved offline as draft. It will sync when connection is restored.'
          : 'Report saved as draft locally.';

        toast.success(statusMessage, {
          duration: 5000,
          action: {
            label: 'View Drafts',
            onClick: () => {
              // TODO: Navigate to drafts view
              console.log('Navigate to drafts view');
            },
          },
        });

        onSuccess({ _id: draftId, ...reportData, isOfflineDraft: true });
      } catch (error) {
        console.error('Failed to save offline draft:', error);
        toast.error('Failed to save draft locally. Please try again.');
        throw error;
      }
    },
    [user, isOffline, onSuccess]
  );

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Always try to upload to server first (regardless of network status)
      try {
        const response = await ReportService.createReport(formData);
        if (response.success) {
          toast.success('Report created successfully');
          onSuccess(response.data);
          return;
        } else {
          throw new Error(response.message || 'Failed to create report');
        }
      } catch (serverError: any) {
        console.warn('Server save failed, saving locally:', serverError);

        // If server save fails, save locally as fallback
        await saveOfflineDraft(formData);
        return;
      }
    } catch (error: any) {
      console.error('Error creating report:', error);

      // Handle validation errors specifically
      if (error?.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = validationErrors
          .map((err: any) => `${err.path?.join('.')} ${err.message || err.code}`)
          .join(', ');
        toast.error(`Validation error: ${errorMessages}`);
      } else if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(error.message || 'Failed to create report');
      }
    } finally {
      setLoading(false);
    }
  }, [formData, currentStep, validateStep, onSuccess, saveOfflineDraft]);

  const renderBasicInfo = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Basic Information
      </Typography>

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
      {isOffline && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 2,
            mb: 2,
            backgroundColor: 'warning.lighter',
            color: 'warning.darker',
            borderRadius: 1,
          }}
        >
          <Iconify icon="eva:wifi-off-fill" width={16} />
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            Offline (will save locally if upload fails)
          </Typography>
        </Box>
      )}
      {renderStepIndicator()}

      <Box sx={{ flex: 1, mb: 3 }}>{renderStepContent()}</Box>

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
            {isOffline ? 'Save Draft (Offline)' : 'Create Report'}
          </MobileButton>
        )}
      </Box>
    </MobileCard>
  );
}
