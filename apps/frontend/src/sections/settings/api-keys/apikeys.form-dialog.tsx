'use client';

import { z as zod } from 'zod';
import { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Chip from '@mui/material/Chip';
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
  userId: zod.string().min(1, 'User is required'),
  permissions: zod.array(zod.string()).min(1, 'Select at least one permission'),
  expiresAt: zod.string().optional(),
});

export type ApiKeyFormData = zod.infer<typeof schema>;

type ApiKey = Partial<ApiKeyFormData> & { _id: string };

type User = { _id: string; firstName: string; lastName: string; email: string; role: string };

type Props = {
  open: boolean;
  apiKey: ApiKey | null;
  onCloseAction: () => void;
  onSubmitAction: (data: ApiKeyFormData) => void;
};

const PERMISSIONS = [
  'work_orders.read',
  'work_orders.write',
  'tasks.read',
  'tasks.write',
  'clients.read',
  'clients.write',
  'materials.read',
  'materials.write',
  'users.read',
  'users.write',
  'reports.read',
  'settings.read',
  '*',
];

export function ApiKeyFormDialog({ open, apiKey, onCloseAction, onSubmitAction }: Props) {
  const [users, setUsers] = useState<User[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', userId: '', permissions: [], expiresAt: '' },
  });

  const selectedUser = useMemo(
    () => users.find((u) => u._id === watch('userId')) || null,
    [users, watch]
  );

  useEffect(() => {
    // TODO: fetch users from API
    setUsers([
      { _id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'admin' },
      {
        _id: 'u2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        role: 'manager',
      },
    ]);
  }, [open]);

  useEffect(() => {
    if (apiKey) {
      reset({
        name: apiKey.name ?? '',
        userId: apiKey.userId as string,
        permissions: apiKey.permissions as string[],
        expiresAt: (apiKey.expiresAt as string) || '',
      });
    } else {
      reset({ name: '', userId: '', permissions: [], expiresAt: '' });
    }
  }, [apiKey, reset]);

  return (
    <Dialog open={open} onClose={onCloseAction} maxWidth="md" fullWidth>
      <DialogTitle>{apiKey ? 'Edit API Key' : 'Create API Key'}</DialogTitle>
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
            name="userId"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={users}
                value={selectedUser}
                onChange={(_, v) => field.onChange(v?._id || '')}
                getOptionLabel={(o) => `${o.firstName} ${o.lastName} (${o.email})`}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="User"
                    error={!!errors.userId}
                    helperText={errors.userId?.message}
                    sx={{ mt: 2 }}
                  />
                )}
              />
            )}
          />
          <Controller
            name="permissions"
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                options={PERMISSIONS}
                value={field.value}
                onChange={(_, v) => field.onChange(v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Permissions"
                    error={!!errors.permissions}
                    helperText={errors.permissions?.message}
                    sx={{ mt: 2 }}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option}
                      label={option === '*' ? 'All' : option}
                      variant="outlined"
                    />
                  ))
                }
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
          <Button onClick={onCloseAction}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {apiKey ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
