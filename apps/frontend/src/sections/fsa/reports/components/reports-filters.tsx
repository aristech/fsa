'use client';

import type { ReportSearchParams } from 'src/lib/models/Report';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

import {
  Box,
  Chip,
  Grid,
  Stack,
  Button,
  Select,
  MenuItem,
  TextField,
  Typography,
  InputLabel,
  FormControl,
  Autocomplete,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';
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

const sortOptions = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'reportDate', label: 'Report Date' },
  { value: 'totalCost', label: 'Total Cost' },
  { value: 'status', label: 'Status' },
  { value: 'type', label: 'Type' },
];

export function ReportsFilters({ filters, onFiltersChange }: ReportsFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(filters.type ? [filters.type] : []);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    filters.status ? [filters.status] : []
  );
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(
    filters.priority ? [filters.priority] : []
  );

  // Handle search change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  // Handle search submit
  const handleSearchSubmit = useCallback(() => {
    onFiltersChange({ search: searchTerm || undefined });
  }, [searchTerm, onFiltersChange]);

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
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    onFiltersChange({
      search: undefined,
      type: undefined,
      status: undefined,
      priority: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }, [onFiltersChange]);

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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
        </Box>

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
                <TextField {...params} label="Report Type" placeholder="Select types..." />
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
                <TextField {...params} label="Status" placeholder="Select statuses..." />
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
                <TextField {...params} label="Priority" placeholder="Select priorities..." />
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

          {/* Sort Options */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Stack direction="row" spacing={1}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filters.sortBy || 'createdAt'}
                  label="Sort By"
                  onChange={handleSortChange}
                >
                  {sortOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Order</InputLabel>
                <Select
                  value={filters.sortOrder || 'desc'}
                  label="Order"
                  onChange={handleSortOrderChange}
                >
                  <MenuItem value="asc">Asc</MenuItem>
                  <MenuItem value="desc">Desc</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Grid>

          {/* Date Range */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MobileDatePicker
              label="From Date"
              value={filters.dateFrom ? dayjs(filters.dateFrom) : null}
              onChange={(date) => handleDateFromChange(date?.toDate() || null)}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MobileDatePicker
              label="To Date"
              value={filters.dateTo ? dayjs(filters.dateTo) : null}
              onChange={(date) => handleDateToChange(date?.toDate() || null)}
            />
          </Grid>
        </Grid>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Active Filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {filters.search && (
                <Chip
                  label={`Search: "${filters.search}"`}
                  onDelete={() => {
                    setSearchTerm('');
                    onFiltersChange({ search: undefined });
                  }}
                  size="small"
                />
              )}
              {filters.type && (
                <Chip
                  label={`Type: ${filters.type}`}
                  onDelete={() => {
                    setSelectedTypes([]);
                    onFiltersChange({ type: undefined });
                  }}
                  size="small"
                />
              )}
              {filters.status && (
                <Chip
                  label={`Status: ${filters.status.replace('_', ' ')}`}
                  onDelete={() => {
                    setSelectedStatuses([]);
                    onFiltersChange({ status: undefined });
                  }}
                  size="small"
                />
              )}
              {filters.priority && (
                <Chip
                  label={`Priority: ${filters.priority}`}
                  onDelete={() => {
                    setSelectedPriorities([]);
                    onFiltersChange({ priority: undefined });
                  }}
                  size="small"
                />
              )}
              {filters.dateFrom && (
                <Chip
                  label={`From: ${dayjs(filters.dateFrom).format('MMM DD, YYYY')}`}
                  onDelete={() => onFiltersChange({ dateFrom: undefined })}
                  size="small"
                />
              )}
              {filters.dateTo && (
                <Chip
                  label={`To: ${dayjs(filters.dateTo).format('MMM DD, YYYY')}`}
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
