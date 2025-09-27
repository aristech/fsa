'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface TestResult {
  taskId: string;
  success: boolean;
  phoneNumber?: string;
  messageId?: string;
  channel?: 'sms' | 'viber';
  error?: string;
}

interface TestResponse {
  success: boolean;
  result: TestResult;
}

interface SmsRemindersTestProps {
  onTestComplete?: () => void;
}

export function SmsRemindersTest({ onTestComplete }: SmsRemindersTestProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('Test message from FSA - Your SMS/Viber integration is working!');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/v1/sms-reminders/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          message: message.trim() || 'Test message from FSA'
        }),
      });

      const data: TestResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.result?.error || 'Test failed');
      }

      setResult(data.result);
      onTestComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
      console.error('SMS test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setResult(null);
    setError(null);
    setPhoneNumber('');
    setMessage('Test message from FSA - Your SMS/Viber integration is working!');
  };

  return (
    <Card>
      <CardHeader
        title="Test SMS/Viber Service"
        subheader="Send a test message to verify your configuration"
      />
      <CardContent>
        <Stack spacing={3}>
          <TextField
            label="Phone Number"
            placeholder="+30-693-123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            fullWidth
            disabled={loading}
            helperText="Enter phone number in international format (e.g., +30-693-123-4567)"
          />

          <TextField
            label="Test Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            rows={3}
            fullWidth
            disabled={loading}
            helperText="Customize your test message"
          />

          <Stack direction="row" spacing={2}>
            <Button
              onClick={handleTest}
              disabled={loading || !phoneNumber.trim()}
              startIcon={
                loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Iconify icon="solar:phone-bold" />
                )
              }
              variant="contained"
            >
              {loading ? 'Sending...' : 'Send Test Message'}
            </Button>

            <Button
              onClick={handleClear}
              disabled={loading}
              startIcon={<Iconify icon="solar:trash-bin-minimalistic-bold" />}
              variant="outlined"
            >
              Clear
            </Button>
          </Stack>

          {/* Results */}
          {result && (
            <Box>
              {result.success ? (
                <Alert severity="success">
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Test message sent successfully!</strong>
                  </Typography>
                  <Typography variant="body2" component="div">
                    • Phone: {result.phoneNumber}<br />
                    • Channel: {result.channel?.toUpperCase()}<br />
                    • Message ID: {result.messageId}
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="error">
                  <Typography variant="body2">
                    <strong>Test failed:</strong> {result.error}
                  </Typography>
                  {result.phoneNumber && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Phone number formatted as: {result.phoneNumber}
                    </Typography>
                  )}
                </Alert>
              )}
            </Box>
          )}

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {/* Help Text */}
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Note:</strong> If your Yuboto account balance is 0, the test will connect successfully
              but no message will be sent. This confirms your integration is working correctly.
            </Typography>
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
}