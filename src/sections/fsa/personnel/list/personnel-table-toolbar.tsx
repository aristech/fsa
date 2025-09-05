'use client';

import { useState } from 'react';

import { useTheme } from '@mui/material/styles';
import {
  Box,
  Stack,
  Button,
  Tooltip,
  Popover,
  MenuItem,
  Typography,
  OutlinedInput,
  InputAdornment,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface PersonnelTableToolbarProps {
  numSelected: number;
  filters: {
    name: string;
    role: string;
    status: string;
  };
  onFilters: (name: string, value: string) => void;
}

// ----------------------------------------------------------------------

export function PersonnelTableToolbar({
  numSelected,
  filters,
  onFilters,
}: PersonnelTableToolbarProps) {
  const theme = useTheme();
  const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setOpenPopover(event.currentTarget);
  };

  const handleClosePopover = () => {
    setOpenPopover(null);
  };

  return (
    <Box
      sx={{
        px: 2.5,
        py: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <OutlinedInput
          placeholder="Search personnel..."
          value={filters.name}
          onChange={(e) => onFilters('name', e.target.value)}
          startAdornment={
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
          sx={{ width: 300 }}
        />

        <Button
          variant="outlined"
          startIcon={<Iconify icon="eva:options-2-fill" />}
          onClick={handleOpenPopover}
        >
          More Filters
        </Button>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1}>
        {numSelected > 0 && (
          <Typography variant="body2" color="text.secondary">
            {numSelected} selected
          </Typography>
        )}

        <Tooltip title="Add Personnel">
          <Button
            variant="contained"
            startIcon={<Iconify icon="eva:plus-fill" />}
            onClick={() => {
              // Handle add personnel
            }}
          >
            Add Personnel
          </Button>
        </Tooltip>
      </Stack>

      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { width: 200, p: 1 },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2">Quick Filters</Typography>

          <MenuItem
            onClick={() => {
              onFilters('status', 'active');
              handleClosePopover();
            }}
          >
            Active Only
          </MenuItem>

          <MenuItem
            onClick={() => {
              onFilters('status', 'inactive');
              handleClosePopover();
            }}
          >
            Inactive Only
          </MenuItem>

          <MenuItem
            onClick={() => {
              onFilters('role', '');
              handleClosePopover();
            }}
          >
            No Role Assigned
          </MenuItem>
        </Stack>
      </Popover>
    </Box>
  );
}
