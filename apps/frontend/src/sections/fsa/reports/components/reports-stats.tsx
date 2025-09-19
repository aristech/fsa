'use client';

import type { ReportStats } from 'src/lib/models/Report';

import { Box, Card, Grid, Stack, Avatar, Typography, CardContent } from '@mui/material';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface ReportsStatsProps {
  stats: ReportStats;
}

export function ReportsStats({ stats }: ReportsStatsProps) {
  const { summary } = stats;

  const statCards = [
    {
      title: 'Total Reports',
      value: summary.total,
      icon: 'eva:file-text-fill',
      color: 'primary',
    },
    {
      title: 'Draft',
      value: summary.draft,
      icon: 'eva:edit-fill',
      color: 'default',
    },
    {
      title: 'Submitted',
      value: summary.submitted,
      icon: 'eva:paper-plane-fill',
      color: 'info',
    },
    {
      title: 'Approved',
      value: summary.approved,
      icon: 'eva:checkmark-circle-fill',
      color: 'success',
    },
    {
      title: 'Rejected',
      value: summary.rejected,
      icon: 'eva:close-circle-fill',
      color: 'error',
    },
  ];

  return (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      {statCards.map((stat, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={index}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar
                  sx={{
                    bgcolor: `${stat.color}.light`,
                    color: `${stat.color}.main`,
                    width: 48,
                    height: 48,
                  }}
                >
                  <Iconify icon={stat.icon} width={24} />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {fNumber(stat.value)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.title}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
