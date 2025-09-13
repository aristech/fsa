'use client';

import { useCallback } from 'react';

import {
  Stack,
  Tooltip,
  Toolbar,
  MenuItem,
  TextField,
  IconButton,
  Typography,
  Autocomplete,
  InputAdornment,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface MaterialsTableToolbarProps {
  filters: {
    name: string;
    category: string;
    status: string;
  };
  onFilters: (name: string, value: string) => void;
  numSelected: number;
  categories?: string[];
  onBulkDelete?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onCreate?: () => void;
}

// ----------------------------------------------------------------------

export function MaterialsTableToolbar({
  filters,
  onFilters,
  numSelected,
  categories = [],
  onBulkDelete,
  onExport,
  onImport,
  onCreate,
}: MaterialsTableToolbarProps) {
  const handleFilterName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFilters('name', event.target.value);
    },
    [onFilters]
  );

  const handleFilterCategory = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFilters('category', event.target.value);
    },
    [onFilters]
  );

  const handleFilterStatus = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFilters('status', event.target.value);
    },
    [onFilters]
  );

  return (
    <Toolbar
      sx={{
        height: 96,
        display: 'flex',
        justifyContent: 'space-between',
        p: (theme) => theme.spacing(0, 1, 0, 3),
        ...(numSelected > 0 && {
          color: 'primary.main',
          bgcolor: 'primary.lighter',
        }),
      }}
    >
      {numSelected > 0 ? (
        <Typography component="div" variant="subtitle1">
          {numSelected} selected
        </Typography>
      ) : (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
          <TextField
            fullWidth
            value={filters.name}
            onChange={handleFilterName}
            placeholder="Search materials..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify
                    icon="eva:search-fill"
                    sx={{ color: 'text.disabled', width: 20, height: 20 }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 320 }}
          />

          <Autocomplete
            options={['', ...categories]}
            value={filters.category}
            onChange={(_, newValue) =>
              handleFilterCategory({ target: { value: newValue || '' } } as any)
            }
            freeSolo
            sx={{ minWidth: 160 }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="All Categories"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify
                        icon="solar:layers-bold"
                        sx={{ color: 'text.disabled', width: 20, height: 20 }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            filterOptions={(options, params) => {
              const filtered = options.filter((option) =>
                option.toLowerCase().includes(params.inputValue.toLowerCase())
              );

              const { inputValue } = params;
              const isExisting = options.some((option) => inputValue === option);
              if (inputValue !== '' && !isExisting) {
                filtered.push(`Add "${inputValue}"`);
              }

              return filtered;
            }}
            getOptionLabel={(option) => {
              if (option === '') return 'All Categories';
              if (option.startsWith('Add "')) {
                return option.replace('Add "', '').replace('"', '');
              }
              return option;
            }}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              const isAddOption = option.startsWith('Add "');
              const isAllOption = option === '';

              return (
                <li key={key} {...optionProps}>
                  {isAllOption ? (
                    'All Categories'
                  ) : isAddOption ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconify icon="solar:add-circle-bold" />
                      <span>{option}</span>
                    </Stack>
                  ) : (
                    option
                  )}
                </li>
              );
            }}
          />

          <TextField
            select
            value={filters.status}
            onChange={handleFilterStatus}
            sx={{ minWidth: 140 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify
                    icon="solar:check-circle-bold"
                    sx={{ color: 'text.disabled', width: 20, height: 20 }}
                  />
                </InputAdornment>
              ),
            }}
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="discontinued">Discontinued</MenuItem>
          </TextField>
        </Stack>
      )}

      <Stack direction="row" spacing={1}>
        {numSelected > 0 ? (
          <Tooltip title="Delete Selected">
            <IconButton color="primary" onClick={onBulkDelete}>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Tooltip>
        ) : (
          <>
            <Tooltip title="Import CSV">
              <IconButton onClick={onImport}>
                <Iconify icon="solar:import-bold" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Export">
              <IconButton onClick={onExport}>
                <Iconify icon="solar:export-bold" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>
    </Toolbar>
  );
}
