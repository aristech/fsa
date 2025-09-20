'use client';

import { z as zod } from 'zod';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import { webhooksApi } from 'src/services/webhooks';

// ----------------------------------------------------------------------

const schema = zod.object({
  name: zod.string().min(1, 'Name is required'),
  status: zod.boolean(),
  topics: zod.array(zod.string()).min(1, 'Select at least one topic'),
  deliveryUrl: zod.string().url('Valid HTTPS URL is required'),
  apiVersion: zod.string().min(1, 'API Version is required'),
  maxRetries: zod.number().min(0).max(10).optional(),
  timeoutMs: zod.number().min(1000).max(30000).optional(),
});

export type WebhookFormData = zod.infer<typeof schema>;

export type Webhook = Partial<WebhookFormData> & { _id: string };

type Props = {
  open: boolean;
  webhook: Webhook | null;
  onClose: () => void;
  onSubmit: (data: WebhookFormData) => void;
};

const API_VERSIONS = ['2024-01-01', '2023-10-01', '2023-09-01'];

export function WebhookFormDialog({ open, webhook, onClose, onSubmit }: Props) {
  const [topics, setTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WebhookFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      status: true,
      topics: [],
      deliveryUrl: '',
      apiVersion: API_VERSIONS[0],
      maxRetries: 3,
      timeoutMs: 10000,
    },
  });

  // Load available topics
  useEffect(() => {
    if (open) {
      setLoadingTopics(true);
      webhooksApi
        .getTopics()
        .then((response) => {
          if (response.success) {
            setTopics(response.data);
          }
        })
        .catch((error) => {
          console.error('Failed to load webhook topics:', error);
          // Fallback topics
          setTopics([
            'work_order.created',
            'work_order.updated',
            'work_order.deleted',
            'task.created',
            'task.updated',
            'task.deleted',
            'user.created',
            'user.updated',
            'client.created',
            'client.updated',
          ]);
        })
        .finally(() => {
          setLoadingTopics(false);
        });
    }
  }, [open]);

  useEffect(() => {
    if (webhook) {
      reset({
        name: webhook.name || '',
        status: webhook.status ?? true,
        topics: webhook.topics || [],
        deliveryUrl: webhook.deliveryUrl || '',
        apiVersion: webhook.apiVersion || API_VERSIONS[0],
        maxRetries: webhook.maxRetries ?? 3,
        timeoutMs: webhook.timeoutMs ?? 10000,
      });
    } else {
      reset({
        name: '',
        status: true,
        topics: [],
        deliveryUrl: '',
        apiVersion: API_VERSIONS[0],
        maxRetries: 3,
        timeoutMs: 10000,
      });
    }
  }, [webhook, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{webhook ? 'Edit Webhook' : 'Create Webhook'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Name"
                error={!!errors.name}
                helperText={errors.name?.message}
                fullWidth
                sx={{ mt: 2 }}
              />
            )}
          />
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                sx={{ mt: 2 }}
                control={<Switch checked={field.value} onChange={field.onChange} />}
                label="Active"
              />
            )}
          />
          <Controller
            name="topics"
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                options={topics}
                value={field.value}
                onChange={(_, v) => field.onChange(v)}
                loading={loadingTopics}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Topics"
                    error={!!errors.topics}
                    helperText={errors.topics?.message || 'Select one or more webhook topics'}
                    sx={{ mt: 2 }}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option}
                      label={option}
                      variant="outlined"
                    />
                  ))
                }
              />
            )}
          />
          <Controller
            name="deliveryUrl"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Delivery URL"
                error={!!errors.deliveryUrl}
                helperText={errors.deliveryUrl?.message}
                fullWidth
                sx={{ mt: 2 }}
              />
            )}
          />
          <Controller
            name="maxRetries"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Max Retries"
                type="number"
                inputProps={{ min: 0, max: 10 }}
                value={field.value || 3}
                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 3)}
                error={!!errors.maxRetries}
                helperText={errors.maxRetries?.message || 'Number of retry attempts (0-10)'}
                fullWidth
                sx={{ mt: 2 }}
              />
            )}
          />
          <Controller
            name="timeoutMs"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Timeout (ms)"
                type="number"
                inputProps={{ min: 1000, max: 30000 }}
                value={field.value || 10000}
                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 10000)}
                error={!!errors.timeoutMs}
                helperText={errors.timeoutMs?.message || 'Request timeout in milliseconds (1000-30000)'}
                fullWidth
                sx={{ mt: 2 }}
              />
            )}
          />
          <Controller
            name="apiVersion"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={API_VERSIONS}
                value={field.value}
                onChange={(_, v) => field.onChange(v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="API Version"
                    error={!!errors.apiVersion}
                    helperText={errors.apiVersion?.message}
                    sx={{ mt: 2 }}
                  />
                )}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {webhook ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
