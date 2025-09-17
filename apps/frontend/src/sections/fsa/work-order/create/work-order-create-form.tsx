'use client';

import useSWR from 'swr';
import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';

import {
  Box,
  Card,
  Grid,
  Link,
  Stack,
  Button,
  MenuItem,
  Typography,
  CardContent,
} from '@mui/material';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import axiosInstance, { endpoints } from 'src/lib/axios';
import { type Client } from 'src/lib/services/client-service';
import { getPriorityOptionsWithMetadata } from 'src/constants/priorities';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import {
  Form,
  RHFEditor,
  RHFSelect,
  RHFUpload,
  RHFTextField,
  RHFDateTimePicker,
} from 'src/components/hook-form';

import { RHFWorkOrderPersonnel } from './rhf-work-order-personnel';

// ----------------------------------------------------------------------

const workOrderSchema = zod.object({
  clientId: zod.string().min(1, 'Client is required'),
  title: zod.string().min(1, 'Title is required'),
  details: zod.string().optional(),
  priority: zod.enum(['low', 'medium', 'high', 'urgent']).optional(),
  locationAddress: zod.string().optional(),
  scheduledDate: zod.union([zod.string(), zod.date(), zod.null()]).optional(),
  estimatedDurationValue: zod.number().optional(),
  estimatedDurationUnit: zod.enum(['hours', 'days', 'weeks', 'months']).optional(),
  personnelIds: zod.array(zod.string()).optional(),
  attachments: zod.array(zod.any()).optional(),
  progressMode: zod.enum(['computed', 'manual', 'weighted']).optional(),
  progressManual: zod.number().min(0).max(100).optional(),
});

type WorkOrderFormValues = zod.infer<typeof workOrderSchema>;

// ----------------------------------------------------------------------

type Props = { id?: string };

