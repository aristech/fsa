'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface PendingTask {
  id: string;
  title: string;
  clientName: string;
  clientCompany: string;
  dueDate: string | null;
  phoneNumber: string | null;
  formattedPhone: string | null;
  reminderType: string;
  nextReminder: string | null;
  lastSent: string | null;
}

interface PendingResponse {
  success: boolean;
  tasks: PendingTask[];
  count: number;
  error?: string;
}

export function SmsRemindersPending() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingAll, setProcessingAll] = useState(false);

  const fetchPendingTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/sms-reminders/pending');
      const result: PendingResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch pending tasks');
      }

      setTasks(result.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending tasks');
      console.error('Failed to fetch pending tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  const handleProcessAll = async () => {
    try {
      setProcessingAll(true);

      const response = await fetch('/api/v1/sms-reminders/process', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process reminders');
      }

      // Refresh the list
      await fetchPendingTasks();

      // Show success message (you might want to use a snackbar here)
      console.log('Processed reminders:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process reminders');
      console.error('Failed to process reminders:', err);
    } finally {
      setProcessingAll(false);
    }
  };

  const handleSendSingle = async (taskId: string) => {
    try {
      const response = await fetch(`/api/v1/sms-reminders/send/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateType: 'monthly'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reminder');
      }

      // Refresh the list
      await fetchPendingTasks();

      console.log('Sent reminder:', result);
    } catch (err) {
      console.error('Failed to send reminder:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reminder');
    }
  };

  const getReminderTypeColor = (type: string) => {
    const colors: Record<string, 'primary' | 'secondary' | 'warning' | 'error'> = {
      '1hour': 'error',
      '1day': 'warning',
      '1week': 'primary',
      '1month': 'secondary'
    };
    return colors[type] || 'primary';
  };

  const getReminderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      '1hour': '1 Hour',
      '1day': '1 Day',
      '1week': '1 Week',
      '1month': '1 Month'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Pending SMS Reminders" />
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Pending SMS Reminders"
        subheader={`${tasks.length} tasks eligible for SMS reminders`}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              onClick={fetchPendingTasks}
              startIcon={<Iconify icon="solar:refresh-bold" />}
              size="small"
              disabled={processingAll}
            >
              Refresh
            </Button>
            {tasks.length > 0 && (
              <Button
                onClick={handleProcessAll}
                startIcon={
                  processingAll ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Iconify icon="solar:play-bold" />
                  )
                }
                variant="contained"
                size="small"
                disabled={processingAll}
              >
                {processingAll ? 'Processing...' : 'Process All'}
              </Button>
            )}
          </Stack>
        }
      />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {tasks.length === 0 ? (
          <Alert severity="info">
            No tasks are currently eligible for SMS reminders. Tasks need:
            <ul style={{ marginTop: 8, marginBottom: 0 }}>
              <li>Enabled reminders</li>
              <li>Associated client with valid phone number</li>
              <li>Due date passed reminder threshold</li>
            </ul>
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Reminder</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {task.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack>
                        <Typography variant="body2" fontWeight="medium">
                          {task.clientName}
                        </Typography>
                        {task.clientCompany && (
                          <Typography variant="caption" color="text.secondary">
                            {task.clientCompany}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                      >
                        {task.formattedPhone || task.phoneNumber || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <Typography variant="body2">
                          {fDateTime(task.dueDate)}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No due date
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getReminderTypeLabel(task.reminderType)}
                        color={getReminderTypeColor(task.reminderType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        onClick={() => handleSendSingle(task.id)}
                        startIcon={<Iconify icon="solar:phone-bold" />}
                        size="small"
                        variant="outlined"
                      >
                        Send Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}