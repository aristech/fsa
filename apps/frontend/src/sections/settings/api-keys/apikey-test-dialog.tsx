'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { apiKeysApi, type ApiKey, type ApiKeyStatus, type ApiKeyUsageStats } from 'src/services/api-keys';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  apiKey: ApiKey | null;
  onClose: () => void;
};

export function ApiKeyTestDialog({ open, apiKey, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [usageStats, setUsageStats] = useState<ApiKeyUsageStats | null>(null);
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && apiKey) {
      loadApiKeyData();
    }
  }, [open, apiKey, loadApiKeyData]);

  const loadApiKeyData = useCallback(async () => {
    if (!apiKey) return;

    setLoading(true);
    setError(null);

    try {
      const [usageResponse, statusResponse] = await Promise.all([
        apiKeysApi.getUsageStats(apiKey._id),
        apiKeysApi.testApiKey(apiKey._id),
      ]);

      if (usageResponse.success) {
        setUsageStats(usageResponse.data);
      }

      if (statusResponse.success) {
        setStatus(statusResponse.data);
      }
    } catch (err: any) {
      console.error('Failed to load API key data:', err);
      setError(err.message || 'Failed to load API key data');
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const handleClose = () => {
    setUsageStats(null);
    setStatus(null);
    setError(null);
    onClose();
  };

  if (!apiKey) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>API Key Test & Usage - {apiKey.name}</DialogTitle>

      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Stack spacing={3}>
            {/* Status Information */}
            {status && (
              <Card sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Status
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
                  <Chip
                    label={status.valid ? 'Valid' : 'Invalid'}
                    color={status.valid ? 'success' : 'error'}
                    size="small"
                  />
                  <Chip
                    label={status.active ? 'Active' : 'Inactive'}
                    color={status.active ? 'success' : 'default'}
                    size="small"
                  />
                  <Chip
                    label={status.expired ? 'Expired' : 'Not Expired'}
                    color={status.expired ? 'error' : 'success'}
                    size="small"
                  />
                </Stack>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Rate Limit:</strong> {status.rateLimitPerHour.toLocaleString()} requests/hour
                </Typography>

                {status.expiresAt && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Expires:</strong> {new Date(status.expiresAt).toLocaleString()}
                  </Typography>
                )}
              </Card>
            )}

            {/* Usage Statistics */}
            {usageStats && (
              <Card sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Usage Statistics
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Total Usage:</strong> {usageStats.totalUsage.toLocaleString()} requests
                  </Typography>
                  <Typography variant="body2">
                    <strong>Average Daily Usage:</strong> {usageStats.avgUsagePerDay.toLocaleString()} requests/day
                  </Typography>
                  <Typography variant="body2">
                    <strong>Days Since Creation:</strong> {usageStats.daysSinceCreation} days
                  </Typography>
                  {usageStats.lastUsedAt && (
                    <Typography variant="body2">
                      <strong>Last Used:</strong> {new Date(usageStats.lastUsedAt).toLocaleString()}
                    </Typography>
                  )}
                </Stack>
              </Card>
            )}

            {/* Permissions */}
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Permissions
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {apiKey.permissions.map((permission) => (
                  <Chip
                    key={permission}
                    label={permission === '*' ? 'All Permissions' : permission}
                    color={permission === '*' ? 'primary' : 'default'}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Stack>
            </Card>

            {/* API Usage Example */}
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                API Usage Example
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Use this API key in your applications by including it in the Authorization header:
              </Typography>
              <Box
                sx={{
                  bgcolor: 'grey.100',
                  p: 2,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  mt: 1,
                }}
              >
                curl -H &quot;Authorization: Bearer YOUR_API_KEY&quot; \\{'\n'}
                {'     '}-H &quot;Content-Type: application/json&quot; \\{'\n'}
                {'     '}{window.location.origin}/api/v1/public/work-orders
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Replace YOUR_API_KEY with your actual API key
              </Typography>
            </Card>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        {!loading && !error && (
          <Button
            variant="contained"
            onClick={loadApiKeyData}
            startIcon={<CircularProgress size={16} sx={{ color: 'white' }} />}
            disabled={loading}
          >
            Refresh
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}