'use client';

import type { ReportSearchParams } from 'src/lib/models/Report';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

// Simple type for the Created By filter options
interface UserOption {
  _id: string;
  name: string;
  email: string;
}

import {
  Box,
  Chip,
  Grid,
  Stack,
  Select,
  MenuItem,
  TextField,
  Typography,
  InputLabel,
  FormControl,
  Autocomplete,
} from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';
import { personnelService } from 'src/lib/services/personnel-service';

import { MobileDatePicker } from 'src/components/mobile';

// ----------------------------------------------------------------------

interface ReportsFiltersProps {
  filters: ReportSearchParams;
  onFiltersChange: (filters: Partial<ReportSearchParams>) => void;
}

const reportTypes = [
  'daily',
  'weekly',
  'monthly',
  'incident',
  'maintenance',
  'inspection',
  'completion',
  'safety',
];

const reportStatuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'published'];

const priorities = ['low', 'medium', 'high', 'urgent'];

const getSortOptions = (t: any) => [
  { value: 'createdAt', label: t('reports.sortOptions.createdDate') },
  { value: 'reportDate', label: t('reports.sortOptions.reportDate') },
  { value: 'totalCost', label: t('reports.sortOptions.totalCost') },
  { value: 'status', label: t('reports.sortOptions.status') },
  { value: 'type', label: t('reports.sortOptions.type') },
];

