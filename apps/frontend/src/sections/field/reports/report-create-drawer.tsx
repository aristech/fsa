'use client';

import type { IReport, CreateReportData } from 'src/lib/models/Report';

import useSWR from 'swr';
import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { Box, Drawer, Button, useTheme, TextField, Typography, Autocomplete } from '@mui/material';

import axiosInstance, { endpoints } from 'src/lib/axios';
import { offlineStorage } from 'src/lib/offline-storage';
import { offlineSyncService } from 'src/lib/offline-sync';
import { ReportService } from 'src/lib/services/report-service';
import { getNetworkStatus, addNetworkStatusListener } from 'src/lib/network-utils';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { SignatureCollector, type SignatureData } from 'src/components/signature';
import { Form, RHFSelect, RHFTextField, RHFDateTimePicker } from 'src/components/hook-form';

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

// ----------------------------------------------------------------------

// Validation schema
const reportSchema = zod.object({
  type: zod.enum([
    'daily',
    'weekly',
    'monthly',
    'incident',
    'maintenance',
    'inspection',
    'completion',
    'safety',
  ]),
  reportDate: zod.union([zod.string(), zod.date()]),
  priority: zod.enum(['low', 'medium', 'high', 'urgent']).optional(),
  clientId: zod.string().min(1, 'Client is required'),
  workOrderId: zod.string().optional(),
  taskIds: zod.array(zod.string()).optional(),
  location: zod.string().min(1, 'Location is required'),
  weather: zod.string().optional(),
});

type ReportFormValues = zod.infer<typeof reportSchema>;

// ----------------------------------------------------------------------

interface ReportCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (report: IReport) => void;
  initialData?: Partial<CreateReportData> | (() => Partial<CreateReportData>);
}

