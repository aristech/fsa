'use client';

import { Badge, Button, IconButton } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface PersonnelFiltersButtonProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  canReset: boolean;
  onResetFilters: () => void;
}

// ----------------------------------------------------------------------

export function PersonnelFiltersButton({
  open,
  onOpen,
  onClose,
  canReset,
  onResetFilters,
}: PersonnelFiltersButtonProps) {
  const renderFilters = (
    <>
      <IconButton onClick={open ? onClose : onOpen}>
        <Badge color="error" variant="dot" invisible={!canReset}>
          <Iconify icon="ic:round-filter-list" />
        </Badge>
      </IconButton>

      <Button
        disableRipple
        color="inherit"
        endIcon={<Iconify icon={open ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'} />}
        onClick={open ? onClose : onOpen}
        sx={{
          fontWeight: 600,
          textTransform: 'none',
          p: 0,
          '&:hover': { bgcolor: 'transparent' },
        }}
      >
        Filters
      </Button>
    </>
  );

  return renderFilters;
}
