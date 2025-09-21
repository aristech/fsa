'use client';

import { useState, useEffect } from 'react';

import {
  Stack,
  Button,
  Drawer,
  Select,
  Divider,
  MenuItem,
  TextField,
  InputLabel,
  Typography,
  FormControl,
} from '@mui/material';

import axiosInstance from 'src/lib/axios';
import { useTranslate } from 'src/locales/use-locales';

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
  const { t } = useTranslate('dashboard');
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
        <Typography variant="h6">{t('personnel.filters')}</Typography>

        <Stack spacing={2}>
          <TextField
            fullWidth
            label={t('personnel.filters.searchPlaceholder')}
            value={filters.name}
            onChange={(e) => onFilters('name', e.target.value)}
          />

          <FormControl fullWidth>
            <InputLabel>{t('personnel.filters.role')}</InputLabel>
            <Select
              value={filters.role}
              label={t('personnel.filters.role')}
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
            <InputLabel>{t('personnel.filters.status')}</InputLabel>
            <Select
              value={filters.status}
              label={t('personnel.filters.status')}
              onChange={(e) => onFilters('status', e.target.value)}
            >
              <MenuItem value="all">{t('personnel.filters.all')}</MenuItem>
              <MenuItem value="active">{t('personnel.filters.active')}</MenuItem>
              <MenuItem value="inactive">{t('personnel.filters.inactive')}</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Divider />

        <Stack direction="row" spacing={1}>
          <Button fullWidth variant="outlined" onClick={onResetFilters} disabled={!canReset}>
            {t('personnel.reset')}
          </Button>
          <Button fullWidth variant="contained" onClick={onClose}>
            {t('personnel.apply')}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
