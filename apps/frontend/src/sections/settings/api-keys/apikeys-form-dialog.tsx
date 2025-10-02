'use client';

import { z as zod } from 'zod';
import { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

// ----------------------------------------------------------------------

const schema = zod.object({
  name: zod.string().min(1, 'Name is required'),
  personnelId: zod.string().min(1, 'Personnel is required'),
  expiresAt: zod.string().optional(),
});

export type ApiKeyFormData = zod.infer<typeof schema>;

export type ApiKey = Partial<ApiKeyFormData> & {
  _id: string;
  personnelId?: string;
  userId?: string;
};

import { type Personnel, personnelService } from 'src/lib/services/personnel-service';

type Props = {
  open: boolean;
  apiKey: ApiKey | null;
  onClose: () => void;
  onSubmit: (data: ApiKeyFormData) => void;
};

// ----------------------------------------------------------------------

export function ApiKeyFormDialog({ open, apiKey, onClose, onSubmit }: Props) {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', personnelId: '', expiresAt: '' },
  });

  const selectedPersonnel = useMemo(
    () => personnel.find((p) => p._id === watch('personnelId')) || null,
    [personnel, watch]
  );

  // Load personnel when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingPersonnel(true);
      personnelService
        .getPersonnel()
        .then((response) => {
          if (response.success) {
            setPersonnel(response.data);
          }
        })
        .catch((error) => {
          console.error('Failed to load personnel:', error);
        })
        .finally(() => {
          setLoadingPersonnel(false);
        });
    }
  }, [open]);

  useEffect(() => {
    if (apiKey) {
      reset({
        name: apiKey.name ?? '',
        personnelId: apiKey.personnelId as string,
        expiresAt: (apiKey.expiresAt as string) || '',
      });
    } else {
      reset({ name: '', personnelId: '', expiresAt: '' });
    }
  }, [apiKey, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{apiKey ? 'Edit API Key' : 'Create API Key'}</DialogTitle>
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
            name="personnelId"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={personnel}
                value={selectedPersonnel}
                onChange={(_, v) => field.onChange(v?._id || '')}
                getOptionLabel={(o) => {
                  const userName = o.user ? `${o.user.name}` : `Personnel ${o.employeeId}`;
                  const email = o.user ? ` (${o.user.email})` : '';
                  const role = o.role ? ` - ${o.role.name}` : '';
                  return `${userName}${email}${role}`;
                }}
                loading={loadingPersonnel}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Personnel"
                    error={!!errors.personnelId}
                    helperText={
                      errors.personnelId?.message || 'Select the personnel for this API key'
                    }
                    sx={{ mt: 2 }}
                  />
                )}
              />
            )}
          />
          <Controller
            name="expiresAt"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Expires At (optional)"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                fullWidth
                sx={{ mt: 2 }}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {apiKey ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