export function ReportCreateDrawer({
  open,
  onClose,
  onSuccess,
  initialData,
}: ReportCreateDrawerProps) {
  const theme = useTheme();
  const { user } = useAuthContext();

  // Track if drawer was previously open to avoid unnecessary resets
  const prevOpenRef = useRef(false);

  // Form setup with React Hook Form
  const methods = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      type: 'daily',
      reportDate: new Date(),
      priority: 'medium',
      clientId: '',
      workOrderId: '',
      taskIds: [],
      location: '',
      weather: '',
    },
  });

  const { reset, handleSubmit, watch, setValue } = methods;

  // Additional state (not in form)
  const [currentStep, setCurrentStep] = useState(1);

  // Debug: Track currentStep changes

  const [selectedMaterials, setSelectedMaterials] = useState<any[]>([]);
  const [reportNotes, setReportNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Map<number, string>>(new Map());
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Watch form values for auto-fill
  const watchedClientId = watch('clientId');
  const watchedWorkOrderId = watch('workOrderId');
  const watchedTaskIds = watch('taskIds');

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

  // Data fetching
  const { data: clientsData, error: clientsError } = useSWR(
    endpoints.fsa.clients.list,
    async (url) => {
      const response = await axiosInstance.get(url, { params: { limit: 100 } });
      return response.data;
    }
  );

  const { data: workOrdersData, error: workOrdersError } = useSWR(
    endpoints.fsa.workOrders.list,
    async (url) => {
      const response = await axiosInstance.get(url, { params: { limit: 100 } });
      return response.data;
    }
  );

  // Fetch current user's personnel information
  const { data: personnelData } = useSWR(endpoints.fsa.personnel.list, async (url) => {
    const response = await axiosInstance.get(url);
    return response.data;
  });

  const { data: tasksData, error: tasksError } = useSWR(endpoints.kanban, async (url) => {
    const response = await axiosInstance.get(url);
    return response.data;
  });

  const { data: materialsData } = useSWR(endpoints.fsa.materials.list, async (url) => {
    const response = await axiosInstance.get(url, { params: { limit: 100, active: true } });
    return response.data;
  });

  // Transform data for selects
  const clients = useMemo(() => {
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

    return ordersArray.map((workOrder: any) => ({
      value: workOrder._id || workOrder.id,
      label: `${workOrder.number || workOrder.id || 'WO-' + (workOrder._id || workOrder.id)?.slice(-4)} - ${workOrder.title || workOrder.name || 'Untitled'}`,
      workOrder,
    }));
  }, [workOrdersData, workOrdersError]);

  const allTasks = useMemo(() => {
    if (tasksError) {
      console.error('Kanban Error:', tasksError);
      return [];
    }

    if (!tasksData) return [];

    let tasksArray = [];

    // Handle kanban structure - data is nested under data.board
    const board = tasksData.data?.board || tasksData.board;
    if (board?.tasks && Array.isArray(board.tasks)) {
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
  }, [tasksData, tasksError]);

  // Filter tasks based on user assignment and selected client
  const tasks = useMemo(() => {
    // Get current user's personnel ID from the personnel list
    const currentUserId = user?._id;
    const currentPersonnel = personnelData?.data?.find((p: any) => p.user?._id === currentUserId);
    const currentPersonnelId = currentPersonnel?._id;

    // For now, let's be more permissive and show all tasks if no personnel data
    // or if the user has no assigned tasks, to help with debugging
    let userAssignedTasks = allTasks;
    if (currentPersonnelId) {
      userAssignedTasks = allTasks.filter((task) => {
        const isAssigned = task.assignees && task.assignees.includes(currentPersonnelId);
        if (allTasks.length < 10) {
          // Only log individual matches if there aren't too many tasks
        }
        return isAssigned;
      });
      // If no assigned tasks found, show all tasks for debugging
      if (userAssignedTasks.length === 0) {
        userAssignedTasks = allTasks;
      }
    }

    // Then filter by selected client (if a client is selected)
    if (!watchedClientId) {
      return userAssignedTasks;
    }

    const filteredTasks = userAssignedTasks.filter((task) => {
      const matches = task.clientId === watchedClientId;
      return matches;
    });

    return filteredTasks;
  }, [allTasks, watchedClientId, personnelData, user]);

  const materials = useMemo(() => {
    const data = materialsData?.data?.materials || materialsData?.data || materialsData?.materials;

    if (!Array.isArray(data)) {
      return [];
    }

    const transformedMaterials = data.map((material: any) => ({
      value: material._id,
      label: `${material.name} - ${material.unitCost?.toFixed(2) || material.unitPrice?.toFixed(2) || '0.00'}€/${material.unit || 'unit'}`,
      material,
    }));

    return transformedMaterials;
  }, [materialsData]);

  // Auto-fill from client selection
  useEffect(() => {
    if (watchedClientId) {
      const selectedClient = clients.find((c) => c.value === watchedClientId)?.client;
      if (selectedClient && !watch('location')) {
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

        if (clientLocation) {
          setValue('location', clientLocation);
        }
      }
    }
  }, [watchedClientId, clients, watch, setValue]);

  // Auto-fill from work order selection
  useEffect(() => {
    if (watchedWorkOrderId) {
      const selectedWorkOrder = workOrders.find(
        (wo: any) => wo.value === watchedWorkOrderId
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

        // Extract client ID from work order - check multiple possible locations
        let workOrderClientId =
          selectedWorkOrder.clientId ||
          selectedWorkOrder.client?._id ||
          selectedWorkOrder.client?.id;

        // Handle case where clientId is an object (populated client data)
        if (workOrderClientId && typeof workOrderClientId === 'object' && workOrderClientId._id) {
          workOrderClientId = workOrderClientId._id;
        }

        const newClientId =
          workOrderClientId &&
          typeof workOrderClientId === 'string' &&
          workOrderClientId.trim() !== ''
            ? workOrderClientId
            : watchedClientId; // Keep current client if work order doesn't have one

        // Only update clientId if work order has a valid clientId, otherwise preserve existing selection
        if (newClientId) setValue('clientId', newClientId);
        if (workOrderLocation) setValue('location', workOrderLocation);
        if (selectedWorkOrder.priority) setValue('priority', selectedWorkOrder.priority);
      }
    }
  }, [watchedWorkOrderId, watchedClientId, workOrders, setValue]);

  // Auto-fill from task selection
  useEffect(() => {
    if (watchedTaskIds?.[0]) {
      const selectedTask = allTasks.find((t) => t.value === watchedTaskIds?.[0]);
      if (selectedTask) {
        // Ensure we get a string value for location
        const taskLocation =
          typeof selectedTask.task?.location === 'string'
            ? selectedTask.task.location
            : selectedTask.task?.location?.street || selectedTask.task?.location?.full || '';

        // Check if task has a work order ID
        const taskWorkOrderId =
          selectedTask.task?.workOrderId ||
          selectedTask.task?.workOrder?._id ||
          selectedTask.task?.workOrder?.id;

        // Only update clientId if task has a valid clientId, otherwise preserve existing selection
        if (
          selectedTask.clientId &&
          typeof selectedTask.clientId === 'string' &&
          selectedTask.clientId.trim() !== ''
        ) {
          setValue('clientId', selectedTask.clientId);
        }
        // Auto-populate work order if task has one, otherwise preserve existing selection
        if (
          taskWorkOrderId &&
          typeof taskWorkOrderId === 'string' &&
          taskWorkOrderId.trim() !== ''
        ) {
          setValue('workOrderId', taskWorkOrderId);
        }
        if (taskLocation) setValue('location', taskLocation);
        if (selectedTask.task?.priority) setValue('priority', selectedTask.task.priority);
      }
    }
  }, [watchedTaskIds, allTasks, setValue]);

  // Auto-populate materials from selected task
  useEffect(() => {
    const fetchTaskMaterials = async () => {
      if (watchedTaskIds?.[0]) {
        if (materials.length === 0) {
          return;
        }
        try {
          const taskId = watchedTaskIds[0];
          const response = await axiosInstance.get(endpoints.fsa.tasks.materials.list(taskId));
          const taskMaterials = response.data?.data || response.data || [];

          if (Array.isArray(taskMaterials) && taskMaterials.length > 0) {
            // Map task materials to the format expected by selectedMaterials
            const materialsToAdd = taskMaterials
              .map((taskMaterial: any) => {
                // Try different possible material ID fields
                const possibleIds = [
                  taskMaterial.materialId,
                  taskMaterial._id,
                  taskMaterial.id,
                  taskMaterial.material?._id,
                  taskMaterial.material?.id,
                ].filter(Boolean);

                // Find the material in our materials list
                const materialInfo = materials.find((m) =>
                  possibleIds.some((id) => m.value === id)
                );

                if (materialInfo) {
                  return {
                    ...materialInfo,
                    quantity: taskMaterial.quantity || taskMaterial.plannedQuantity || 1,
                  };
                }
                return null;
              })
              .filter(Boolean);

            // Only set if we haven't already populated materials (avoid overriding manual selections)
            setSelectedMaterials((prev) => {
              if (prev.length === 0 && materialsToAdd.length > 0) {
                return materialsToAdd;
              }
              return prev;
            });
          }
        } catch (error) {
          console.error('Error fetching task materials:', error);

          // Fallback: check if the task itself has materials embedded
          const selectedTask = allTasks.find((t) => t.value === watchedTaskIds?.[0]);
          if (selectedTask?.task?.materials) {
            const embeddedMaterials = Array.isArray(selectedTask.task.materials)
              ? selectedTask.task.materials
              : [];

            const materialsToAdd = embeddedMaterials
              .map((taskMaterial: any) => {
                const possibleIds = [
                  taskMaterial.materialId,
                  taskMaterial._id,
                  taskMaterial.id,
                  taskMaterial.material?._id,
                  taskMaterial.material?.id,
                ].filter(Boolean);

                const materialInfo = materials.find((m) =>
                  possibleIds.some((id) => m.value === id)
                );

                if (materialInfo) {
                  return {
                    ...materialInfo,
                    quantity: taskMaterial.quantity || taskMaterial.plannedQuantity || 1,
                  };
                }
                return null;
              })
              .filter(Boolean);

            if (materialsToAdd.length > 0) {
              setSelectedMaterials((prev) => (prev.length === 0 ? materialsToAdd : prev));
            }
          }
        }
      }
    };

    fetchTaskMaterials();
  }, [watchedTaskIds, materials, allTasks]);

  // Report date is now set in the reset() call below - no need for separate effect

  // Reset form when drawer opens (transitions from closed to open only)
  useEffect(() => {
    // Only reset when transitioning from closed to open
    if (open && !prevOpenRef.current) {
      const initial = initialData
        ? typeof initialData === 'function'
          ? initialData()
          : initialData
        : {};

      reset({
        type: 'daily',
        reportDate: new Date(),
        priority: 'medium',
        clientId: '',
        workOrderId: '',
        taskIds: [],
        location: '',
        weather: '',
        ...initial,
      });
      setCurrentStep(1);
      setSelectedMaterials([]);
      setReportNotes('');
      setAttachments([]);
      setSignatures([]);
    }

    // Update the ref to track current open state
    prevOpenRef.current = open;
  }, [open, initialData, reset]);

  // No longer need handleFieldChange with RHF - form state is managed by react-hook-form

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
      // Store current step to preserve it during file upload

      const fileArray = Array.from(files);

      // Validate file sizes (limit to 10MB per file)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validFiles = fileArray.filter((file) => {
        if (file.size > maxSize) {
          toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        // Just add files directly without any animation frame tricks
        setAttachments((prev) => [...prev, ...validFiles]);
      }
    }
  }, []);

  // Manage preview URLs for images
  useEffect(() => {
    const newPreviewUrls = new Map<number, string>();

    // Process files asynchronously to avoid blocking UI
    const processFiles = async () => {
      for (let index = 0; index < attachments.length; index++) {
        const file = attachments[index];
        if (file.type.startsWith('image/')) {
          // Use requestIdleCallback or setTimeout to yield control back to the browser
          await new Promise((resolve) => {
            if (window.requestIdleCallback) {
              window.requestIdleCallback(() => {
                const url = URL.createObjectURL(file);
                newPreviewUrls.set(index, url);
                resolve(undefined);
              });
            } else {
              setTimeout(() => {
                const url = URL.createObjectURL(file);
                newPreviewUrls.set(index, url);
                resolve(undefined);
              }, 0);
            }
          });
        }
      }
      setPreviewUrls(new Map(newPreviewUrls));
    };

    processFiles();

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

  // Get initial form data for signature collection
  const getInitialSignatureFormData = useCallback(
    (type: SignatureData['type']) => {
      if (type === 'technician' && user) {
        return {
          type: 'technician' as const,
          signerName: `${user.firstName} ${user.lastName}`,
          signerTitle: user.role || 'Technician',
          signerEmail: user.email,
        };
      }

      if (type === 'client' && watchedClientId && clientsData?.data?.clients) {
        const selectedClient = clientsData.data.clients.find(
          (client: any) => client._id === watchedClientId
        );

        if (selectedClient?.contactPerson?.name) {
          return {
            type: 'client' as const,
            signerName: selectedClient.contactPerson.name,
            signerTitle: 'Client Representative',
            signerEmail: selectedClient.contactPerson.email || selectedClient.email || '',
          };
        }
      }

      return undefined;
    },
    [user, watchedClientId, clientsData]
  );

  const handleCameraCapture = useCallback(() => {
    // Check if getUserMedia is supported (for desktop/laptop cameras)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // State for camera and flash (using let to allow reassignment)
      let currentStream: MediaStream | null = null;
      let currentFacingMode: 'user' | 'environment' = 'environment'; // Default to rear camera
      let flashEnabled = false;
      let videoTrack: MediaStreamTrack | null = null;
      let imageCapture: any = null; // For Samsung devices that support ImageCapture API

      // Function to start camera with specific facing mode
      const startCamera = async (facingMode: 'user' | 'environment') => {
        // Stop previous stream if exists
        if (currentStream) {
          currentStream.getTracks().forEach((track) => track.stop());
        }

        try {
          // Request camera with torch capability for better mobile support
          const constraints: MediaStreamConstraints = {
            video: {
              facingMode: { ideal: facingMode },
              // @ts-expect-error - torch is not in official types but supported by some browsers
              advanced: [{ torch: true }],
            },
          };

          try {
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch {
            // If torch constraint fails, try without it
            currentStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: facingMode } },
            });
          }

          // Get the video track for flash control
          const tracks = currentStream.getVideoTracks();
          if (tracks.length > 0) {
            videoTrack = tracks[0];

            // Initialize ImageCapture for Samsung devices

            if (typeof ImageCapture !== 'undefined') {
              try {
                imageCapture = new ImageCapture(videoTrack);
              } catch (err) {
                console.log('ImageCapture not available:', err);
              }
            }
          }

          return currentStream;
        } catch (error) {
          console.error('Error accessing camera:', error);
          // Fallback to basic video if specific facing mode fails
          currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const tracks = currentStream.getVideoTracks();
          if (tracks.length > 0) {
            videoTrack = tracks[0];

            // Initialize ImageCapture for Samsung devices
            if (typeof ImageCapture !== 'undefined') {
              try {
                imageCapture = new ImageCapture(videoTrack);
              } catch (err) {
                console.log('ImageCapture not available:', err);
              }
            }
          }
          return currentStream;
        }
      };

      // Start with rear camera
      startCamera(currentFacingMode)
        .then((stream) => {
          // Create a video element to show camera feed
          const video = document.createElement('video');
          video.srcObject = stream;
          video.style.width = '100%';
          video.style.maxWidth = '100%';
          video.style.height = 'auto';
          video.style.borderRadius = '8px';
          video.autoplay = true;
          video.muted = true;
          video.setAttribute('playsinline', 'true'); // Important for iOS

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
          overlay.style.padding = '16px';
          overlay.style.overflowY = 'auto';

          // Create container for video and controls
          const container = document.createElement('div');
          container.style.backgroundColor = 'white';
          container.style.borderRadius = '12px';
          container.style.padding = '16px';
          container.style.maxWidth = '500px';
          container.style.width = '100%';
          container.style.position = 'relative';
          container.style.boxSizing = 'border-box';

          // Create controls
          const controls = document.createElement('div');
          controls.style.display = 'flex';
          controls.style.gap = '8px';
          controls.style.marginTop = '12px';
          controls.style.justifyContent = 'center';
          controls.style.flexWrap = 'wrap';

          // Capture button
          const captureBtn = document.createElement('button');
          captureBtn.textContent = 'Capture Photo';
          captureBtn.style.padding = '12px 20px';
          captureBtn.style.backgroundColor = '#1976d2';
          captureBtn.style.color = 'white';
          captureBtn.style.border = 'none';
          captureBtn.style.borderRadius = '8px';
          captureBtn.style.cursor = 'pointer';
          captureBtn.style.fontSize = '14px';
          captureBtn.style.flex = '1 1 auto';
          captureBtn.style.minWidth = '120px';
          captureBtn.style.whiteSpace = 'nowrap';

          // Cancel button
          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = 'Cancel';
          cancelBtn.style.padding = '12px 20px';
          cancelBtn.style.backgroundColor = '#f44336';
          cancelBtn.style.color = 'white';
          cancelBtn.style.border = 'none';
          cancelBtn.style.borderRadius = '8px';
          cancelBtn.style.cursor = 'pointer';
          cancelBtn.style.fontSize = '14px';
          cancelBtn.style.flex = '1 1 auto';
          cancelBtn.style.minWidth = '100px';

          // Switch camera button
          const switchCameraBtn = document.createElement('button');
          switchCameraBtn.textContent = '🔄';
          switchCameraBtn.title = 'Switch Camera';
          switchCameraBtn.style.padding = '12px 16px';
          switchCameraBtn.style.backgroundColor = '#9c27b0';
          switchCameraBtn.style.color = 'white';
          switchCameraBtn.style.border = 'none';
          switchCameraBtn.style.borderRadius = '8px';
          switchCameraBtn.style.cursor = 'pointer';
          switchCameraBtn.style.fontSize = '18px';
          switchCameraBtn.style.minWidth = '48px';

          // Flash/torch button
          const flashBtn = document.createElement('button');
          flashBtn.textContent = '🔦';
          flashBtn.title = 'Toggle Flash';
          flashBtn.style.padding = '12px 16px';
          flashBtn.style.backgroundColor = '#ff9800';
          flashBtn.style.color = 'white';
          flashBtn.style.border = 'none';
          flashBtn.style.borderRadius = '8px';
          flashBtn.style.cursor = 'pointer';
          flashBtn.style.fontSize = '18px';
          flashBtn.style.opacity = '0.5';
          flashBtn.style.minWidth = '48px';

          // Title
          const title = document.createElement('h3');
          title.textContent = 'Take Photo';
          title.style.margin = '0 0 12px 0';
          title.style.textAlign = 'center';
          title.style.color = '#333';
          title.style.fontSize = '18px';

          // Instructions
          const instructions = document.createElement('p');
          instructions.textContent =
            'Use 🔄 to switch cameras, 🔦 for flash, then click "Capture Photo"';
          instructions.style.margin = '0 0 12px 0';
          instructions.style.textAlign = 'center';
          instructions.style.color = '#666';
          instructions.style.fontSize = '13px';

          // Assemble the modal
          container.appendChild(title);
          container.appendChild(instructions);
          container.appendChild(video);
          controls.appendChild(switchCameraBtn);
          controls.appendChild(flashBtn);
          controls.appendChild(captureBtn);
          controls.appendChild(cancelBtn);
          container.appendChild(controls);
          overlay.appendChild(container);
          document.body.appendChild(overlay);

          // Switch camera handler
          const switchCamera = async () => {
            currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
            try {
              const newStream = await startCamera(currentFacingMode);
              video.srcObject = newStream;
              toast.info(`Switched to ${currentFacingMode === 'user' ? 'front' : 'rear'} camera`);
            } catch (error) {
              console.error('Error switching camera:', error);
              toast.error('Failed to switch camera');
            }
          };

          // Toggle flash handler with Samsung device support
          const toggleFlash = async () => {
            if (!videoTrack) {
              toast.warning('Flash not available on this device');
              return;
            }

            try {
              flashEnabled = !flashEnabled;
              let success = false;

              // Method 1: Try ImageCapture API (works best on Samsung devices)
              if (imageCapture && !success) {
                try {
                  const photoCapabilities = await imageCapture.getPhotoCapabilities();
                  if (
                    photoCapabilities.fillLightMode &&
                    photoCapabilities.fillLightMode.includes('flash')
                  ) {
                    await imageCapture.track.applyConstraints({
                      advanced: [{ fillLightMode: flashEnabled ? 'flash' : 'off' }],
                    });
                    success = true;
                    console.log('Flash toggled using ImageCapture fillLightMode');
                  }
                } catch (err) {
                  console.log('ImageCapture fillLightMode failed:', err);
                }
              }

              // Method 2: Try torch constraint with advanced array (standard Android)
              if (!success) {
                try {
                  await videoTrack.applyConstraints({
                    // @ts-expect-error - torch is not in official types yet
                    advanced: [{ torch: flashEnabled }],
                  });
                  success = true;
                  console.log('Flash toggled using torch with advanced array');
                } catch (err) {
                  console.log('Torch with advanced array failed:', err);
                }
              }

              // Method 3: Try direct torch constraint (some devices)
              if (!success) {
                try {
                  // @ts-expect-error - torch is not in official types yet
                  await videoTrack.applyConstraints({ torch: flashEnabled });
                  success = true;
                  console.log('Flash toggled using direct torch constraint');
                } catch (err) {
                  console.log('Direct torch constraint failed:', err);
                }
              }

              // Method 4: Try fillLightMode directly on track (Samsung fallback)
              if (!success) {
                try {
                  await videoTrack.applyConstraints({
                    // @ts-expect-error - fillLightMode is not in official types
                    advanced: [{ fillLightMode: flashEnabled ? 'flash' : 'off' }],
                  });
                  success = true;
                  console.log('Flash toggled using fillLightMode on track');
                } catch (err) {
                  console.log('FillLightMode on track failed:', err);
                }
              }

              // Method 5: Try with whiteBalanceMode (some Samsung devices)
              if (!success) {
                try {
                  await videoTrack.applyConstraints({
                    // @ts-expect-error - custom constraint
                    advanced: [{ torch: flashEnabled, whiteBalanceMode: 'continuous' }],
                  });
                  success = true;
                  console.log('Flash toggled using torch with whiteBalanceMode');
                } catch (err) {
                  console.log('Torch with whiteBalanceMode failed:', err);
                }
              }

              if (success) {
                // Update button appearance if successful
                flashBtn.style.opacity = flashEnabled ? '1' : '0.5';
                toast.success(`Flash ${flashEnabled ? 'on' : 'off'}`);
              } else {
                // All methods failed
                throw new Error('All flash methods failed');
              }
            } catch (error) {
              console.error('Error toggling flash:', error);
              // Reset flash state if it failed
              flashEnabled = !flashEnabled;
              flashBtn.style.opacity = '0.5';

              // Check if it's a Samsung device
              const isSamsung = /samsung/i.test(navigator.userAgent);

              if (isSamsung) {
                toast.warning(
                  'Flash not available on this Samsung device. This is a known Samsung browser limitation. Try using Chrome browser or switching to the rear camera.',
                  { duration: 5000 }
                );
              } else {
                toast.warning(
                  'Flash not supported on this camera. Try switching to the rear camera or ensure camera permissions are granted.',
                  { duration: 4000 }
                );
              }
            }
          };

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
            if (currentStream) {
              currentStream.getTracks().forEach((track) => track.stop());
            }
            document.body.removeChild(overlay);
          };

          // Cancel function
          const cancelCapture = () => {
            if (currentStream) {
              currentStream.getTracks().forEach((track) => track.stop());
            }
            document.body.removeChild(overlay);
          };

          captureBtn.onclick = capturePhoto;
          cancelBtn.onclick = cancelCapture;
          switchCameraBtn.onclick = switchCamera;
          flashBtn.onclick = toggleFlash;

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
      const formValues = watch();
      const isValid = (() => {
        switch (step) {
          case 1: {
            const valid = !!(
              formValues.type &&
              formValues.clientId &&
              formValues.location &&
              String(formValues.location).trim()
            );
            return valid;
          }
          case 2:
          case 3:
            return true; // Optional fields
          default:
            return false;
        }
      })();
      return isValid;
    },
    [watch]
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
        // Convert files to base64 for offline storage
        const reportDataWithFiles = { ...reportData };

        if (attachments.length > 0) {
          const filePromises = attachments.map(
            async (file) =>
              new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                  resolve({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                    data: reader.result as string,
                  });
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
              })
          );

          const fileData = await Promise.all(filePromises);
          reportDataWithFiles.attachments = fileData.filter(Boolean);
        }

        // Save to offline storage
        const draftId = offlineStorage.saveDraft(
          reportDataWithFiles,
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
              // TODO: Navigate to drafts view
            },
          },
        });

        onSuccess({ _id: draftId, ...reportDataWithFiles, isOfflineDraft: true });
        onClose();
      } catch (error) {
        console.error('Failed to save offline draft:', error);
        toast.error('Failed to save draft locally. Please try again.');
        throw error;
      }
    },
    [attachments, user, isOffline, onSuccess, onClose]
  );

  // Helper function to handle file uploads
  const handleFileUploads = useCallback(
    async (reportId: string) => {
      let allAttachments: any[] = [];

      // Upload regular attachments first
      if (attachments.length > 0 && reportId) {
        try {
          const form = new FormData();
          form.append('scope', 'report');
          form.append('reportId', reportId);
          attachments.forEach((file: File) => {
            form.append('files', file);
          });

          const uploadResponse = await axiosInstance.post('/api/v1/uploads', form, {
            headers: {
              'Content-Type': undefined, // Let browser set multipart boundary
            },
          });

          const uploadedFiles = uploadResponse.data?.data || [];
          const userId = user?._id;

          const attachmentData = uploadedFiles.map((f: any) => ({
            filename: f.name || 'Unknown',
            originalName: f.name || 'Unknown',
            mimetype: f.mime || 'application/octet-stream',
            size: f.size || 0,
            url: f.url,
            uploadedAt: new Date(),
            uploadedBy: userId,
            // Add embedded user data for historical purposes
            uploadedByData: userId
              ? {
                  _id: userId,
                  name:
                    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                    user.email ||
                    'Unknown User',
                  email: user.email || '',
                }
              : null,
          }));

          allAttachments = [...allAttachments, ...attachmentData];
        } catch (uploadError) {
          console.error('Attachment upload failed:', uploadError);
          toast.warning('Report saved, but attachment upload failed.');
        }
      }

      // Upload signatures as files
      if (signatures.length > 0 && reportId) {
        try {
          const form = new FormData();
          form.append('scope', 'report');
          form.append('reportId', reportId);

          // Convert base64 signatures to files
          signatures.forEach((signature, index) => {
            if (signature.signatureData) {
              // Remove data:image/png;base64, prefix if present
              const base64Data = signature.signatureData.replace(/^data:image\/[a-z]+;base64,/, '');
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'image/png' });
              const fileName = `signature-${signature.type}-${signature.signerName.replace(/\s+/g, '-')}-${index}.png`;
              const file = new File([blob], fileName, { type: 'image/png' });
              form.append('files', file);
            }
          });

          const uploadResponse = await axiosInstance.post('/api/v1/uploads', form, {
            headers: {
              'Content-Type': undefined, // Let browser set multipart boundary
            },
          });

          const uploadedFiles = uploadResponse.data?.data || [];
          const userId = user?._id;

          // Map uploaded signature files back to signature data
          const signatureAttachments = uploadedFiles.map((f: any, index: number) => ({
            filename: f.name || 'Unknown',
            originalName: f.name || 'Unknown',
            mimetype: f.mime || 'image/png',
            size: f.size || 0,
            url: f.url,
            uploadedAt: new Date(),
            uploadedBy: userId,
            signatureType: signatures[index]?.type,
            signerName: signatures[index]?.signerName,
            // Add embedded user data for historical purposes
            uploadedByData: userId
              ? {
                  _id: userId,
                  name:
                    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                    user.email ||
                    'Unknown User',
                  email: user.email || '',
                }
              : null,
          }));

          allAttachments = [...allAttachments, ...signatureAttachments];
        } catch (uploadError) {
          console.error('Signature upload failed:', uploadError);
          toast.warning('Report saved, but signature upload failed.');
        }
      }

      // Update report with all attachments at once
      if (allAttachments.length > 0) {
        try {
          await ReportService.updateReport(reportId, {
            attachments: allAttachments,
          });
        } catch (updateError) {
          console.error('Failed to update report with attachments:', updateError);
          toast.warning('Files uploaded but failed to update report.');
        }
      }
    },
    [attachments, signatures, user]
  );

  // React Hook Form submit handler
  const onFormSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true);

    // Determine status: 'submitted' if online, 'draft' if offline
    const reportStatus = isOffline ? 'draft' : 'submitted';

    // Prepare the complete report data
    const reportData = {
      ...data,
      // Ensure reportDate is a Date object
      reportDate: data.reportDate ? new Date(data.reportDate) : new Date(),
      status: reportStatus,
      notes: reportNotes,
      materialsUsed: selectedMaterials.map((m) => ({
        materialId: m.value,
        material: {
          name: m.material?.name || m.label || 'Unknown Material',
          sku: m.material?.sku || '',
          unit: m.material?.unit || 'each',
          unitCostAtTime: m.material?.unitPrice || m.material?.unitCost || 0,
        },
        quantityUsed: m.quantity,
        unitCost: m.material?.unitPrice || m.material?.unitCost || 0,
        totalCost: (m.material?.unitPrice || m.material?.unitCost || 0) * m.quantity,
      })),
      signatures: signatures.map((s) => ({
        type: s.type,
        signerName: s.signerName,
        signerTitle: s.signerTitle,
        signerEmail: s.signerEmail,
        signedAt: s.signedAt,
        signatureData: s.signatureData,
      })),
      // Don't include attachments in the initial report creation
      // They will be uploaded separately after the report is created
      attachments: [],
    };

    try {
      // Always try to upload to server first (regardless of network status)
      try {
        const response = await ReportService.createReport(reportData);
        if (response.success) {
          const reportId = response.data._id;

          // Upload files and signatures after report creation
          await handleFileUploads(reportId);

          toast.success(
            isOffline
              ? 'Report saved locally and will sync when online'
              : 'Report submitted successfully'
          );
          onSuccess(response.data);
          onClose();
          return;
        } else {
          throw new Error(response.message || 'Failed to create report');
        }
      } catch (serverError: any) {
        console.warn('Server save failed, saving locally:', serverError);

        // If server save fails, save locally as fallback
        await saveOfflineDraft(reportData);
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
      setIsSubmitting(false);
    }
  });

  // Wrapper to ALWAYS prevent implicit form submission (Enter key, etc.)
  const handleFormSubmit = useCallback((event?: React.BaseSyntheticEvent) => {
    // ALWAYS prevent default form submission
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Never allow implicit form submission - user must click "Submit Report" button
  }, []);

  // Handler for explicit "Submit Report" button click
  const handleExplicitSubmit = useCallback(() => {
    // Manually trigger React Hook Form validation and submission
    onFormSubmit();
  }, [onFormSubmit]);

  const renderHeader = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: { xs: 2, sm: 3 },
        borderBottom: 1,
        borderColor: 'divider',
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            Create New Report
          </Typography>
          {isOffline && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: theme.palette.warning.light,
                color: theme.palette.warning.dark,
              }}
            >
              <Iconify icon="eva:wifi-off-fill" width={14} />
              <Typography
                variant="caption"
                sx={{ fontWeight: 500, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
              >
                Offline
              </Typography>
            </Box>
          )}
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
        >
          Step {currentStep} of 3
        </Typography>
      </Box>
      <Button
        variant="outlined"
        size="small"
        onClick={onClose}
        sx={{
          minWidth: { xs: 36, sm: 40 },
          width: { xs: 36, sm: 40 },
          height: { xs: 36, sm: 40 },
          p: 0,
          flexShrink: 0,
        }}
      >
        <Iconify icon="eva:close-fill" width={20} />
      </Button>
    </Box>
  );

  const renderStepIndicator = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, px: 2 }}>
      {[1, 2, 3].map((step) => (
        <Box
          key={step}
          sx={{
            width: { xs: 28, sm: 32 },
            height: { xs: 28, sm: 32 },
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: { xs: 0.5, sm: 1 },
            backgroundColor: step <= currentStep ? 'primary.main' : 'grey.300',
            color: step <= currentStep ? 'white' : 'text.secondary',
            fontWeight: 600,
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            transition: 'all 0.3s ease',
          }}
        >
          {step}
        </Box>
      ))}
    </Box>
  );

  const renderStep1 = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, px: { xs: 2, sm: 3 } }}>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 600, color: 'primary.main', fontSize: { xs: '0.95rem', sm: '1rem' } }}
      >
        Report Details
      </Typography>

      <RHFSelect name="type" label="Report Type *">
        <option value="">Select Report Type...</option>
        {reportTypes.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </RHFSelect>

      <RHFDateTimePicker
        name="reportDate"
        label="Report Date & Time *"
        slotProps={{
          textField: {
            fullWidth: true,
            helperText: 'Date and time when the work was performed',
          },
        }}
      />

      {watchedClientId ? (
        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'grey.50',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Client *
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {clients.find((c) => c.value === watchedClientId)?.label || 'Unknown Client'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Pre-filled from task
          </Typography>
        </Box>
      ) : null}

      {watchedWorkOrderId ? (
        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'grey.50',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Work Order
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {workOrders.find((wo: any) => wo.value === watchedWorkOrderId)?.label ||
              'Unknown Work Order'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Pre-filled from task
          </Typography>
        </Box>
      ) : null}

      {watchedTaskIds?.[0] ? (
        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'grey.50',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Task
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {tasks.find((task) => task.value === watchedTaskIds?.[0])?.label || 'Unknown Task'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Pre-filled from task
          </Typography>
        </Box>
      ) : null}

      <RHFTextField
        name="location"
        label="Location *"
        placeholder="Work site address or location..."
        InputProps={{
          startAdornment: (
            <Iconify icon="eva:pin-fill" width={20} sx={{ mr: 1, color: 'action.active' }} />
          ),
        }}
        helperText="Auto-filled from client address when available"
      />

      <RHFTextField
        name="weather"
        label="Weather Conditions"
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, px: { xs: 2, sm: 3 } }}>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 600, color: 'primary.main', fontSize: { xs: '0.95rem', sm: '1rem' } }}
      >
        Materials & Documentation
      </Typography>

      {/* Materials Section */}
      <Box>
        <Typography
          variant="subtitle2"
          sx={{ mb: 2, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}
        >
          Materials Used
        </Typography>

        <Autocomplete
          options={materials}
          getOptionLabel={(option) => option?.label || ''}
          value={null}
          onChange={(_event, newValue) => {
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
            />
          )}
          renderOption={(props, option) => {
            const { key, ...otherProps } = props;
            return (
              <Box component="li" key={key} {...otherProps} sx={{ display: 'block !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: 'primary.light',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon="solar:box-bold" width={18} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {option.material?.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {option.material?.sku && `SKU: ${option.material.sku} • `}
                      {option.material?.unitCost?.toFixed(2) || '0.00'}€ per{' '}
                      {option.material?.unit || 'unit'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          }}
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
          slotProps={{
            paper: {
              sx: {
                maxWidth: { xs: 'calc(100vw - 32px)', sm: '100%' },
              },
            },
          }}
        />

        {selectedMaterials.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {selectedMaterials.map((material) => (
              <Box
                key={material.value}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 1.5, sm: 2 },
                  p: { xs: 1.5, sm: 2 },
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'background.paper',
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                }}
              >
                <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 0 } }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: { xs: '0.85rem', sm: '0.875rem' },
                    }}
                  >
                    {material.material?.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    {material.material?.unitCost?.toFixed(2) ||
                      material.material?.unitPrice?.toFixed(2) ||
                      '0.00'}
                    € per {material.material?.unit || 'unit'}
                  </Typography>
                </Box>

                <TextField
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
                  sx={{ width: { xs: 80, sm: 100 } }}
                  inputProps={{ min: 0, max: 100, step: 1 }}
                  helperText="Max: 100"
                  size="small"
                />

                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoveMaterial(material.value)}
                  color="error"
                  sx={{ minWidth: { xs: 36, sm: 40 }, flexShrink: 0 }}
                >
                  <Iconify icon="eva:trash-2-fill" width={16} />
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* File Upload Section */}
      <Box>
        <Typography
          variant="subtitle2"
          sx={{ mb: 2, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}
        >
          Photos & Files
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="eva:camera-fill" width={16} />}
            onClick={handleCameraCapture}
            sx={{ flex: { xs: '1 1 100%', sm: 1 }, height: { xs: 48, sm: 56 }, minWidth: 0 }}
          >
            Take Photo
          </Button>

          <Button
            variant="outlined"
            component="label"
            startIcon={<Iconify icon="eva:attach-fill" width={16} />}
            sx={{ flex: { xs: '1 1 100%', sm: 1 }, height: { xs: 48, sm: 56 }, minWidth: 0 }}
          >
            Upload Files
            <input
              type="file"
              hidden
              multiple
              accept="*/*"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </Button>
        </Box>

        {attachments.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
            {attachments.map((file, index) => {
              const isImage = file.type.startsWith('image/');
              const previewUrl = previewUrls.get(index);

              return (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: 1.5, sm: 2 },
                    p: { xs: 1.5, sm: 2 },
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
                        width: { xs: 50, sm: 60 },
                        height: { xs: 50, sm: 60 },
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
                        width: { xs: 50, sm: 60 },
                        height: { xs: 50, sm: 60 },
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
                        fontSize: { xs: '0.85rem', sm: '0.875rem' },
                      }}
                    >
                      {file.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    >
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
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                        }}
                      >
                        Captured photo
                      </Typography>
                    )}
                  </Box>

                  {/* Remove Button */}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleRemoveFile(index)}
                    color="error"
                    sx={{
                      minWidth: { xs: 36, sm: 40 },
                      height: { xs: 36, sm: 40 },
                      flexShrink: 0,
                      '&:hover': {
                        backgroundColor: 'error.lighter',
                      },
                    }}
                  >
                    <Iconify icon="eva:close-fill" width={16} />
                  </Button>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Notes Section */}
      <TextField
        label="Additional Notes"
        value={reportNotes}
        onChange={(e) => setReportNotes(e.target.value)}
        placeholder="Notes..."
        multiline
        rows={4}
        helperText="Optional: Provide any additional context or observations"
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
          },
        }}
      />
    </Box>
  );

  const renderStep3 = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, px: { xs: 2, sm: 3 } }}>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 600, color: 'primary.main', fontSize: { xs: '0.95rem', sm: '1rem' } }}
      >
        Signatures & Summary
      </Typography>

      {/* Offline indicator with explanation */}
      {isOffline && (
        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'warning.main',
            borderRadius: 1,
            backgroundColor: 'warning.lighter',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <Iconify icon="eva:wifi-off-fill" width={20} sx={{ color: 'warning.main', mt: 0.25 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Offline Mode
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You are currently offline. Your report will be saved locally and automatically
              submitted when your connection is restored.
            </Typography>
          </Box>
        </Box>
      )}

      {/* Digital Signatures */}
      <SignatureCollector
        signatures={signatures}
        onAddSignature={handleAddSignature}
        onRemoveSignature={handleRemoveSignature}
        onUpdateSignature={handleUpdateSignature}
        disabled={false}
        getInitialFormData={getInitialSignatureFormData}
      />

      {/* Summary */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          border: '1px solid',
          borderColor: 'primary.light',
          borderRadius: 1,
          backgroundColor: 'primary.lighter',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '0.9rem', sm: '0.875rem' } }}
        >
          Report Summary
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          • Type: {reportTypes.find((t) => t.value === watch('type'))?.label}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          • Client:{' '}
          {clients.find((c) => c.value === watch('clientId'))?.client?.name || 'Not selected'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          • Materials: {selectedMaterials.length} items
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          • Files: {attachments.length} attachments
        </Typography>
        <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          • Signatures: {signatures.length} collected
        </Typography>
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
        gap: { xs: 1.5, sm: 2 },
        p: { xs: 2, sm: 3 },
        borderTop: 1,
        borderColor: 'divider',
        backgroundColor: theme.palette.background.paper,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
      }}
    >
      {currentStep > 1 && (
        <Button
          type="button"
          variant="outlined"
          onClick={handlePrevious}
          startIcon={<Iconify icon="eva:arrow-left-fill" width={16} />}
          sx={{
            height: { xs: 48, sm: 56 },
            minWidth: { xs: '100%', sm: 120 },
            order: { xs: 2, sm: 1 },
          }}
        >
          Previous
        </Button>
      )}

      {currentStep < 3 ? (
        <Button
          type="button"
          variant="contained"
          onClick={handleNext}
          disabled={!validateStep(currentStep)}
          endIcon={<Iconify icon="eva:arrow-right-fill" width={16} />}
          sx={{
            flex: 1,
            height: { xs: 48, sm: 56 },
            order: { xs: 1, sm: 2 },
            minWidth: 0,
          }}
        >
          Next
        </Button>
      ) : (
        <Button
          type="button"
          variant="contained"
          onClick={handleExplicitSubmit}
          disabled={isSubmitting || !validateStep(1)}
          startIcon={<Iconify icon="eva:paper-plane-fill" width={16} />}
          sx={{
            flex: 1,
            height: { xs: 48, sm: 56 },
            order: { xs: 1, sm: 2 },
            minWidth: 0,
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </Button>
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
            maxWidth: '100%',
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            overflowX: 'hidden',
            overflowY: 'auto',
          },
        },
      }}
      sx={{
        '& .MuiDrawer-root': {
          position: 'fixed',
        },
        '& .MuiBackdrop-root': {
          position: 'fixed',
        },
      }}
    >
      <Form methods={methods} onSubmit={handleFormSubmit}>
        {renderHeader()}
        {renderStepIndicator()}

        <Scrollbar fillContent sx={{ flex: 1, pb: 3 }}>
          {renderStepContent()}
        </Scrollbar>

        {renderActions()}
      </Form>
    </Drawer>
  );
}
