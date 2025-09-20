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

export type ApiKey = Partial<ApiKeyFormData> & { _id: string };

import { apiKeysApi } from 'src/services/api-keys';
import { usersApi, type User } from 'src/services/users';

type Props = {
  open: boolean;
  apiKey: ApiKey | null;
  onClose: () => void;
  onSubmit: (data: ApiKeyFormData) => void;
};

// ----------------------------------------------------------------------

export function ApiKeyFormDialog({ open, apiKey, onClose, onSubmit }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

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

  // Load users and permissions when dialog opens
  useEffect(() => {
    if (open) {
      // Load users
      setLoadingUsers(true);
      usersApi
        .getUsers()
        .then((response) => {
          if (response.success) {
            setUsers(response.data);
          }
        })
        .catch((error) => {
          console.error('Failed to load users:', error);
        })
        .finally(() => {
          setLoadingUsers(false);
        });

      // Load permissions
      setLoadingPermissions(true);
      apiKeysApi
        .getPermissions()
        .then((response) => {
          if (response.success) {
            setPermissions(response.data);
          }
        })
        .catch((error) => {
          console.error('Failed to load permissions:', error);
          // Fallback permissions
          setPermissions([
            'work_orders.read',
            'work_orders.write',
            'tasks.read',
            'tasks.write',
            'clients.read',
            'clients.write',
            'users.read',
            'reports.read',
            '*',
          ]);
        })
        .finally(() => {
          setLoadingPermissions(false);
        });
    }
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
            name="userId"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={users}
                value={selectedUser}
                onChange={(_, v) => field.onChange(v?._id || '')}
                getOptionLabel={(o) => `${o.firstName} ${o.lastName} (${o.email})`}
                loading={loadingUsers}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="User"
                    error={!!errors.userId}
                    helperText={errors.userId?.message || 'Select the user for this API key'}
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
                options={permissions}
                value={field.value}
                onChange={(_, v) => field.onChange(v)}
                loading={loadingPermissions}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Permissions"
                    error={!!errors.permissions}
                    helperText={errors.permissions?.message || 'Select API permissions'}
                    sx={{ mt: 2 }}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option}
                      label={option === '*' ? 'All Permissions' : option}
                      variant="outlined"
                      color={option === '*' ? 'primary' : 'default'}
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
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {apiKey ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
