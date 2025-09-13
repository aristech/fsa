'use client';

import type { IReport, CreateReportData } from 'src/lib/models/Report';

import useSWR from 'swr';
import dayjs from 'dayjs';
import { useMemo, useState, useEffect, useCallback } from 'react';

import { Box, Drawer, useTheme, TextField, Typography, Autocomplete } from '@mui/material';

import axiosInstance, { endpoints } from 'src/lib/axios';
import { ReportService } from 'src/lib/services/report-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { SignatureCollector, type SignatureData } from 'src/components/signature';
import {
  MobileInput,
  MobileButton,
  MobileSelect,
  MobileDatePicker,
  MobileTimePicker,
} from 'src/components/mobile';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const reportTypes = [
  { value: 'daily', label: 'Daily Report', icon: 'eva:calendar-fill', color: 'primary' },
  { value: 'weekly', label: 'Weekly Report', icon: 'eva:clock-fill', color: 'info' },
  { value: 'monthly', label: 'Monthly Report', icon: 'eva:calendar-outline', color: 'success' },
  {
    value: 'incident',
    label: 'Incident Report',
    icon: 'eva:alert-triangle-fill',
    color: 'warning',
  },
  {
    value: 'maintenance',
    label: 'Maintenance Report',
    icon: 'eva:settings-fill',
    color: 'secondary',
  },
  { value: 'inspection', label: 'Inspection Report', icon: 'eva:search-fill', color: 'info' },
  {
    value: 'completion',
    label: 'Completion Report',
    icon: 'eva:checkmark-circle-fill',
    color: 'success',
  },
  { value: 'safety', label: 'Safety Report', icon: 'eva:shield-fill', color: 'error' },
];

interface ReportCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (report: IReport) => void;
  initialData?: Partial<CreateReportData>;
}

