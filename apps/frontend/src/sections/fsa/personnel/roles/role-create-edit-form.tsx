'use client';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Box,
  Card,
  Grid,
  Stack,
  Alert,
  Button,
  Divider,
  Checkbox,
  FormLabel,
  FormGroup,
  Typography,
  CardContent,
  FormControl,
  FormControlLabel,
} from '@mui/material';

import {
  type Role,
  roleService,
  type CreateRoleRequest,
  type UpdateRoleRequest,
} from 'src/lib/services/role-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const roleSchema = zod.object({
  name: zod
    .string()
    .min(1, 'Role name is required')
    .max(50, 'Role name must be less than 50 characters'),
  description: zod.string().optional(),
  permissions: zod.array(zod.string()).min(1, 'At least one permission is required'),
});

type RoleFormValues = zod.infer<typeof roleSchema>;

// ----------------------------------------------------------------------

interface RoleCreateEditFormProps {
  role?: Role | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// ----------------------------------------------------------------------

// Available permissions organized by category
const PERMISSION_CATEGORIES = {
  'Work Orders': [
    'work_orders.view',
    'work_orders.create',
    'work_orders.edit',
    'work_orders.delete',
    'work_orders.assign',
    'work_orders.view_own',
    'work_orders.edit_own',
  ],
  Projects: ['projects.view', 'projects.create', 'projects.edit', 'projects.delete'],
  Tasks: [
    'tasks.view',
    'tasks.create',
    'tasks.edit',
    'tasks.delete',
    'tasks.view_own',
    'tasks.edit_own',
  ],
  Clients: ['clients.view', 'clients.create', 'clients.edit', 'clients.delete'],
  Personnel: ['personnel.view', 'personnel.create', 'personnel.edit', 'personnel.delete'],
  Calendar: ['calendar.view', 'calendar.edit', 'calendar.view_own', 'calendar.edit_own'],
  Reports: ['reports.view', 'reports.export'],
  'System Management': ['roles.manage', 'statuses.manage', 'settings.manage', 'tenant.manage'],
  Admin: ['admin.access'],
};

// ----------------------------------------------------------------------

export function RoleCreateEditForm({ role, onSuccess, onCancel }: RoleCreateEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const isEdit = !!role;

  const methods = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name || '',
      description: role?.description || '',
      permissions: role?.permissions || [],
    },
  });

  const { handleSubmit, setValue, watch } = methods;

  // Watch permissions to sync with local state
  const watchedPermissions = watch('permissions');

  useEffect(() => {
    setSelectedPermissions(watchedPermissions);
  }, [watchedPermissions]);

  const onSubmit = async (data: RoleFormValues) => {
    try {
      setIsSubmitting(true);

      if (isEdit && role) {
        const updateData: UpdateRoleRequest = {
          name: data.name,
          description: data.description,
          permissions: data.permissions,
        };
        await roleService.updateRole(role._id, updateData);
        toast.success('Role updated successfully');
      } else {
        const createData: CreateRoleRequest = {
          name: data.name,
          description: data.description,
          permissions: data.permissions,
        };
        await roleService.createRole(createData);
        toast.success('Role created successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Failed to save role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    let newPermissions: string[];
    if (checked) {
      newPermissions = [...selectedPermissions, permission];
    } else {
      newPermissions = selectedPermissions.filter((p) => p !== permission);
    }
    setSelectedPermissions(newPermissions);
    setValue('permissions', newPermissions);
  };

  const handleCategorySelectAll = (category: string, checked: boolean) => {
    const categoryPermissions =
      PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
    let newPermissions = [...selectedPermissions];

    if (checked) {
      // Add all category permissions
      categoryPermissions.forEach((permission) => {
        if (!newPermissions.includes(permission)) {
          newPermissions.push(permission);
        }
      });
    } else {
      // Remove all category permissions
      newPermissions = newPermissions.filter((p) => !categoryPermissions.includes(p));
    }

    setSelectedPermissions(newPermissions);
    setValue('permissions', newPermissions);
  };

  const isCategoryFullySelected = (category: string) => {
    const categoryPermissions =
      PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
    return categoryPermissions.every((permission) => selectedPermissions.includes(permission));
  };

  const isCategoryPartiallySelected = (category: string) => {
    const categoryPermissions =
      PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
    const selectedCount = categoryPermissions.filter((permission) =>
      selectedPermissions.includes(permission)
    ).length;
    return selectedCount > 0 && selectedCount < categoryPermissions.length;
  };

  return (
    <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3}>
        {isEdit && role?.isDefault && (
          <Alert severity="info">This is a default role. Some restrictions may apply.</Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <RHFTextField
              name="name"
              label="Role Name"
              placeholder="Enter role name"
              disabled={isEdit && role?.isDefault}
              helperText="Slug will be auto-generated from name"
            />
          </Grid>


          <Grid item xs={12}>
            <RHFTextField
              name="description"
              label="Description"
              placeholder="Enter role description"
              multiline
              rows={3}
              disabled={isEdit && role?.isDefault}
            />
          </Grid>
        </Grid>

        <Divider />

        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Permissions
          </Typography>

          <Grid container spacing={3}>
            {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => (
              <Grid item xs={12} md={6} key={category}>
                <Card variant="outlined">
                  <CardContent>
                    <FormControl component="fieldset" fullWidth>
                      <FormLabel component="legend">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Checkbox
                            checked={isCategoryFullySelected(category)}
                            indeterminate={isCategoryPartiallySelected(category)}
                            onChange={(e) => handleCategorySelectAll(category, e.target.checked)}
                            disabled={isEdit && role?.isDefault}
                          />
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {category}
                          </Typography>
                        </Stack>
                      </FormLabel>

                      <FormGroup>
                        {permissions.map((permission) => (
                          <FormControlLabel
                            key={permission}
                            control={
                              <Checkbox
                                checked={selectedPermissions.includes(permission)}
                                onChange={(e) =>
                                  handlePermissionChange(permission, e.target.checked)
                                }
                                disabled={isEdit && role?.isDefault}
                              />
                            }
                            label={
                              <Typography variant="body2">
                                {permission
                                  .replace(/_/g, ' ')
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </Typography>
                            }
                          />
                        ))}
                      </FormGroup>
                    </FormControl>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={<Iconify icon="solar:check-circle-bold" />}
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Role' : 'Create Role'}
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
}
