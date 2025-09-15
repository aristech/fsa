'use client';

import type { IReport } from 'src/lib/models/Report';

import dayjs from 'dayjs';

import {
  Box,
  Chip,
  Stack,
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  TableContainer,
} from '@mui/material';

import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

// ----------------------------------------------------------------------

interface ReportTimeEntriesTabProps {
  report: IReport;
  onUpdate: (report: IReport) => void;
  canEdit: boolean;
}

export function ReportTimeEntriesTab({ report, onUpdate, canEdit }: ReportTimeEntriesTabProps) {
  const timeEntries = report.timeEntries || [];

  if (timeEntries.length === 0) {
    return (
      <EmptyContent
        title="No time entries"
        description="No time entries have been added to this report yet"
      />
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'labor':
        return 'primary';
      case 'travel':
        return 'info';
      case 'waiting':
        return 'warning';
      case 'equipment':
        return 'secondary';
      case 'other':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Time Entries ({timeEntries.length})
        </Typography>

        <TableContainer>
          <Scrollbar>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Start Time</TableCell>
                  <TableCell>End Time</TableCell>
                  <TableCell align="right">Duration</TableCell>
                  <TableCell>Task</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {timeEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {entry.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entry.category}
                        size="small"
                        color={getCategoryColor(entry.category) as any}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {dayjs(entry.startTime).format('MMM DD, HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {dayjs(entry.endTime).format('MMM DD, HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatDuration(entry.duration)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {entry.taskId ? `Task ${entry.taskId.slice(-8)}` : '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>
      </Box>

      {/* Summary */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 1,
          border: 1,
          borderColor: 'grey.200',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Total Time:</Typography>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
            {report.totalHours ? `${report.totalHours.toFixed(1)}h` : '0h'}
          </Typography>
        </Box>
      </Box>
    </Stack>
  );
}
