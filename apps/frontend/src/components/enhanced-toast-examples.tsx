'use client';

import { Box, Stack, Paper, Button, Typography } from '@mui/material';

import { useEnhancedToast } from 'src/hooks/useEnhancedToast';

// ----------------------------------------------------------------------

/**
 * Example component demonstrating the enhanced toast functionality
 * This shows how to migrate from old toast.* calls to the new enhanced system
 */
export function EnhancedToastExamples() {
  const { handleApiResponse, success, error, warning, info, test, subscriptionLimit } = useEnhancedToast();

  // Example server responses
  const mockResponses = {
    // Server response with messageKey (preferred)
    subscriptionLimitError: {
      success: false,
      message: 'User limit exceeded. Current: 2, Limit: 2',
      messageKey: 'business.user_limit_exceeded',
    },

    // Server response with only message
    validationError: {
      success: false,
      message: 'Name and email are required',
    },

    // Server response with messageKey but no message
    storageError: {
      success: false,
      messageKey: 'business.storage_limit_exceeded',
    },

    // Success response with messageKey
    personnelCreated: {
      success: true,
      message: 'Personnel created successfully',
      messageKey: 'common.success.created',
    },

    // Validation error with details
    validationWithDetails: {
      success: false,
      message: 'Validation failed',
      messageKey: 'validation.error.generic',
      details: [
        { field: 'email', message: 'Invalid email format' },
        { field: 'phone', message: 'Phone number is required' },
      ],
    },

    // Network error simulation
    networkError: new Error('Failed to fetch'),
  };

  const handleUpgrade = () => {
    console.log('Redirect to upgrade page');
  };

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>
        Enhanced Toast Examples
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        These examples show how the enhanced toast system works with different server response formats.
      </Typography>

      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Basic Toast Messages
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" color="success" onClick={() => success('Simple success message')}>
              Success Toast
            </Button>
            <Button variant="outlined" color="error" onClick={() => error('Simple error message')}>
              Error Toast
            </Button>
            <Button variant="outlined" color="warning" onClick={() => warning('Simple warning message')}>
              Warning Toast
            </Button>
            <Button variant="outlined" color="info" onClick={() => info('Simple info message')}>
              Info Toast
            </Button>
          </Stack>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Server Response Examples
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="contained"
              color="error"
              onClick={() => handleApiResponse(mockResponses.subscriptionLimitError, { upgradeAction: handleUpgrade })}
            >
              Subscription Limit (with upgrade)
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleApiResponse(mockResponses.validationError)}
            >
              Validation Error
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleApiResponse(mockResponses.storageError)}
            >
              Storage Error (messageKey only)
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleApiResponse(mockResponses.personnelCreated)}
            >
              Success Response
            </Button>
          </Stack>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Specialized Toast Types
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              color="error"
              onClick={() => subscriptionLimit(mockResponses.subscriptionLimitError, handleUpgrade)}
            >
              Subscription Limit Toast
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => handleApiResponse(mockResponses.validationWithDetails)}
            >
              Validation with Details
            </Button>
          </Stack>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Test Functions
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={test}>
              Run All Tests
            </Button>
          </Stack>
        </Box>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Migration Guide
          </Typography>
          <Typography variant="body2" component="div">
            <strong>Before (old way):</strong>
            <br />
            <code>toast.error(response.message || &apos;Failed to create personnel&apos;);</code>
            <br />
            <br />
            <strong>After (enhanced way):</strong>
            <br />
            <code>handleApiResponse(response, {'{ errorFallback: "Failed to create personnel" }'});</code>
            <br />
            <br />
            <strong>Benefits:</strong>
            <ul>
              <li>Automatic messageKey translation support</li>
              <li>Server message priority over fallbacks</li>
              <li>Specialized handling for subscription limits</li>
              <li>Consistent error formatting</li>
              <li>Built-in upgrade prompts</li>
            </ul>
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}