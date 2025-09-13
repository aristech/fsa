'use client';

import type { IReport } from 'src/lib/models/Report';

import dayjs from 'dayjs';

import { Box, Chip, Typography } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface ReportTimeEntriesTabProps {
  report: IReport;
  onUpdate: (updatedReport: IReport) => void;
  canEdit: boolean;
}

export function ReportTimeEntriesTab({ report, onUpdate, canEdit }: ReportTimeEntriesTabProps) {
  const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  if (!report.timeEntries || report.timeEntries.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Iconify icon="solar:clock-circle-outline" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Time Entries
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No time entries have been recorded for this report.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        Time Entries ({report.timeEntries.length})
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {report.timeEntries.map((entry) => (
          <Box
            key={entry._id}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              backgroundColor: 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                {entry.description}
              </Typography>
              <Chip
                label={entry.category}
                size="small"
                variant="outlined"
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Iconify icon="eva:clock-fill" width={14} />
                <Typography variant="body2" color="text.secondary">
                  {dayjs(entry.startTime).format('HH:mm')} - {dayjs(entry.endTime).format('HH:mm')}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Iconify icon="eva:calendar-fill" width={14} />
                <Typography variant="body2" color="text.secondary">
                  {dayjs(entry.startTime).format('MMM DD, YYYY')}
                </Typography>
              </Box>
            </Box>

            <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
              Duration: {formatDuration(entry.duration)}
            </Typography>

            {entry.taskId && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <Iconify icon="eva:checkmark-square-fill" width={14} />
                <Typography variant="caption" color="text.secondary">
                  Linked to task
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Summary */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Total Hours:
        </Typography>
        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
          {report.totalHours ? `${report.totalHours.toFixed(1)}h` : '0h'}
        </Typography>
      </Box>

      {/* Category Breakdown */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
          Time by Category:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {['labor', 'travel', 'waiting', 'equipment', 'other'].map(category => {
            const categoryEntries = report.timeEntries?.filter(entry => entry.category === category) || [];
            const totalMinutes = categoryEntries.reduce((sum, entry) => sum + entry.duration, 0);

            if (totalMinutes === 0) return null;

            return (
              <Chip
                key={category}
                label={`${category.charAt(0).toUpperCase() + category.slice(1)}: ${formatDuration(totalMinutes)}`}
                size="small"
                variant="outlined"
                color="primary"
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}