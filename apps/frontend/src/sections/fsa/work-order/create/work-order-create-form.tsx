'use client';

import useSWR from 'swr';
import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import { Box, Card, Grid, Stack, Button, MenuItem, Typography, CardContent } from '@mui/material';

import { paths } from 'src/routes/paths';

import axiosInstance, { endpoints } from 'src/lib/axios';
import { type Client } from 'src/lib/services/client-service';
import { type Personnel } from 'src/lib/services/personnel-service';
import { getPriorityOptionsWithMetadata } from 'src/constants/priorities';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, RHFEditor, RHFSelect, RHFTextField, RHFMultiSelect } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const workOrderSchema = zod.object({
  clientId: zod.string().min(1, 'Client is required'),
  title: zod.string().min(1, 'Title is required'),
  details: zod.string().optional(),
  priority: zod.enum(['low', 'medium', 'high', 'urgent']).optional(),
  locationAddress: zod.string().optional(),
  scheduledDate: zod.string().optional(),
  estimatedDurationValue: zod.number().optional(),
  estimatedDurationUnit: zod.enum(['hours', 'days', 'weeks', 'months']).optional(),
  personnelIds: zod.array(zod.string()).optional(),
  attachments: zod.array(zod.string()).optional(),
  progressMode: zod.enum(['computed', 'manual', 'weighted']).optional(),
  progressManual: zod.number().min(0).max(100).optional(),
});

type WorkOrderFormValues = zod.infer<typeof workOrderSchema>;

// ----------------------------------------------------------------------

type Props = { id?: string };

export function WorkOrderCreateForm({ id }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      scheduledDate: '',
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
        methods.reset({
          clientId: typeof w.clientId === 'object' ? w.clientId._id : w.clientId,
          title: w.title ?? '',
          details: w.details ?? '',
          priority: w.priority ?? 'medium',
          locationAddress: w.location?.address ?? '',
          scheduledDate: w.scheduledDate
            ? new Date(w.scheduledDate).toISOString().slice(0, 16)
            : '',
          estimatedDurationValue: w.estimatedDuration?.value,
          estimatedDurationUnit: w.estimatedDuration?.unit,
          personnelIds: Array.isArray(w.personnelIds)
            ? w.personnelIds.map((p: any) => p._id ?? p)
            : [],
          attachments: [],
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

      console.log('Creating work order:', workOrderData);

      let response;
      if (id) {
        response = await axiosInstance.put(endpoints.fsa.workOrders.details(id), workOrderData);
      } else {
        response = await axiosInstance.post(endpoints.fsa.workOrders.create, workOrderData);
      }

      if (response.data.success) {
        toast.success(id ? 'Work order updated' : 'Work order created');
        router.push(paths.dashboard.fsa.workOrders.root);
      } else {
        throw new Error(response.data.message || 'Failed to create work order');
      }
    } catch (error) {
      const message = (error as any)?.response?.data?.message || (error as any)?.message || 'Something went wrong';
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
              <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                Work Order Details
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFSelect name="clientId" label="Client *" placeholder="Select client">
                    {clients.map((client: Client) => (
                      <MenuItem key={client._id} value={client._id}>
                        {client.name}
                      </MenuItem>
                    ))}
                  </RHFSelect>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFMultiSelect
                    name="personnelIds"
                    // label="Assigned Personnel"
                    placeholder="Select personnel (optional)"
                    options={personnel.map((person: Personnel) => ({
                      label: `${person.user?.name || person.employeeId} - ${person.role?.name || 'No Role'}`,
                      value: person._id,
                    }))}
                  />
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
                  <RHFTextField
                    name="scheduledDate"
                    label="Preferred Scheduled Date & Time"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    helperText="Leave empty for ASAP scheduling"
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<Iconify icon="eva:attach-2-fill" />}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Upload Files
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      Upload photos, documents, or other relevant files
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFSelect name="progressMode" label="Progress Mode" placeholder="Select mode">
                    <MenuItem value="computed">Computed</MenuItem>
                    <MenuItem value="manual">Manual</MenuItem>
                    <MenuItem value="weighted">Weighted</MenuItem>
                  </RHFSelect>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
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
              </Grid>
              <Grid size={{ xs: 12 }}>
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
