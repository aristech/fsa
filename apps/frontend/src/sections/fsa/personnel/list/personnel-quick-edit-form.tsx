'use client';

import { useState, useEffect } from 'react';

import {
  Box,
  Stack,
  Button,
  Select,
  Popover,
  MenuItem,
  TextField,
  InputLabel,
  Typography,
  FormControl,
} from '@mui/material';

import axiosInstance from 'src/lib/axios';

// ----------------------------------------------------------------------

interface Personnel {
  _id: string;
  employeeId: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  role?: {
    _id: string;
    name: string;
    color: string;
  };
  skills: string[];
  hourlyRate: number;
  isActive: boolean;
  taskCount: number;
  projectCount: number;
  totalAssignments: number;
}

interface PersonnelQuickEditFormProps {
  open: HTMLElement | null;
  onClose: () => void;
  personnel: Personnel;
}

// ----------------------------------------------------------------------

export function PersonnelQuickEditForm({ open, onClose, personnel }: PersonnelQuickEditFormProps) {
  const [roleId, setRoleId] = useState(personnel.role?._id || '');
  const [hourlyRate, setHourlyRate] = useState(personnel.hourlyRate);
  const [isActive, setIsActive] = useState(personnel.isActive);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch roles when popover opens
  useEffect(() => {
    if (open) {
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

      fetchRoles();
    }
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.put(`/api/v1/personnel/${personnel._id}`, {
        roleId: roleId || undefined,
        hourlyRate,
        isActive,
      });

      const data = response.data;

      if (data.success) {
        onClose();
        // Refresh the page or update the data
        window.location.reload();
      } else {
        console.error('Failed to update personnel:', data.message);
      }
    } catch (err) {
      console.error('Error updating personnel:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover
      open={!!open}
      anchorEl={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      PaperProps={{
        sx: { width: 320, p: 2 },
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h6">Quick Edit</Typography>

        <Typography variant="subtitle2" color="text.secondary">
          {personnel.user?.name || 'Unknown'} ({personnel.employeeId})
        </Typography>

        <FormControl fullWidth>
          <InputLabel>Role</InputLabel>
          <Select value={roleId} label="Role" onChange={(e) => setRoleId(e.target.value)}>
            <MenuItem value="">No Role</MenuItem>
            {roles.map((role) => (
              <MenuItem key={role._id} value={role._id}>
                {role.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Hourly Rate"
          type="number"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(Number(e.target.value))}
          InputProps={{
            startAdornment: <Box sx={{ mr: 1 }}>$</Box>,
          }}
        />

        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select
            value={isActive ? 'active' : 'inactive'}
            label="Status"
            onChange={(e) => setIsActive(e.target.value === 'active')}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>

        <Stack direction="row" spacing={1}>
          <Button fullWidth variant="outlined" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button fullWidth variant="contained" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </Stack>
      </Stack>
    </Popover>
  );
}
