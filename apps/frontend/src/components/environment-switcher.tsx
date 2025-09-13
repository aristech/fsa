'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { Box, Menu, Button, MenuItem, Typography } from '@mui/material';

import { useEnvironmentAccess } from 'src/hooks/use-environment-access';

import { Iconify } from 'src/components/iconify';

export function EnvironmentSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccessField, canAccessOffice, hasBothAccess } = useEnvironmentAccess();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const currentEnvironment = pathname.startsWith('/field') ? 'field' : 'office';

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEnvironmentChange = (environment: 'field' | 'office') => {
    if (environment === 'field' && canAccessField) {
      router.push('/field');
    } else if (environment === 'office' && canAccessOffice) {
      router.push('/dashboard');
    }
    handleClose();
  };

  // Don't show switcher if user only has access to one environment
  if (!hasBothAccess) {
    return null;
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={handleClick}
        startIcon={
          <Iconify
            icon={currentEnvironment === 'field' ? 'solar:smartphone-bold' : 'solar:monitor-bold'}
            width={16}
          />
        }
        endIcon={<Iconify icon="eva:arrow-ios-downward-fill" width={16} />}
        sx={{ gap: 1 }}
      >
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {currentEnvironment === 'field' ? 'Field' : 'Office'}
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => handleEnvironmentChange('office')}
          disabled={!canAccessOffice}
          sx={{ minWidth: 200 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="solar:monitor-bold" width={20} />
              <Typography>Office Environment</Typography>
            </Box>
            {currentEnvironment === 'office' && (
              <Iconify icon="eva:checkmark-fill" width={20} sx={{ color: 'primary.main' }} />
            )}
          </Box>
        </MenuItem>

        <MenuItem
          onClick={() => handleEnvironmentChange('field')}
          disabled={!canAccessField}
          sx={{ minWidth: 200 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="solar:smartphone-bold" width={20} />
              <Typography>Field Environment</Typography>
            </Box>
            {currentEnvironment === 'field' && (
              <Iconify icon="eva:checkmark-fill" width={20} sx={{ color: 'primary.main' }} />
            )}
          </Box>
        </MenuItem>
      </Menu>
    </>
  );
}
