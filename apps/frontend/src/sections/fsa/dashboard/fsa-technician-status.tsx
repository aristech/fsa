'use client';

import { alpha, useTheme } from '@mui/material/styles';
import { Card, Chip, Stack, Avatar, CardHeader, Typography, CardContent } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const TECHNICIANS = [
  {
    id: '1',
    name: 'John Smith',
    avatar: null,
    status: 'online',
    currentWorkOrder: 'WO-000001',
    location: 'Downtown',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    avatar: null,
    status: 'busy',
    currentWorkOrder: 'WO-000002',
    location: 'Industrial Zone',
  },
  {
    id: '3',
    name: 'Mike Wilson',
    avatar: null,
    status: 'offline',
    currentWorkOrder: null,
    location: null,
  },
  {
    id: '4',
    name: 'Emily Davis',
    avatar: null,
    status: 'online',
    currentWorkOrder: null,
    location: 'Office',
  },
];

// ----------------------------------------------------------------------

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online':
      return 'success';
    case 'busy':
      return 'warning';
    case 'offline':
      return 'default';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'online':
      return 'eva:radio-button-on-fill';
    case 'busy':
      return 'eva:clock-fill';
    case 'offline':
      return 'eva:radio-button-off-fill';
    default:
      return 'eva:radio-button-off-fill';
  }
};

// ----------------------------------------------------------------------

export function FsaTechnicianStatus() {
  const theme = useTheme();

  return (
    <Card>
      <CardHeader title="Technician Status" />
      <CardContent>
        <Stack spacing={3}>
          {TECHNICIANS.map((technician) => (
            <Stack
              key={technician.id}
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{
                p: 2,
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Avatar
                src={technician.avatar}
                alt={technician.name}
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                }}
              >
                {technician.name.charAt(0)}
              </Avatar>

              <Stack spacing={0.5} sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle2">{technician.name}</Typography>
                  <Chip
                    icon={<Iconify icon={getStatusIcon(technician.status)} width={12} />}
                    label={technician.status}
                    color={getStatusColor(technician.status)}
                    size="small"
                    variant="soft"
                  />
                </Stack>
                {technician.currentWorkOrder && (
                  <Typography variant="caption" color="text.secondary">
                    Working on: {technician.currentWorkOrder}
                  </Typography>
                )}
                {technician.location && (
                  <Typography variant="caption" color="text.secondary">
                    Location: {technician.location}
                  </Typography>
                )}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
