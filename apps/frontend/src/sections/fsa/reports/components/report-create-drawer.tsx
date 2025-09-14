'use client';

import type { IReport } from 'src/lib/models/Report';

import { useState, useCallback } from 'react';

import { Box, Drawer, Button, Typography } from '@mui/material';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { ReportCreateForm } from './report-create-form';

// ----------------------------------------------------------------------

interface ReportCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (report: IReport) => void;
}

export function ReportCreateDrawer({ open, onClose, onSuccess }: ReportCreateDrawerProps) {
  const [loading, setLoading] = useState(false);

  const handleSuccess = useCallback(
    (report: IReport) => {
      onSuccess(report);
      onClose();
    },
    [onSuccess, onClose]
  );

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor="right"
      slotProps={{
        backdrop: { invisible: true },
        paper: {
          sx: {
            width: { xs: '100%', sm: 600 },
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Create New Report
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fill in the details to create a new report
          </Typography>
        </Box>

        <Button variant="text" size="small" onClick={onClose}>
          <Iconify icon="eva:close-fill" width={20} />
        </Button>
      </Box>

      {/* Content */}
      <Scrollbar fillContent sx={{ flex: 1 }}>
        <Box sx={{ p: 3 }}>
          <ReportCreateForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </Box>
      </Scrollbar>
    </Drawer>
  );
}
