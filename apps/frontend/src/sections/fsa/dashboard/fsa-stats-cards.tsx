'use client';

import Grid from '@mui/material/Grid';
import { alpha, useTheme } from '@mui/material/styles';
import { Card, Stack, Typography, CardContent } from '@mui/material';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STATS = [
  {
    title: 'Total Work Orders',
    value: 24,
    icon: 'solar:clipboard-list-bold-duotone',
    color: 'primary',
  },
  {
    title: 'Active Work Orders',
    value: 8,
    icon: 'solar:clock-circle-bold-duotone',
    color: 'info',
  },
  {
    title: 'Completed Today',
    value: 12,
    icon: 'solar:check-circle-bold-duotone',
    color: 'success',
  },
  {
    title: 'Technicians Online',
    value: 5,
    icon: 'solar:users-group-rounded-bold-duotone',
    color: 'warning',
  },
];

// ----------------------------------------------------------------------

export function FsaStatsCards() {
  const theme = useTheme();

  return (
    <Grid container spacing={3}>
      {STATS.map((stat) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.title}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <div>
                  <Typography variant="h4">{fNumber(stat.value)}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {stat.title}
                  </Typography>
                </div>
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: alpha((theme.palette as any)[stat.color].main, 0.08),
                  }}
                >
                  <Iconify
                    icon={stat.icon as any}
                    width={32}
                    sx={{ color: (theme.palette as any)[stat.color].main }}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
