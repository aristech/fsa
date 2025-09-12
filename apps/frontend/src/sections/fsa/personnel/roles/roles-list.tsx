'use client';

import useSWR from 'swr';
import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import {
  Box,
  Card,
  Chip,
  Alert,
  Stack,
  Table,
  Button,
  Dialog,
  Tooltip,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  IconButton,
  Typography,
  DialogTitle,
  DialogContent,
  TableContainer,
} from '@mui/material';

import { PERMISSIONS } from 'src/hooks/use-permissions';

import { fetcher, endpoints } from 'src/lib/axios';
import { type Role } from 'src/lib/services/role-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { PermissionGuard } from 'src/components/auth-guard/permission-guard';

import { RoleCreateEditForm } from './role-create-edit-form';

// ----------------------------------------------------------------------

export function RolesList() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const createEditDialog = useBoolean();
  const isEdit = !!selectedRole;

  // Fetch roles data
  const {
    data,
    error: rolesError,
    isLoading,
    mutate,
  } = useSWR(endpoints.fsa.roles.list, fetcher<{ success: boolean; data: Role[] }>);

  const roles = data?.data || [];

  // Debug roles data
  console.log('RolesList - Roles data:', roles);
  console.log(
    'RolesList - Roles with isDefault:',
    roles.map((r) => ({ name: r.name, isDefault: r.isDefault }))
  );

  // Handle role creation/editing
  const handleCreateRole = useCallback(() => {
    console.log('Create Role button clicked');
    setSelectedRole(null);
    createEditDialog.onTrue();
    console.log('Dialog should be opening, state:', createEditDialog.value);
  }, [createEditDialog]);

  const handleEditRole = useCallback(
    (role: Role) => {
      setSelectedRole(role);
      createEditDialog.onTrue();
    },
    [createEditDialog]
  );

  const handleDeleteRole = useCallback((role: Role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!roleToDelete) return;

    try {
      const response = await fetch(`${endpoints.fsa.roles.details(roleToDelete._id)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Role deleted successfully');
        mutate(); // Refresh the list
      } else {
        throw new Error('Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    } finally {
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  }, [roleToDelete, mutate]);

  const handleFormSuccess = useCallback(() => {
    createEditDialog.onFalse();
    setSelectedRole(null);
    mutate(); // Refresh the list
  }, [createEditDialog, mutate]);

  // Permission categories for display
  const getPermissionCategory = (permission: string) => {
    if (permission.startsWith('work_orders')) return 'Work Orders';
    if (permission.startsWith('projects')) return 'Projects';
    if (permission.startsWith('tasks')) return 'Tasks';
    if (permission.startsWith('clients')) return 'Clients';
    if (permission.startsWith('personnel')) return 'Personnel';
    if (permission.startsWith('calendar')) return 'Calendar';
    if (permission.startsWith('reports')) return 'Reports';
    if (
      permission.startsWith('roles') ||
      permission.startsWith('statuses') ||
      permission.startsWith('settings') ||
      permission.startsWith('tenant')
    )
      return 'System';
    if (permission.startsWith('admin')) return 'Admin';
    return 'Other';
  };

  const groupPermissionsByCategory = (permissions: string[]) => {
    const grouped: Record<string, string[]> = {};
    permissions.forEach((permission) => {
      const category = getPermissionCategory(permission);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(permission);
    });
    return grouped;
  };

  const renderPermissionChips = (permissions: string[]) => {
    const grouped = groupPermissionsByCategory(permissions);
    return Object.entries(grouped).map(([category, perms]) => (
      <Box key={category} sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {category}:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {perms.map((permission) => (
            <Chip
              key={permission}
              label={permission.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          ))}
        </Box>
      </Box>
    ));
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Typography>Loading roles...</Typography>
      </Box>
    );
  }

  if (rolesError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load roles. Please try again.
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Roles & Permissions</Typography>
          <PermissionGuard permissions={[PERMISSIONS.ROLES_MANAGE, PERMISSIONS.ADMIN_ACCESS]}>
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              onClick={handleCreateRole}
            >
              Create Role
            </Button>
          </PermissionGuard>
        </Box>

        {roles.length === 0 ? (
          <EmptyContent
            title="No roles found"
            description="Create your first role to get started"
            sx={{ py: 10 }}
          />
        ) : (
          <TableContainer sx={{ overflow: 'unset' }}>
            <Scrollbar>
              <Table sx={{ minWidth: 960 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Role Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Default</TableCell>
                    <TableCell>Permissions</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role._id}>
                      <TableCell>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            cursor: role.isDefault ? 'default' : 'pointer',
                            color: role.isDefault ? 'text.primary' : 'primary.main',
                            '&:hover': role.isDefault
                              ? {}
                              : {
                                  textDecoration: 'underline',
                                  color: 'primary.dark',
                                },
                          }}
                          onClick={() => !role.isDefault && handleEditRole(role)}
                        >
                          {role.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {role.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {role.isDefault ? (
                          <Chip label="Default" size="small" color="primary" />
                        ) : (
                          <Chip label="Custom" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 400 }}>
                        <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                          {renderPermissionChips(role.permissions)}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <PermissionGuard permissions={PERMISSIONS.ROLES_MANAGE}>
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Edit Role">
                              <IconButton
                                color="primary"
                                onClick={() => handleEditRole(role)}
                                disabled={role.isDefault}
                              >
                                <Iconify icon="solar:pen-bold" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Role">
                              <IconButton
                                color="error"
                                onClick={() => handleDeleteRole(role)}
                                disabled={role.isDefault}
                              >
                                <Iconify icon="solar:trash-bin-trash-bold" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </PermissionGuard>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>
        )}
      </Card>

      {/* Create/Edit Role Dialog */}
      <Dialog
        open={createEditDialog.value}
        onClose={createEditDialog.onFalse}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{isEdit ? 'Edit Role' : 'Create New Role'}</DialogTitle>
        <DialogContent>
          <RoleCreateEditForm
            role={selectedRole}
            onSuccess={handleFormSuccess}
            onCancel={createEditDialog.onFalse}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Role"
        content={
          <>
            Are you sure you want to delete the role <strong>{roleToDelete?.name}</strong>?
            <br />
            <br />
            This action cannot be undone and may affect personnel assigned to this role.
          </>
        }
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />
    </>
  );
}
