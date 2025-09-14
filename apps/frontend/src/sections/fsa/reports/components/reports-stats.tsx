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
  const { summary, byType, byStatus } = stats;

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

      {/* Reports by Type */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Reports by Type
            </Typography>
            <Stack spacing={2}>
              {byType.map((item, index) => (
                <Box
                  key={index}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        width: 32,
                        height: 32,
                        fontSize: '0.75rem',
                      }}
                    >
                      <Iconify icon={getTypeIcon(item._id)} width={16} />
                    </Avatar>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {item._id}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {fNumber(item.count)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Reports by Status */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Reports by Status
            </Typography>
            <Stack spacing={2}>
              {byStatus.map((item, index) => (
                <Box
                  key={index}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: `${getStatusColor(item._id)}.light`,
                        color: `${getStatusColor(item._id)}.main`,
                        width: 32,
                        height: 32,
                        fontSize: '0.75rem',
                      }}
                    >
                      <Iconify icon={getStatusIcon(item._id)} width={16} />
                    </Avatar>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {item._id.replace('_', ' ')}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {fNumber(item.count)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// Helper functions
function getTypeIcon(type: string) {
  switch (type) {
    case 'daily':
      return 'eva:calendar-fill';
    case 'weekly':
      return 'eva:clock-fill';
    case 'monthly':
      return 'eva:calendar-outline';
    case 'incident':
      return 'eva:alert-triangle-fill';
    case 'maintenance':
      return 'eva:settings-fill';
    case 'inspection':
      return 'eva:search-fill';
    case 'completion':
      return 'eva:checkmark-circle-fill';
    case 'safety':
      return 'eva:shield-fill';
    default:
      return 'eva:file-text-fill';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'draft':
      return 'eva:edit-fill';
    case 'submitted':
      return 'eva:paper-plane-fill';
    case 'under_review':
      return 'eva:clock-fill';
    case 'approved':
      return 'eva:checkmark-circle-fill';
    case 'rejected':
      return 'eva:close-circle-fill';
    case 'published':
      return 'eva:globe-fill';
    default:
      return 'eva:file-text-fill';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'draft':
      return 'default';
    case 'submitted':
      return 'info';
    case 'under_review':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    case 'published':
      return 'primary';
    default:
      return 'default';
  }
}
