'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface SmsConfig {
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

interface ConfigResponse {
  success: boolean;
  status: SmsConfig;
  service: any;
}

interface SmsRemindersConfigProps {
  onUpdate?: () => void;
}

export function SmsRemindersConfig({ onUpdate }: SmsRemindersConfigProps) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/sms-reminders/status');
      const result: ConfigResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.status?.toString() || 'Failed to fetch configuration');
      }

      setConfig(result.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      console.error('Failed to fetch SMS config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader title="Configuration" />
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error || !config) {
    return (
      <Card>
        <CardHeader title="Configuration" />
        <CardContent>
          <Alert severity="error">{error || 'Failed to load configuration'}</Alert>
          <Button
            onClick={fetchConfig}
            startIcon={<Iconify icon="solar:refresh-bold" />}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Configuration"
        subheader="Current SMS/Viber service settings"
        action={
          <Button
            onClick={fetchConfig}
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
          <FormControl>
            <FormLabel component="legend">Service Status</FormLabel>
            <FormControlLabel
              control={<Switch checked={config.enabled} disabled />}
              label={config.enabled ? 'Enabled' : 'Disabled'}
            />
            <Typography variant="caption" color="text.secondary">
              Controlled via environment variables (SMS_REMINDERS_ENABLED)
            </Typography>
          </FormControl>

          {/* API Configuration */}
          <Box>
            <Typography variant="h6" gutterBottom>
              API Settings
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Sender Name"
                value={config.sender}
                disabled
                helperText="The name that appears as the sender of SMS/Viber messages"
                size="small"
              />

              <TextField
                label="Priority Channel"
                value={config.priority.toUpperCase()}
                disabled
                helperText="Primary channel for sending messages (Viber or SMS)"
                size="small"
              />

              <FormControlLabel
                control={<Switch checked={config.fallbackToSms} disabled />}
                label="SMS Fallback"
              />
              <Typography variant="caption" color="text.secondary">
                Automatically send SMS if Viber message fails
              </Typography>
            </Stack>
          </Box>

          {/* Company Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Company Information
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              This information is used in message templates
            </Typography>
            <Stack spacing={2}>
              <TextField label="Company Name" value={config.company.name} disabled size="small" />

              <TextField label="Company Phone" value={config.company.phone} disabled size="small" />

              <TextField label="Company Email" value={config.company.email} disabled size="small" />
            </Stack>
          </Box>

          {/* Configuration Help */}
          <Alert severity="info">
            <Typography variant="body2" gutterBottom>
              <strong>Configuration is managed via environment variables:</strong>
            </Typography>
            <Typography
              variant="body2"
              component="div"
              sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            >
              SMS_REMINDERS_ENABLED=true
              <br />
              YUBOTO_API_KEY=your_api_key
              <br />
              YUBOTO_SENDER={config.sender}
              <br />
              YUBOTO_PRIORITY={config.priority}
              <br />
              COMPANY_NAME=&quot;{config.company.name}&quot;
              <br />
              COMPANY_PHONE=&quot;{config.company.phone}&quot;
            </Typography>
          </Alert>

          {/* Status Alerts */}
          {!config.configured && (
            <Alert severity="error">
              SMS service is not properly configured. Please set up your environment variables.
            </Alert>
          )}

          {config.configured && !config.enabled && (
            <Alert severity="warning">
              SMS service is configured but disabled. Set SMS_REMINDERS_ENABLED=true to enable.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
