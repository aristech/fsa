'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { setSession } from 'src/auth/context/jwt/utils';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';

// ----------------------------------------------------------------------

type CallbackStatus = 'loading' | 'success' | 'error';

interface StateData {
  redirectPath?: string;
}

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkUserSession } = useAuthContext();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Check if we have a token (backend-handled flow)
        const token = searchParams.get('token');
        if (token) {
          // Backend-handled flow: token is provided directly
          const redirectParam = searchParams.get('redirect');

          // Store the JWT token using the proper utility
          await setSession(token, { remember: true });

          // Update auth context
          await checkUserSession?.();

          setStatus('success');

          // Determine redirect path
          const redirectPath = redirectParam || '/dashboard';

          // Redirect to intended destination
          setTimeout(() => {
            router.replace(redirectPath);
          }, 1000);
          return;
        }

        // Frontend-handled flow: we have code and state from Google
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          console.error('OAuth error:', error);
          setStatus('error');
          setErrorMessage(`Authentication failed: ${error}`);
          return;
        }

        if (!code) {
          console.error('No authorization code received');
          setStatus('error');
          setErrorMessage('No authorization code received');
          return;
        }

        // Parse state to get redirect path
        let redirectPath = '/dashboard';
        if (state) {
          try {
            const stateData: StateData = JSON.parse(atob(state));
            redirectPath = stateData.redirectPath || '/dashboard';
          } catch (stateError) {
            console.warn('Could not parse state parameter:', stateError);
            // Continue with default redirect path
          }
        }

        // Exchange code for tokens via backend
        const axiosInstance = (await import('src/lib/axios')).default;

        const response = await axiosInstance.post('/api/v1/auth/google/callback', {
          code,
          state,
        });

        const data = response.data;

        if (data.success && data.data?.token) {
          // Store the JWT token using the proper utility
          await setSession(data.data.token, { remember: true });

          // Update auth context
          await checkUserSession?.();

          setStatus('success');

          // Redirect to intended destination
          setTimeout(() => {
            router.replace(redirectPath);
          }, 1000);
        } else {
          const errorMsg = data.message || data.error || 'Authentication failed';
          throw new Error(errorMsg);
        }

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
      }
    };

    handleOAuthCallback();
  }, [searchParams, router, checkUserSession]);

  if (status === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="h6">Completing authentication...</Typography>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          {errorMessage}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          You will be redirected to the sign-in page in a few seconds.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="button"
            color="primary"
            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => router.push('/auth/jwt/sign-in')}
          >
            Sign In
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <Typography variant="h6" color="success.main">
        Authentication successful!
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Redirecting to your dashboard...
      </Typography>
    </Box>
  );
}