export function WorkOrderCreateForm({ id }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalAttachments, setOriginalAttachments] = useState<any[]>([]);
  const router = useRouter();

  // Custom fetcher using axiosInstance for authentication
  const axiosFetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);

  // Fetch clients and personnel data
  const { data: clientsData } = useSWR(endpoints.fsa.clients.list, axiosFetcher);

  const { data: personnelData } = useSWR(endpoints.fsa.personnel.list, axiosFetcher);

  const clients = useMemo(() => clientsData?.data?.clients || [], [clientsData]);
  const personnel = useMemo(() => personnelData?.data || [], [personnelData]);

  const methods = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      clientId: '',
      title: '',
      details: '',
      priority: 'medium',
      locationAddress: '',
      scheduledDate: null,
      estimatedDurationValue: undefined,
      estimatedDurationUnit: 'hours' as const,
      personnelIds: [],
      attachments: [],
      progressMode: 'computed',
      progressManual: undefined,
    },
  });

  // Load existing work order for edit mode
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const res = await axiosInstance.get(endpoints.fsa.workOrders.details(id));
        const w = res.data?.data;
        if (!w) return;

        // Store original attachment objects for edit mode
        const attachments = Array.isArray(w.attachments) ? w.attachments : [];
        setOriginalAttachments(attachments);

        methods.reset({
          clientId: typeof w.clientId === 'object' ? w.clientId._id : w.clientId,
          title: w.title ?? '',
          details: w.details ?? '',
          priority: w.priority ?? 'medium',
          locationAddress: w.location?.address ?? '',
          scheduledDate: w.scheduledDate ? w.scheduledDate : null,
          estimatedDurationValue: w.estimatedDuration?.value,
          estimatedDurationUnit: w.estimatedDuration?.unit,
          personnelIds: Array.isArray(w.personnelIds)
            ? w.personnelIds.map((p: any) => p._id ?? p)
            : [],
          attachments: attachments.map((att: any) => att.url || att),
          progressMode: w.progressMode ?? 'computed',
          progressManual: w.progressManual,
        });
      } catch (e) {
        console.error('Failed to load work order', e);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-select first client when clients are loaded (only for create)
  useEffect(() => {
    if (!id && clients.length > 0 && !methods.getValues('clientId')) {
      methods.setValue('clientId', clients[0]._id);
    }
  }, [clients, methods, id]);

  const { handleSubmit } = methods;

  const onSubmit = async (data: WorkOrderFormValues) => {
    try {
      setIsSubmitting(true);

      // Transform form data to match API expectations
      const workOrderData: any = {
        ...data,
      };

      // Separate existing attachments from new files to upload
      let filesToUpload: File[] = [];
      let existingAttachmentUrls: string[] = [];

      if (data.attachments && Array.isArray(data.attachments) && data.attachments.length > 0) {
        filesToUpload = data.attachments.filter((item): item is File => item instanceof File);
        existingAttachmentUrls = data.attachments.filter(
          (item): item is string => typeof item === 'string'
        );
      }

      // Use stored original attachments for existing files
      const existingAttachments = originalAttachments.filter((att: any) =>
        existingAttachmentUrls.includes(att.url)
      );

      // Start with existing attachments (empty for create mode)
      workOrderData.attachments = existingAttachments;

      // Add location if address is provided
      if (data.locationAddress) {
        workOrderData.location = {
          address: data.locationAddress,
        };
      }

      // Add estimated duration if both value and unit are provided
      if (data.estimatedDurationValue && data.estimatedDurationUnit) {
        workOrderData.estimatedDuration = {
          value: data.estimatedDurationValue,
          unit: data.estimatedDurationUnit,
        };
      }

      // Remove the separate fields
      delete workOrderData.locationAddress;
      delete workOrderData.estimatedDurationValue;
      delete workOrderData.estimatedDurationUnit;


      let response;
      if (id) {
        response = await axiosInstance.put(endpoints.fsa.workOrders.details(id), workOrderData);
      } else {
        response = await axiosInstance.post(endpoints.fsa.workOrders.create, workOrderData);
      }

      if (response.data.success) {
        const workOrderId = id || response.data.data?._id;

        // Upload files after work order creation/update
        if (filesToUpload.length > 0 && workOrderId) {
          try {
            const form = new FormData();
            form.append('scope', 'workOrder');
            form.append('workOrderId', workOrderId);
            filesToUpload.forEach((file: File) => {
              form.append('files', file);
            });

            console.log('🔧 WORK ORDER FORM: Uploading with scope:', 'workOrder', 'workOrderId:', workOrderId);
            console.log('🔧 WORK ORDER FORM: FormData entries:');
            for (const [key, value] of form.entries()) {
              console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
            }

            const uploadResponse = await axiosInstance.post('/api/v1/uploads', form, {
              headers: {
                'Content-Type': undefined, // Let browser set multipart boundary
              },
            });

            const uploadedFiles = uploadResponse.data?.data || [];
            const attachments = uploadedFiles.map((f: any) => ({
              name: f.name || 'Unknown',
              url: f.url,
              type: f.mime || 'application/octet-stream',
              size: f.size || 0,
            }));

            // Combine existing attachments with new uploads
            const allAttachments = [...existingAttachments, ...attachments];

            // Update work order with all attachments
            if (allAttachments.length > 0) {
              await axiosInstance.put(endpoints.fsa.workOrders.details(workOrderId), {
                attachments: allAttachments,
              });
            }
          } catch (uploadError) {
            console.error('File upload failed:', uploadError);
            toast.warning(
              'Work order saved, but file upload failed. You can add attachments later.'
            );
          }
        }

        toast.success(id ? 'Work order updated' : 'Work order created');
        router.push(paths.dashboard.fsa.workOrders.root);
      } else {
        throw new Error(response.data.message || 'Failed to create work order');
      }
    } catch (error) {
      const message =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        'Something went wrong';
      toast.error(message);
      console.error('Error creating work order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
      
      <Card>
        <CardContent>
          <Stack spacing={3}>
            {/* Basic Information */}
            <Stack spacing={3}>
              <CustomBreadcrumbs
        heading={id ? 'Work Order Edit' : 'Work Order Create'}
        links={[
          { name: 'Dashboard', href: '/dashboard' },
          { name: 'Work Orders', href: '/dashboard/work-orders' },
          ...(id ? [{ name: 'Work Order Edit' }] : []),
        ]}
        sx={{ mb: 5 }}
        action={
          id && (
             <Button variant="contained" startIcon={<Iconify icon="eva:eye-fill" />}
            href={`${paths.dashboard.fsa.workOrders.details(id)}`}
            >
              View
            </Button>
          )}
        
      />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  {clients.length === 0 ? (
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">Client *</Typography>
                      <Box
                        sx={{
                          p: 3,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: 'background.neutral',
                          textAlign: 'center',
                        }}
                      >
                        <Iconify
                          icon="solar:users-group-two-rounded-bold"
                          sx={{ width: 48, height: 48, color: 'text.disabled', mb: 2 }}
                        />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Clients Found
                        </Typography>
                        <Typography variant="body2" color="text.disabled" paragraph>
                          You need to add at least one client before creating a work order.
                        </Typography>
                        <Link
                          component={RouterLink}
                          href={paths.dashboard.fsa.clients.new}
                          variant="subtitle2"
                          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                        >
                          <Iconify icon="solar:add-circle-bold" width={16} />
                          Add Your First Client
                        </Link>
                      </Box>
                    </Stack>
                  ) : (
                    <RHFSelect name="clientId" label="Client *" placeholder="Select client">
                      {clients.map((client: Client) => (
                        <MenuItem key={client._id} value={client._id}>
                          {client.name}
                        </MenuItem>
                      ))}
                    </RHFSelect>
                  )}
                </Grid>

                <Grid size={{ xs: 12 }}>
                  {personnel.length === 0 ? (
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">Assigned Personnel (Optional)</Typography>
                      <Box
                        sx={{
                          p: 2.5,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: 'background.neutral',
                          textAlign: 'center',
                        }}
                      >
                        <Iconify
                          icon="solar:user-plus-bold"
                          sx={{ width: 40, height: 40, color: 'text.disabled', mb: 1.5 }}
                        />
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          No Personnel Available
                        </Typography>
                        <Typography variant="body2" color="text.disabled" sx={{ mb: 1.5 }}>
                          Add personnel to assign them to work orders.
                        </Typography>
                        <Link
                          component={RouterLink}
                          href={paths.dashboard.fsa.personnel.new}
                          variant="caption"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            textDecoration: 'underline',
                          }}
                        >
                          <Iconify icon="solar:add-circle-bold" width={14} />
                          Add Your First Personnel
                        </Link>
                      </Box>
                    </Stack>
                  ) : (
                    <RHFWorkOrderPersonnel name="personnelIds" />
                  )}
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <RHFTextField
                    name="title"
                    label="Work Order Title *"
                    placeholder="Brief description of the work to be performed"
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Priority (Optional)</Typography>

                    <RHFSelect name="priority" label="Priority">
                      {getPriorityOptionsWithMetadata().map((priority) => (
                        <MenuItem key={priority.value} value={priority.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: priority.color,
                              }}
                            />
                            {priority.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </RHFSelect>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Estimated Duration (Optional)</Typography>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 2 }}>
                        <RHFTextField
                          name="estimatedDurationValue"
                          type="number"
                          placeholder="1"
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <RHFSelect name="estimatedDurationUnit">
                          <MenuItem value="hours">Hours</MenuItem>
                          <MenuItem value="days">Days</MenuItem>
                          <MenuItem value="weeks">Weeks</MenuItem>
                          <MenuItem value="months">Months</MenuItem>
                        </RHFSelect>
                      </Grid>
                    </Grid>
                  </Stack>
                </Grid>
              </Grid>
            </Stack>

            {/* Location Information */}
            <Stack spacing={3}>
              <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                Location (Optional)
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <RHFTextField
                    name="locationAddress"
                    label="Service Address"
                    placeholder="Enter the complete service address"
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </Stack>

            {/* Scheduling & Additional Information */}
            <Stack spacing={3}>
              <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                Scheduling & Additional Information (Optional)
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFDateTimePicker
                    name="scheduledDate"
                    label="Preferred Scheduled Date & Time"
                    minutesStep={60}
                    slotProps={{
                      textField: {
                        helperText: 'Leave empty for ASAP scheduling',
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFSelect name="progressMode" label="Progress Mode" placeholder="Select mode">
                    <MenuItem value="computed">Computed</MenuItem>
                    <MenuItem value="manual">Manual</MenuItem>
                    <MenuItem value="weighted">Weighted</MenuItem>
                  </RHFSelect>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Manual Progress</Typography>
                    <Box px={1}>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={methods.watch('progressManual') ?? 0}
                        onChange={(e) => methods.setValue('progressManual', Number(e.target.value))}
                        disabled={methods.watch('progressMode') !== 'manual'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {methods.watch('progressManual') ?? 0}%
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Attachments (Optional)</Typography>
                    <RHFUpload
                      name="attachments"
                      multiple
                      accept={{ 'image/*': [], 'application/pdf': [], 'text/*': [] }}
                      helperText="Upload photos, documents, or other relevant files"
                    />
                  </Stack>
                </Grid>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2">Details (Optional)</Typography>
                  <RHFEditor
                    name="details"
                    placeholder="Describe the work to be performed, requirements, and any special instructions..."
                  />
                </Stack>
              </Grid>
            </Stack>

            {/* Actions */}
            <Stack
              direction="row"
              spacing={2}
              justifyContent="flex-end"
              sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}
            >
              <Button variant="outlined" href="/dashboard/work-orders" size="large">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                loading={isSubmitting}
                disabled={clients.length === 0}
                size="large"
                startIcon={<Iconify icon="solar:add-circle-bold" />}
              >
                {id ? 'Update Work Order' : 'Create Work Order'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Form>
  );
}