export function ReportCreateDrawer({
  open,
  onClose,
  onSuccess,
  initialData,
}: ReportCreateDrawerProps) {
  const theme = useTheme();
  const { user } = useAuthContext();

  // Form state
  const [formData, setFormData] = useState<CreateReportData>({
    title: initialData?.title || '',
    type: 'daily',
    location: '',
    weather: '',
    reportDate: new Date(),
    priority: 'medium',
    clientId: '',
    workOrderId: '',
    taskIds: [],
    customFields: {},
    ...(initialData || {}),
  });

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMaterials, setSelectedMaterials] = useState<any[]>([]);
  const [reportNotes, setReportNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [reportStatus, setReportStatus] = useState<'draft' | 'submitted'>('draft');
  const [previewUrls, setPreviewUrls] = useState<Map<number, string>>(new Map());

  // Data fetching
  const { data: clientsData, error: clientsError } = useSWR(
    endpoints.fsa.clients.list,
    async (url) => {
      console.log('Fetching clients from:', url);
      const response = await axiosInstance.get(url, { params: { limit: 100 } });
      console.log('Clients response:', response.data);
      return response.data;
    }
  );

  const { data: workOrdersData, error: workOrdersError } = useSWR(
    endpoints.fsa.workOrders.list,
    async (url) => {
      console.log('Fetching work orders from:', url);
      const response = await axiosInstance.get(url, { params: { limit: 100 } });
      console.log('Work orders response:', response.data);
      return response.data;
    }
  );

  // Fetch current user's personnel information
  const { data: personnelData, error: personnelError } = useSWR(
    endpoints.fsa.personnel.list,
    async (url) => {
      console.log('Fetching personnel list:', url);
      const response = await axiosInstance.get(url);
      console.log('Personnel response:', response.data);
      return response.data;
    }
  );

  const { data: tasksData, error: tasksError } = useSWR(endpoints.kanban, async (url) => {
    console.log('Fetching tasks from kanban:', url);
    const response = await axiosInstance.get(url);
    console.log('Kanban response:', response.data);
    return response.data;
  });

  const { data: materialsData } = useSWR(endpoints.fsa.materials.list, async (url) => {
    const response = await axiosInstance.get(url, { params: { limit: 100, active: true } });
    return response.data;
  });

  // Transform data for selects
  const clients = useMemo(() => {
    console.log('Clients Data:', clientsData);

    if (clientsError) {
      console.error('Clients Error:', clientsError);
      return [];
    }

    const data = clientsData?.data?.clients || clientsData?.data || clientsData?.clients || [];
    return Array.isArray(data)
      ? data.map((client: any) => ({
          value: client._id || client.id,
          label: client.name + (client.company ? ` (${client.company})` : ''),
          client,
        }))
      : [];
  }, [clientsData, clientsError]);

  const workOrders = useMemo(() => {
    console.log('Work Orders Raw Data:', workOrdersData);
    console.log('Work Orders Error:', workOrdersError);

    if (workOrdersError) {
      console.error('Work Orders Error:', workOrdersError);
      return [];
    }

    if (!workOrdersData) return [];

    // Try multiple possible data structures
    let ordersArray = [];

    if (Array.isArray(workOrdersData)) {
      ordersArray = workOrdersData;
    } else if (Array.isArray(workOrdersData.data)) {
      ordersArray = workOrdersData.data;
    } else if (workOrdersData.data?.workOrders && Array.isArray(workOrdersData.data.workOrders)) {
      ordersArray = workOrdersData.data.workOrders;
    } else if (workOrdersData.workOrders && Array.isArray(workOrdersData.workOrders)) {
      ordersArray = workOrdersData.workOrders;
    }

    console.log('Work Orders Array:', ordersArray);

    return ordersArray.map((workOrder: any) => ({
      value: workOrder._id || workOrder.id,
      label: `${workOrder.number || workOrder.id || 'WO-' + (workOrder._id || workOrder.id)?.slice(-4)} - ${workOrder.title || workOrder.name || 'Untitled'}`,
      workOrder,
    }));
  }, [workOrdersData, workOrdersError]);

  const allTasks = useMemo(() => {
    console.log('Kanban Data:', tasksData);
    console.log('Kanban Error:', tasksError);
    console.log('Personnel Data:', personnelData);
    console.log('Personnel Error:', personnelError);

    if (tasksError) {
      console.error('Kanban Error:', tasksError);
      return [];
    }

    if (!tasksData) return [];

    let tasksArray = [];

    // Handle kanban structure - data is nested under data.board
    const board = tasksData.data?.board || tasksData.board;
    console.log('Board data:', board);

    if (board?.tasks && Array.isArray(board.tasks)) {
      console.log('Processing kanban tasks:', board.tasks.length);

      tasksArray = board.tasks.map((task: any) => ({
        value: task.id || task._id,
        label: task.name || task.title || `Task ${task.id || task._id}`,
        task,
        clientId: task.clientId,
        columnId: task.columnId,
        assignees: task.assignee?.map((a: any) => a.id) || [],
      }));

      // Remove duplicates based on task value
      const uniqueTasks = new Map();
      tasksArray.forEach((task: any) => {
        if (!uniqueTasks.has(task.value)) {
          uniqueTasks.set(task.value, task);
        }
      });
      tasksArray = Array.from(uniqueTasks.values());

      // Ensure unique labels by adding suffix if needed
      const labelCounts = new Map();
      tasksArray = tasksArray.map((task) => {
        const baseLabel = task.label;
        const count = labelCounts.get(baseLabel) || 0;
        labelCounts.set(baseLabel, count + 1);

        if (count > 0) {
          return {
            ...task,
            label: `${baseLabel} (${count + 1})`,
          };
        }
        return task;
      });
    }

    console.log('All Tasks Processed:', tasksArray.length, 'tasks');
    console.log('Sample task structure:', tasksArray[0]);

    // Debug: Check for duplicate labels
    const labels = tasksArray.map((task) => task.label);
    const uniqueLabels = new Set(labels);
    if (labels.length !== uniqueLabels.size) {
      console.warn(
        'Duplicate task labels found:',
        labels.filter((label, index) => labels.indexOf(label) !== index)
      );
    }

    return tasksArray;
  }, [tasksData, tasksError, personnelData, personnelError]);

  // Filter tasks based on user assignment and selected client
  const tasks = useMemo(() => {
    console.log('=== TASK FILTERING ===');
    console.log('Selected Client ID:', formData.clientId);
    console.log('All Tasks Count:', allTasks.length);
    console.log('Personnel Data:', personnelData);
    console.log('All Tasks Sample:', allTasks.slice(0, 3));

    // Get current user's personnel ID from the personnel list
    const currentUserId = user?._id;
    const currentPersonnel = personnelData?.data?.find((p: any) => p.user?._id === currentUserId);
    const currentPersonnelId = currentPersonnel?._id;
    console.log('Current User ID:', currentUserId);
    console.log('Current Personnel ID:', currentPersonnelId);

    // Show all unique client IDs in tasks for debugging
    const taskClientIds = [...new Set(allTasks.map((task) => task.clientId))];
    console.log('Unique Client IDs in tasks:', taskClientIds);

    // For now, let's be more permissive and show all tasks if no personnel data
    // or if the user has no assigned tasks, to help with debugging
    let userAssignedTasks = allTasks;
    if (currentPersonnelId) {
      userAssignedTasks = allTasks.filter((task) => {
        const isAssigned = task.assignees && task.assignees.includes(currentPersonnelId);
        if (allTasks.length < 10) {
          // Only log individual matches if there aren't too many tasks
          console.log(
            `Task "${task.label}" assignees: [${task.assignees?.join(', ')}] includes "${currentPersonnelId}": ${isAssigned}`
          );
        }
        return isAssigned;
      });
      console.log('User Assigned Tasks Count:', userAssignedTasks.length);

      // If no assigned tasks found, show all tasks for debugging
      if (userAssignedTasks.length === 0) {
        console.log('No assigned tasks found, showing all tasks for debugging');
        userAssignedTasks = allTasks;
      }
    } else {
      console.log('No personnel data available, showing all tasks');
    }

    // Then filter by selected client (if a client is selected)
    if (!formData.clientId) {
      console.log('No client selected, returning user assigned tasks');
      return userAssignedTasks;
    }

    const filteredTasks = userAssignedTasks.filter((task) => {
      const matches = task.clientId === formData.clientId;
      if (userAssignedTasks.length < 10) {
        // Only log individual matches if there aren't too many tasks
        console.log(
          `Task "${task.label}" clientId: "${task.clientId}" matches "${formData.clientId}": ${matches}`
        );
      }
      return matches;
    });

    console.log('Final Filtered Tasks Count:', filteredTasks.length);
    console.log('Final Filtered Tasks:', filteredTasks);

    return filteredTasks;
  }, [allTasks, formData.clientId, personnelData, user]);

  const materials = useMemo(() => {
    console.log('Materials Data:', materialsData);
    const data = materialsData?.data?.materials || materialsData?.data || materialsData?.materials;
    console.log('Materials Array:', data);

    if (!Array.isArray(data)) {
      console.log('Materials data is not an array:', data);
      return [];
    }

    const transformedMaterials = data.map((material: any) => ({
      value: material._id,
      label: `${material.name} - $${material.unitCost?.toFixed(2) || material.unitPrice?.toFixed(2) || '0.00'}/${material.unit || 'unit'}`,
      material,
    }));

    console.log('Transformed Materials:', transformedMaterials);
    return transformedMaterials;
  }, [materialsData]);

  // Auto-fill from client selection
  useEffect(() => {
    if (formData.clientId) {
      const selectedClient = clients.find((c) => c.value === formData.clientId)?.client;
      if (selectedClient && !formData.location) {
        // Ensure we get a string value for location
        const clientLocation =
          typeof selectedClient.address === 'string'
            ? selectedClient.address
            : typeof selectedClient.location === 'string'
              ? selectedClient.location
              : selectedClient.address?.street ||
                selectedClient.address?.full ||
                selectedClient.location?.street ||
                selectedClient.location?.full ||
                '';

        setFormData((prev) => ({
          ...prev,
          location: clientLocation,
        }));
      }
    }
  }, [formData.clientId, clients, formData.location]);

  // Auto-fill from work order selection
  useEffect(() => {
    if (formData.workOrderId) {
      const selectedWorkOrder = workOrders.find(
        (wo: any) => wo.value === formData.workOrderId
      )?.workOrder;
      if (selectedWorkOrder) {
        // Ensure we get a string value for location
        const workOrderLocation =
          typeof selectedWorkOrder.location === 'string'
            ? selectedWorkOrder.location
            : typeof selectedWorkOrder.address === 'string'
              ? selectedWorkOrder.address
              : selectedWorkOrder.location?.street ||
                selectedWorkOrder.location?.full ||
                selectedWorkOrder.address?.street ||
                selectedWorkOrder.address?.full ||
                '';

        setFormData((prev) => ({
          ...prev,
          clientId: selectedWorkOrder.clientId || prev.clientId,
          location: workOrderLocation || prev.location,
          priority: selectedWorkOrder.priority || prev.priority,
        }));
      }
    }
  }, [formData.workOrderId, workOrders]);

  // Auto-fill from task selection
  useEffect(() => {
    if (formData.taskIds?.[0]) {
      const selectedTask = allTasks.find((t) => t.value === formData.taskIds?.[0]);
      if (selectedTask) {
        // Ensure we get a string value for location
        const taskLocation =
          typeof selectedTask.task?.location === 'string'
            ? selectedTask.task.location
            : selectedTask.task?.location?.street || selectedTask.task?.location?.full || '';

        setFormData((prev) => ({
          ...prev,
          clientId: selectedTask.clientId || prev.clientId,
          location: taskLocation || prev.location,
          priority: selectedTask.task?.priority || prev.priority,
        }));
      }
    }
  }, [formData.taskIds, allTasks]);

  // Set report date with current time when drawer opens
  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        reportDate: new Date(), // Always set to current date/time
      }));
    }
  }, [open]);

  // Reset form when drawer opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setFormData({
        title: initialData?.title || '',
        type: 'daily',
        location: '',
        weather: '',
        reportDate: new Date(),
        priority: 'medium',
        clientId: '',
        workOrderId: '',
        taskIds: [],
        customFields: {},
        ...(initialData || {}),
      });
      setSelectedMaterials([]);
      setReportNotes('');
      setAttachments([]);
      setSignatures([]);
      setReportStatus('draft');
    }
  }, [open, initialData]);

  const handleFieldChange = useCallback((field: keyof CreateReportData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddMaterial = useCallback(
    (materialId: string) => {
      const material = materials.find((m) => m.value === materialId);
      if (material && !selectedMaterials.find((m) => m.value === materialId)) {
        setSelectedMaterials((prev) => [...prev, { ...material, quantity: 1 }]);
      }
    },
    [materials, selectedMaterials]
  );

  const handleRemoveMaterial = useCallback((materialId: string) => {
    setSelectedMaterials((prev) => prev.filter((m) => m.value !== materialId));
  }, []);

  const handleMaterialQuantityChange = useCallback((materialId: string, quantity: number) => {
    // Ensure quantity is between 0 and 100
    const validQuantity = Math.max(0, Math.min(100, quantity));
    setSelectedMaterials((prev) =>
      prev.map((m) => (m.value === materialId ? { ...m, quantity: validQuantity } : m))
    );
  }, []);

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (files) {
      setAttachments((prev) => [...prev, ...Array.from(files)]);
    }
  }, []);

  // Manage preview URLs for images
  useEffect(() => {
    const newPreviewUrls = new Map<number, string>();

    attachments.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newPreviewUrls.set(index, url);
      }
    });

    setPreviewUrls(newPreviewUrls);

    // Cleanup function to revoke URLs
    return () => {
      newPreviewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [attachments]);

  const handleRemoveFile = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Signature handlers
  const handleAddSignature = useCallback(
    (signatureData: Omit<SignatureData, 'id' | 'signedAt'>) => {
      const newSignature: SignatureData = {
        ...signatureData,
        id: `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        signedAt: new Date(),
      };
      setSignatures((prev) => [...prev, newSignature]);
      toast.success('Signature added successfully');
    },
    []
  );

  const handleRemoveSignature = useCallback((id: string) => {
    setSignatures((prev) => prev.filter((sig) => sig.id !== id));
    toast.success('Signature removed');
  }, []);

  const handleUpdateSignature = useCallback((id: string, updates: Partial<SignatureData>) => {
    setSignatures((prev) => prev.map((sig) => (sig.id === id ? { ...sig, ...updates } : sig)));
    toast.success('Signature updated');
  }, []);

  const handleCameraCapture = useCallback(() => {
    // Check if getUserMedia is supported (for desktop/laptop cameras)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Try to open camera directly
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          // Create a video element to show camera feed
          const video = document.createElement('video');
          video.srcObject = stream;
          video.style.width = '100%';
          video.style.height = 'auto';
          video.style.borderRadius = '8px';
          video.autoplay = true;
          video.muted = true;

          // Create a modal-like overlay
          const overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          overlay.style.display = 'flex';
          overlay.style.flexDirection = 'column';
          overlay.style.alignItems = 'center';
          overlay.style.justifyContent = 'center';
          overlay.style.zIndex = '9999';
          overlay.style.padding = '20px';

          // Create container for video and controls
          const container = document.createElement('div');
          container.style.backgroundColor = 'white';
          container.style.borderRadius = '12px';
          container.style.padding = '20px';
          container.style.maxWidth = '500px';
          container.style.width = '100%';
          container.style.position = 'relative';

          // Create controls
          const controls = document.createElement('div');
          controls.style.display = 'flex';
          controls.style.gap = '12px';
          controls.style.marginTop = '16px';
          controls.style.justifyContent = 'center';

          // Capture button
          const captureBtn = document.createElement('button');
          captureBtn.textContent = '📷 Capture Photo';
          captureBtn.style.padding = '12px 24px';
          captureBtn.style.backgroundColor = '#1976d2';
          captureBtn.style.color = 'white';
          captureBtn.style.border = 'none';
          captureBtn.style.borderRadius = '8px';
          captureBtn.style.cursor = 'pointer';
          captureBtn.style.fontSize = '16px';

          // Cancel button
          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = '❌ Cancel';
          cancelBtn.style.padding = '12px 24px';
          cancelBtn.style.backgroundColor = '#f44336';
          cancelBtn.style.color = 'white';
          cancelBtn.style.border = 'none';
          cancelBtn.style.borderRadius = '8px';
          cancelBtn.style.cursor = 'pointer';
          cancelBtn.style.fontSize = '16px';

          // Title
          const title = document.createElement('h3');
          title.textContent = 'Take Photo';
          title.style.margin = '0 0 16px 0';
          title.style.textAlign = 'center';
          title.style.color = '#333';

          // Instructions
          const instructions = document.createElement('p');
          instructions.textContent =
            'Position yourself in the camera view and click "Capture Photo"';
          instructions.style.margin = '0 0 16px 0';
          instructions.style.textAlign = 'center';
          instructions.style.color = '#666';
          instructions.style.fontSize = '14px';

          // Assemble the modal
          container.appendChild(title);
          container.appendChild(instructions);
          container.appendChild(video);
          controls.appendChild(captureBtn);
          controls.appendChild(cancelBtn);
          container.appendChild(controls);
          overlay.appendChild(container);
          document.body.appendChild(overlay);

          // Capture photo function
          const capturePhoto = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (context) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0);

              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    const file = new File([blob], `photo-${Date.now()}.jpg`, {
                      type: 'image/jpeg',
                    });
                    // Create a FileList-like object
                    const fileList = {
                      0: file,
                      length: 1,
                      item: (index: number) => (index === 0 ? file : null),
                      *[Symbol.iterator]() {
                        yield file;
                      },
                    } as FileList;
                    handleFileUpload(fileList);
                    toast.success('Photo captured successfully!');
                  }
                },
                'image/jpeg',
                0.8
              );
            }

            // Clean up
            stream.getTracks().forEach((track) => track.stop());
            document.body.removeChild(overlay);
          };

          // Cancel function
          const cancelCapture = () => {
            stream.getTracks().forEach((track) => track.stop());
            document.body.removeChild(overlay);
          };

          captureBtn.onclick = capturePhoto;
          cancelBtn.onclick = cancelCapture;

          // Close on overlay click
          overlay.onclick = (e) => {
            if (e.target === overlay) {
              cancelCapture();
            }
          };

          // Close on Escape key
          const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              cancelCapture();
              document.removeEventListener('keydown', handleEscape);
            }
          };
          document.addEventListener('keydown', handleEscape);
        })
        .catch((error) => {
          console.error('Error accessing camera:', error);
          toast.error(
            'Could not access camera. Please check permissions or try file upload instead.'
          );

          // Fallback to file input
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment';
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) handleFileUpload(files);
          };
          input.click();
        });
    } else {
      // Fallback for browsers that don't support getUserMedia
      toast.info('Camera not supported. Using file picker instead.');
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files) handleFileUpload(files);
      };
      input.click();
    }
  }, [handleFileUpload]);

  const validateStep = useCallback(
    (step: number) => {
      switch (step) {
        case 1:
          return !!(
            formData.type &&
            formData.clientId &&
            formData.location &&
            String(formData.location).trim()
          );
        case 2:
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

  const handleSubmit = useCallback(async () => {
    if (!validateStep(1)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Prepare the complete report data
      const reportData = {
        ...formData,
        status: reportStatus,
        notes: reportNotes,
        materialsUsed: selectedMaterials.map((m) => ({
          materialId: m.value,
          quantity: m.quantity,
          unitCost: m.material?.unitPrice || 0,
          totalCost: (m.material?.unitPrice || 0) * m.quantity,
        })),
        signatures: signatures.map((s) => ({
          type: s.type,
          signerName: s.signerName,
          signerTitle: s.signerTitle,
          signedAt: s.signedAt,
          signatureData: s.signatureData,
        })),
        // Files would be uploaded separately in a real implementation
        attachmentCount: attachments.length,
      };

      const response = await ReportService.createReport(reportData);
      if (response.success) {
        toast.success(
          reportStatus === 'draft' ? 'Report saved as draft' : 'Report submitted for review'
        );
        onSuccess(response.data);
        onClose();
      } else {
        toast.error(response.message || 'Failed to create report');
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
        toast.error('Failed to create report');
      }
    } finally {
      setLoading(false);
    }
  }, [
    formData,
    reportStatus,
    reportNotes,
    selectedMaterials,
    signatures,
    attachments,
    validateStep,
    onSuccess,
    onClose,
  ]);

  const renderHeader = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 3,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Create New Report
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Step {currentStep} of 3
        </Typography>
      </Box>
      <MobileButton
        variant="outline"
        size="small"
        onClick={onClose}
        icon={<Iconify icon="eva:close-fill" width={20} />}
      />
    </Box>
  );

  const renderStepIndicator = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, px: 3 }}>
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
            transition: 'all 0.3s ease',
          }}
        >
          {step}
        </Box>
      ))}
    </Box>
  );

  const renderStep1 = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, px: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
        Report Details
      </Typography>

      <MobileSelect
        label="Report Type *"
        value={formData.type}
        onChange={(value) => handleFieldChange('type', value)}
        options={reportTypes}
        required
      />

      <Box>
        <MobileDatePicker
          label="Report Date *"
          value={formData.reportDate ? dayjs(formData.reportDate) : dayjs()}
          onChange={(date) => {
            if (date) {
              const currentTime = formData.reportDate ? dayjs(formData.reportDate) : dayjs();
              const newDateTime = date
                .hour(currentTime.hour())
                .minute(currentTime.minute())
                .second(currentTime.second());
              handleFieldChange('reportDate', newDateTime.toDate());
            }
          }}
          required
          helperText="Date when the work was performed"
        />

        <MobileTimePicker
          label="Report Time *"
          value={formData.reportDate ? dayjs(formData.reportDate) : dayjs()}
          onChange={(time) => {
            if (time) {
              const currentDate = formData.reportDate ? dayjs(formData.reportDate) : dayjs();
              const newDateTime = currentDate
                .hour(time.hour())
                .minute(time.minute())
                .second(time.second());
              handleFieldChange('reportDate', newDateTime.toDate());
            }
          }}
          required
          helperText="Time when the work was performed"
        />
      </Box>

      <MobileSelect
        label="Client *"
        value={formData.clientId}
        onChange={(value) => handleFieldChange('clientId', value)}
        options={[{ value: '', label: 'Select Client...' }, ...clients]}
        helperText="Select the client for this report"
        required
      />

      <Autocomplete
        options={workOrders}
        getOptionLabel={(option) => option?.label || ''}
        value={workOrders.find((wo: any) => wo.value === formData.workOrderId) || null}
        onChange={(event, newValue) => {
          console.log('Work Order Selected:', newValue);
          handleFieldChange('workOrderId', newValue?.value || '');
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Work Order"
            placeholder="Type to search work orders..."
            helperText={`Optional: Link to a specific work order (${workOrders.length} available)`}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                '& .MuiInputBase-input': {
                  fontSize: '16px',
                  padding: '16px 14px',
                },
              },
            }}
          />
        )}
        filterOptions={(options, { inputValue }) => {
          if (!inputValue) return options;
          return options.filter(
            (option) =>
              option.label?.toLowerCase().includes(inputValue.toLowerCase()) ||
              option.workOrder?.number?.toLowerCase().includes(inputValue.toLowerCase()) ||
              option.workOrder?.title?.toLowerCase().includes(inputValue.toLowerCase())
          );
        }}
        noOptionsText={
          workOrdersError
            ? 'Error loading work orders'
            : !workOrdersData
              ? 'Loading work orders...'
              : workOrders.length === 0
                ? 'No work orders available'
                : 'No matching work orders found'
        }
        clearOnEscape
        openOnFocus
        freeSolo={false}
        blurOnSelect
        clearOnBlur
      />

      <Autocomplete
        options={tasks}
        getOptionLabel={(option) => option?.label || ''}
        getOptionKey={(option) => option?.value || option?.id || Math.random().toString()}
        isOptionEqualToValue={(option, value) => option?.value === value?.value}
        value={tasks.find((task) => task.value === formData.taskIds?.[0]) || null}
        onChange={(event, newValue) => {
          console.log('Task Selected:', newValue);
          handleFieldChange('taskIds', newValue ? [newValue.value] : []);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Task"
            placeholder="Type to search tasks..."
            helperText={
              !personnelData
                ? 'Loading tasks...'
                : formData.clientId
                  ? `Showing tasks for selected client (${tasks.length} available)`
                  : `Showing all tasks (${tasks.length} available) - select a client to filter further`
            }
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                '& .MuiInputBase-input': {
                  fontSize: '16px',
                  padding: '16px 14px',
                },
              },
            }}
          />
        )}
        filterOptions={(options, { inputValue }) => {
          if (!inputValue) return options;
          return options.filter(
            (option) =>
              option.label?.toLowerCase().includes(inputValue.toLowerCase()) ||
              option.task?.name?.toLowerCase().includes(inputValue.toLowerCase()) ||
              option.task?.title?.toLowerCase().includes(inputValue.toLowerCase())
          );
        }}
        noOptionsText={
          tasksError
            ? 'Error loading tasks'
            : !tasksData
              ? 'Loading tasks...'
              : allTasks.length === 0
                ? 'No tasks available'
                : tasks.length === 0
                  ? formData.clientId
                    ? 'No tasks found for this client'
                    : 'No tasks found'
                  : 'No matching tasks found'
        }
        clearOnEscape
        openOnFocus
        disabled={false}
        freeSolo={false}
        blurOnSelect
        clearOnBlur
      />

      <MobileInput
        label="Location *"
        value={formData.location}
        onChange={(e) => handleFieldChange('location', e.target.value)}
        placeholder="Work site address or location..."
        InputProps={{
          startAdornment: (
            <Iconify icon="eva:pin-fill" width={20} sx={{ mr: 1, color: 'action.active' }} />
          ),
        }}
        helperText="Auto-filled from client address when available"
        required
      />

      <MobileInput
        label="Weather Conditions"
        value={formData.weather}
        onChange={(e) => handleFieldChange('weather', e.target.value)}
        placeholder="Sunny, rainy, windy, temperature..."
        InputProps={{
          startAdornment: (
            <Iconify icon="eva:cloud-fill" width={20} sx={{ mr: 1, color: 'action.active' }} />
          ),
        }}
        helperText="Weather conditions during work (helpful for outdoor jobs)"
      />
    </Box>
  );

  const renderStep2 = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, px: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
        Materials & Documentation
      </Typography>

      {/* Materials Section */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Materials Used
        </Typography>

        <Autocomplete
          options={materials}
          getOptionLabel={(option) => option?.label || ''}
          value={null}
          onChange={(event, newValue) => {
            if (newValue) {
              handleAddMaterial(newValue.value);
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Add Material"
              placeholder="Search for materials..."
              helperText={`Select materials used in this report (${materials.length} available)`}
              fullWidth
              sx={{ mb: 2 }}
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'primary.light',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Iconify icon="solar:box-bold" width={20} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">{option.material?.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.material?.sku && `SKU: ${option.material.sku} • `}$
                    {option.material?.unitCost?.toFixed(2) || '0.00'} per{' '}
                    {option.material?.unit || 'unit'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
          filterOptions={(options, { inputValue }) => {
            if (!inputValue) return options;
            return options.filter(
              (option) =>
                option.material?.name?.toLowerCase().includes(inputValue.toLowerCase()) ||
                option.material?.sku?.toLowerCase().includes(inputValue.toLowerCase()) ||
                option.material?.category?.toLowerCase().includes(inputValue.toLowerCase())
            );
          }}
          noOptionsText={
            materials.length === 0 ? 'No materials available' : 'No matching materials found'
          }
          clearOnEscape
          openOnFocus
          freeSolo={false}
          blurOnSelect
          clearOnBlur
        />

        {selectedMaterials.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {selectedMaterials.map((material) => (
              <Box
                key={material.value}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'background.paper',
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {material.material?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${material.material?.unitPrice?.toFixed(2) || '0.00'} per{' '}
                    {material.material?.unit || 'unit'}
                  </Typography>
                </Box>

                <MobileInput
                  label="Qty"
                  type="number"
                  value={material.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === '' ||
                      (!isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100)
                    ) {
                      handleMaterialQuantityChange(material.value, Number(value) || 0);
                    }
                  }}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (value > 100) {
                      handleMaterialQuantityChange(material.value, 100);
                    } else if (value < 0) {
                      handleMaterialQuantityChange(material.value, 0);
                    }
                  }}
                  sx={{ width: 100 }}
                  inputProps={{ min: 0, max: 100, step: 1 }}
                  helperText="Max: 100"
                />

                <MobileButton
                  variant="outline"
                  size="small"
                  onClick={() => handleRemoveMaterial(material.value)}
                  icon={<Iconify icon="eva:trash-2-fill" width={16} />}
                  color="error"
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* File Upload Section */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Photos & Files
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <MobileButton
            variant="outline"
            startIcon={<Iconify icon="eva:camera-fill" width={16} />}
            onClick={handleCameraCapture}
            sx={{ flex: 1 }}
          >
            Take Photo
          </MobileButton>

          <MobileButton
            variant="outline"
            component="label"
            startIcon={<Iconify icon="eva:attach-fill" width={16} />}
            sx={{ flex: 1 }}
          >
            Upload Files
            <input
              type="file"
              hidden
              multiple
              accept="*/*"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </MobileButton>
        </Box>

        {attachments.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {attachments.map((file, index) => {
              const isImage = file.type.startsWith('image/');
              const previewUrl = previewUrls.get(index);

              return (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    backgroundColor: 'background.paper',
                    position: 'relative',
                  }}
                >
                  {/* Image Preview or File Icon */}
                  {isImage && previewUrl ? (
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 1,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={previewUrl}
                        alt={file.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'grey.100',
                        flexShrink: 0,
                      }}
                    >
                      <Iconify
                        icon={
                          file.type.startsWith('image/')
                            ? 'eva:image-fill'
                            : file.type.startsWith('video/')
                              ? 'eva:video-fill'
                              : file.type.includes('pdf')
                                ? 'eva:file-text-fill'
                                : 'eva:attach-fill'
                        }
                        width={24}
                        sx={{ color: 'text.secondary' }}
                      />
                    </Box>
                  )}

                  {/* File Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isImage
                        ? 'Image'
                        : file.type.startsWith('video/')
                          ? 'Video'
                          : file.type.includes('pdf')
                            ? 'PDF Document'
                            : 'File'}{' '}
                      • {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                    {isImage && (
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        📷 Captured photo
                      </Typography>
                    )}
                  </Box>

                  {/* Remove Button */}
                  <MobileButton
                    variant="outline"
                    size="small"
                    onClick={() => handleRemoveFile(index)}
                    icon={<Iconify icon="eva:close-fill" width={16} />}
                    sx={{
                      color: 'error.main',
                      '&:hover': {
                        backgroundColor: 'error.lighter',
                      },
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Notes Section */}
      <MobileInput
        label="Additional Notes"
        value={reportNotes}
        onChange={(e) => setReportNotes(e.target.value)}
        placeholder="Add any additional notes about the work performed..."
        multiline
        rows={4}
        helperText="Optional: Provide any additional context or observations"
      />
    </Box>
  );

  const renderStep3 = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, px: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
        Signatures & Status
      </Typography>

      {/* Report Status */}
      <MobileSelect
        label="Report Status *"
        value={reportStatus}
        onChange={(value) => setReportStatus(value)}
        options={[
          { value: 'draft', label: 'Save as Draft' },
          { value: 'submitted', label: 'Submit for Review' },
        ]}
        required
        helperText="Choose whether to save as draft or submit for approval"
      />

      {/* Digital Signatures */}
      <SignatureCollector
        signatures={signatures}
        onAddSignature={handleAddSignature}
        onRemoveSignature={handleRemoveSignature}
        onUpdateSignature={handleUpdateSignature}
        disabled={false}
      />

      {/* Summary */}
      <Box
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'primary.light',
          borderRadius: 1,
          backgroundColor: 'primary.lighter',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Report Summary
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • Type: {reportTypes.find((t) => t.value === formData.type)?.label}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • Client:{' '}
          {clients.find((c) => c.value === formData.clientId)?.client?.name || 'Not selected'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • Materials: {selectedMaterials.length} items
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • Files: {attachments.length} attachments
        </Typography>
        <Typography variant="body2">• Signatures: {signatures.length} collected</Typography>
      </Box>
    </Box>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  const renderActions = () => (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        p: 3,
        borderTop: 1,
        borderColor: 'divider',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {currentStep > 1 && (
        <MobileButton
          variant="outline"
          onClick={handlePrevious}
          startIcon={<Iconify icon="eva:arrow-left-fill" width={16} />}
        >
          Previous
        </MobileButton>
      )}

      <MobileButton variant="outline" onClick={onClose} sx={{ flex: currentStep === 1 ? 1 : 0 }}>
        Cancel
      </MobileButton>

      {currentStep < 3 ? (
        <MobileButton
          variant="primary"
          onClick={handleNext}
          disabled={!validateStep(currentStep)}
          endIcon={<Iconify icon="eva:arrow-right-fill" width={16} />}
          sx={{ flex: 1 }}
        >
          Next
        </MobileButton>
      ) : (
        <MobileButton
          variant="primary"
          onClick={handleSubmit}
          loading={loading}
          disabled={!validateStep(1)}
          startIcon={<Iconify icon="eva:save-fill" width={16} />}
          sx={{ flex: 1 }}
        >
          Create Report
        </MobileButton>
      )}
    </Box>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor="right"
      slotProps={{
        backdrop: { invisible: true },
        paper: {
          sx: {
            width: { xs: '100%', sm: 480 },
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {renderHeader()}
      {renderStepIndicator()}

      <Scrollbar fillContent sx={{ flex: 1, pb: 3 }}>
        {renderStepContent()}
      </Scrollbar>

      {renderActions()}
    </Drawer>
  );
}
