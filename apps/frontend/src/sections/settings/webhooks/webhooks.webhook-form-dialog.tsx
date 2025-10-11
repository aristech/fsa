'use client';

import { z as zod } from 'zod';
import { useEffect } from 'react';
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

// ----------------------------------------------------------------------

const schema = zod.object({
  name: zod.string().min(1, 'Name is required'),
  status: zod.boolean(),
  topics: zod.array(zod.string()).min(1, 'Select at least one topic'),
  deliveryUrl: zod.string().url('Valid URL is required'),
  secret: zod.string().min(1, 'Secret is required'),
});

export type WebhookFormData = zod.infer<typeof schema>;

type Webhook = WebhookFormData & { _id: string };

type Props = {
  open: boolean;
  webhook: Webhook | null;
  onCloseAction: () => void;
  onSubmitAction: (data: WebhookFormData) => void;
};

const TOPICS = [
  'work_order.created',
  'work_order.updated',
  'task.created',
  'task.updated',
  'user.created',
  'user.updated',
];

export function WebhookFormDialog({ open, webhook, onCloseAction, onSubmitAction }: Props) {
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
      secret: '',
    },
  });

  useEffect(() => {
    if (webhook) {
      reset({
        name: webhook.name,
        status: webhook.status,
        topics: webhook.topics,
        deliveryUrl: webhook.deliveryUrl,
        secret: webhook.secret,
      });
    } else {
      reset({
        name: '',
        status: true,
        topics: [],
        deliveryUrl: '',
        secret: '',
      });
    }
  }, [webhook, reset]);

  return (
    <Dialog open={open} onClose={onCloseAction} maxWidth="md" fullWidth>
      <DialogTitle>{webhook ? 'Edit Webhook' : 'Create Webhook'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmitAction)}>
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
                options={TOPICS}
                value={field.value}
                onChange={(_, v) => field.onChange(v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Topics"
                    error={!!errors.topics}
                    helperText={errors.topics?.message}
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
            name="secret"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Secret"
                type="password"
                error={!!errors.secret}
                helperText={errors.secret?.message}
                fullWidth
                sx={{ mt: 2 }}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseAction}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {webhook ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
