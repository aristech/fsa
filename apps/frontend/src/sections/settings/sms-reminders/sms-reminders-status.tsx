'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface SmsStatus {
  enabled: boolean;
  configured: boolean;
  sender: string;
  priority: 'sms' | 'viber';
  fallbackToSms: boolean;
  company: {
    name: string;
    phone: string;
    email: string;
  };
}

interface ServiceStatus {
  success: boolean;
  balance?: {
    balance: number;
    currency: string;
  };
  error?: string;
}

interface StatusResponse {
  success: boolean;
  status: SmsStatus;
  service: ServiceStatus | null;
}

export function SmsRemindersStatus() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/sms-reminders/status');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch status');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch SMS status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getStatusColor = (enabled: boolean, configured: boolean) => {
    if (!configured) return 'error';
    if (!enabled) return 'warning';
    return 'success';
  };

  const getStatusText = (enabled: boolean, configured: boolean) => {
    if (!configured) return 'Not Configured';
    if (!enabled) return 'Disabled';
    return 'Active';
  };

  const getBalanceColor = (balance?: number) => {
    if (!balance || balance === 0) return 'error';
    if (balance < 1) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="SMS/Viber Service Status" />
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader title="SMS/Viber Service Status" />
        <CardContent>
          <Alert severity="error">
            {error || 'Failed to load status'}
          </Alert>
          <Button
            onClick={fetchStatus}
            startIcon={<Iconify icon="solar:refresh-bold" />}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { status, service } = data;

  return (
    <Card>
      <CardHeader
        title="SMS/Viber Service Status"
        action={
          <Button
            onClick={fetchStatus}
            startIcon={<Iconify icon="solar:refresh-bold" />}
            size="small"
          >
            Refresh
          </Button>
        }
      />
      <CardContent>
        <Stack spacing={3}>
          {/* Service Status */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={2} mb={2}>
              <Typography variant="h6">Service Configuration</Typography>
              <Chip
                label={getStatusText(status.enabled, status.configured)}
                color={getStatusColor(status.enabled, status.configured)}
                size="small"
                icon={
                  <Iconify
                    icon={status.enabled && status.configured ? "solar:check-circle-bold" : "solar:close-circle-bold"}
                  />
                }
              />
            </Stack>

            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Typography variant="body2">
                  {status.enabled ? 'Enabled' : 'Disabled'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Sender Name
                </Typography>
                <Typography variant="body2">{status.sender}</Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Priority Channel
                </Typography>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {status.priority}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  SMS Fallback
                </Typography>
                <Typography variant="body2">
                  {status.fallbackToSms ? 'Enabled' : 'Disabled'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Account Balance */}
          {service && (
            <Box>
              <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                <Typography variant="h6">Yuboto Account</Typography>
                <Chip
                  label={service.success ? 'Connected' : 'Connection Failed'}
                  color={service.success ? 'success' : 'error'}
                  size="small"
                  icon={
                    <Iconify
                      icon={service.success ? "solar:wifi-router-bold" : "solar:wifi-router-minimalistic-bold"}
                    />
                  }
                />
              </Stack>

              {service.success && service.balance && (
                <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Account Balance
                    </Typography>
                    <Chip
                      label={`${service.balance.balance} ${service.balance.currency}`}
                      color={getBalanceColor(service.balance.balance)}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>
              )}

              {service.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {service.error}
                </Alert>
              )}
            </Box>
          )}

          {/* Warnings */}
          {status.configured && !status.enabled && (
            <Alert severity="warning">
              SMS reminders are configured but disabled. Enable them in your environment configuration.
            </Alert>
          )}

          {!status.configured && (
            <Alert severity="error">
              SMS reminders are not configured. Please set up your Yuboto API key and configuration.
            </Alert>
          )}

          {service?.success && service?.balance?.balance === 0 && (
            <Alert severity="warning">
              Your Yuboto account balance is 0. Top up your account to send messages.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}