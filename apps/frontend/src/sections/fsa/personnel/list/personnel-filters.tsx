'use client';

import { useState, useEffect } from 'react';

import {
  Stack,
  Drawer,
  Button,
  Select,
  Divider,
  MenuItem,
  TextField,
  Typography,
  InputLabel,
  FormControl,
} from '@mui/material';

import axiosInstance from 'src/lib/axios';

// ----------------------------------------------------------------------

interface PersonnelFiltersProps {
  open: boolean;
  onClose: () => void;
  filters: {
    name: string;
    role: string;
    status: string;
  };
  onFilters: (name: string, value: string) => void;
  canReset: boolean;
  onResetFilters: () => void;
}

// ----------------------------------------------------------------------

export function PersonnelFilters({
  open,
  onClose,
  filters,
  onFilters,
  canReset,
  onResetFilters,
}: PersonnelFiltersProps) {
  const [roles, setRoles] = useState<any[]>([]);

  // Fetch roles for the filter dropdown
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await axiosInstance.get('/api/v1/roles/');
        const data = response.data;

        if (data.success) {
          setRoles(data.data);
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
      }
    };

    if (open) {
      fetchRoles();
    }
  }, [open]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 320 },
      }}
    >
      <Stack spacing={3} sx={{ p: 3 }}>
        <Typography variant="h6">Filters</Typography>

        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Search by name or employee ID"
            value={filters.name}
            onChange={(e) => onFilters('name', e.target.value)}
          />

          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={filters.role}
              label="Role"
              onChange={(e) => onFilters('role', e.target.value)}
            >
              <MenuItem value="">All Roles</MenuItem>
              {roles.map((role) => (
                <MenuItem key={role._id} value={role._id}>
                  {role.name}
                </MenuItem>
              ))}
              <MenuItem value="no-role">No Role Assigned</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => onFilters('status', e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Divider />

        <Stack direction="row" spacing={1}>
          <Button fullWidth variant="outlined" onClick={onResetFilters} disabled={!canReset}>
            Reset
          </Button>
          <Button fullWidth variant="contained" onClick={onClose}>
            Apply
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