export function ReportsFilters({ filters, onFiltersChange }: ReportsFiltersProps) {
  const { t } = useTranslate('dashboard');
  const [personnel, setPersonnel] = useState<UserOption[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(filters.type ? [filters.type] : []);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    filters.status ? [filters.status] : []
  );
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(
    filters.priority ? [filters.priority] : []
  );
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<UserOption | null>(null);

  // Load personnel for Created By filter
  useEffect(() => {
    const loadPersonnel = async () => {
      try {
        const response = await personnelService.getPersonnel({ limit: 1000 });
        if (response.success) {
          // Map personnel to users format for the filter
          const users: UserOption[] = response.data.map((p) => ({
            _id: p.user?._id || p.userId,
            name: p.user?.name || p.user?.email || 'Unknown',
            email: p.user?.email || '',
          }));

          setPersonnel(users);

          // If there's a createdBy filter, find and set the selected user
          if (filters.createdBy) {
            const user = users.find((u) => u._id === filters.createdBy);
            if (user) {
              setSelectedCreatedBy(user);
            }
          }
        }
      } catch (error) {
        console.error('Error loading personnel:', error);
      }
    };
    loadPersonnel();
  }, [filters.createdBy]);

  // Handle search change
  // const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
  //   setSearchTerm(event.target.value);
  // }, []);

  // Handle search submit
  // const handleSearchSubmit = useCallback(() => {
  //   onFiltersChange({ search: searchTerm || undefined });
  // }, [searchTerm, onFiltersChange]);

  // Handle type change
  const handleTypeChange = useCallback(
    (event: any, newValue: string[]) => {
      setSelectedTypes(newValue);
      onFiltersChange({ type: newValue.length === 1 ? newValue[0] : undefined });
    },
    [onFiltersChange]
  );

  // Handle status change
  const handleStatusChange = useCallback(
    (event: any, newValue: string[]) => {
      setSelectedStatuses(newValue);
      onFiltersChange({ status: newValue.length === 1 ? newValue[0] : undefined });
    },
    [onFiltersChange]
  );

  // Handle priority change
  const handlePriorityChange = useCallback(
    (event: any, newValue: string[]) => {
      setSelectedPriorities(newValue);
      onFiltersChange({ priority: newValue.length === 1 ? newValue[0] : undefined });
    },
    [onFiltersChange]
  );

  // Handle created by change
  const handleCreatedByChange = useCallback(
    (event: any, newValue: UserOption | null) => {
      setSelectedCreatedBy(newValue);
      onFiltersChange({ createdBy: newValue?._id || undefined });
    },
    [onFiltersChange]
  );

  // Handle date range change
  const handleDateFromChange = useCallback(
    (date: Date | null) => {
      onFiltersChange({ dateFrom: date || undefined });
    },
    [onFiltersChange]
  );

  const handleDateToChange = useCallback(
    (date: Date | null) => {
      onFiltersChange({ dateTo: date || undefined });
    },
    [onFiltersChange]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (event: any) => {
      const value = event.target.value;
      onFiltersChange({ sortBy: value });
    },
    [onFiltersChange]
  );

  // Handle sort order change
  const handleSortOrderChange = useCallback(
    (event: any) => {
      const value = event.target.value as 'asc' | 'desc';
      onFiltersChange({ sortOrder: value });
    },
    [onFiltersChange]
  );

  // Handle clear filters
  // const handleClearFilters = useCallback(() => {
  //   setSearchTerm('');
  //   setSelectedTypes([]);
  //   setSelectedStatuses([]);
  //   setSelectedPriorities([]);
  //   onFiltersChange({
  //     search: undefined,
  //     type: undefined,
  //     status: undefined,
  //     priority: undefined,
  //     dateFrom: undefined,
  //     dateTo: undefined,
  //     sortBy: 'createdAt',
  //     sortOrder: 'desc',
  //   });
  // }, [onFiltersChange]);

  // Count active filters
  const activeFiltersCount = [
    filters.search,
    filters.type,
    filters.status,
    filters.priority,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Search and Quick Actions */}
        {/* <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder="Search reports by location, client, or content..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
            InputProps={{
              startAdornment: (
                <Iconify icon="eva:search-fill" sx={{ mr: 1, color: 'text.disabled' }} />
              ),
            }}
            sx={{ maxWidth: 400 }}
          />

          <Button
            variant="outlined"
            onClick={handleSearchSubmit}
            startIcon={<Iconify icon="eva:search-fill" />}
          >
            Search
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant="text"
              onClick={handleClearFilters}
              startIcon={<Iconify icon="eva:close-circle-fill" />}
              color="error"
            >
              Clear Filters ({activeFiltersCount})
            </Button>
          )}
        </Box> */}

        {/* Filters Grid */}
        <Grid container spacing={3}>
          {/* Report Type */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Autocomplete
              multiple
              options={reportTypes}
              value={selectedTypes}
              onChange={handleTypeChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('reports.filters.reportType')}
                  placeholder={t('reports.filters.selectTypes')}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                ))
              }
            />
          </Grid>

          {/* Status */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Autocomplete
              multiple
              options={reportStatuses}
              value={selectedStatuses}
              onChange={handleStatusChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('reports.filters.status')}
                  placeholder={t('reports.filters.selectStatuses')}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option.replace('_', ' ')}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                ))
              }
            />
          </Grid>

          {/* Priority */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Autocomplete
              multiple
              options={priorities}
              value={selectedPriorities}
              onChange={handlePriorityChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('reports.filters.priority')}
                  placeholder={t('reports.filters.selectPriorities')}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                ))
              }
            />
          </Grid>

          {/* Created By */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Autocomplete
              options={personnel}
              value={selectedCreatedBy}
              onChange={handleCreatedByChange}
              getOptionLabel={(option) => option.name || option.email}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('reports.filters.createdBy', { defaultValue: 'Created By' })}
                  placeholder={t('reports.filters.selectCreatedBy', { defaultValue: 'Select user' })}
                />
              )}
            />
          </Grid>

          {/* Sort Options */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Stack direction="row" spacing={1}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('reports.filters.sortBy')}</InputLabel>
                <Select
                  value={filters.sortBy || 'createdAt'}
                  label={t('reports.filters.sortBy')}
                  onChange={handleSortChange}
                >
                  {getSortOptions(t).map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>{t('reports.filters.order')}</InputLabel>
                <Select
                  value={filters.sortOrder || 'desc'}
                  label={t('reports.filters.order')}
                  onChange={handleSortOrderChange}
                >
                  <MenuItem value="asc">{t('reports.sortOrder.asc')}</MenuItem>
                  <MenuItem value="desc">{t('reports.sortOrder.desc')}</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Grid>

          {/* Date Range */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MobileDatePicker
              label={t('reports.filters.fromDate')}
              value={filters.dateFrom ? dayjs(filters.dateFrom) : null}
              onChangeAction={(date) => handleDateFromChange(date?.toDate() || null)}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MobileDatePicker
              label={t('reports.filters.toDate')}
              value={filters.dateTo ? dayjs(filters.dateTo) : null}
              onChangeAction={(date) => handleDateToChange(date?.toDate() || null)}
            />
          </Grid>
        </Grid>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('reports.filters.activeFilters')}:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {filters.search && (
                <Chip
                  label={`${t('reports.filters.search')}: "${filters.search}"`}
                  onDelete={() => {
                    onFiltersChange({ search: undefined });
                  }}
                  size="small"
                />
              )}
              {filters.type && (
                <Chip
                  label={`${t('reports.filters.type')}: ${filters.type}`}
                  onDelete={() => {
                    setSelectedTypes([]);
                    onFiltersChange({ type: undefined });
                  }}
                  size="small"
                />
              )}
              {filters.status && (
                <Chip
                  label={`${t('reports.filters.status')}: ${filters.status.replace('_', ' ')}`}
                  onDelete={() => {
                    setSelectedStatuses([]);
                    onFiltersChange({ status: undefined });
                  }}
                  size="small"
                />
              )}
              {filters.priority && (
                <Chip
                  label={`${t('reports.filters.priority')}: ${filters.priority}`}
                  onDelete={() => {
                    setSelectedPriorities([]);
                    onFiltersChange({ priority: undefined });
                  }}
                  size="small"
                />
              )}
              {filters.createdBy && selectedCreatedBy && (
                <Chip
                  label={`${t('reports.filters.createdBy', { defaultValue: 'Created By' })}: ${selectedCreatedBy.name || selectedCreatedBy.email}`}
                  onDelete={() => {
                    setSelectedCreatedBy(null);
                    onFiltersChange({ createdBy: undefined });
                  }}
                  size="small"
                />
              )}
              {filters.dateFrom && (
                <Chip
                  label={`${t('reports.filters.from')}: ${dayjs(filters.dateFrom).format('MMM DD, YYYY')}`}
                  onDelete={() => onFiltersChange({ dateFrom: undefined })}
                  size="small"
                />
              )}
              {filters.dateTo && (
                <Chip
                  label={`${t('reports.filters.to')}: ${dayjs(filters.dateTo).format('MMM DD, YYYY')}`}
                  onDelete={() => onFiltersChange({ dateTo: undefined })}
                  size="small"
                />
              )}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
