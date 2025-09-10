'use client';

import { z as zod } from 'zod';
import { useSearchParams } from 'next/navigation';
import { useBoolean } from 'minimal-shared/hooks';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import axios from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';
import { setSession } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type VerifyAccountSchemaType = zod.infer<typeof VerifyAccountSchema>;

export const VerifyAccountSchema = zod.object({
  password: zod.string().min(8).refine(
    (password) => {
      // Password validation: min 8 chars, mixed case, symbols, numbers
      const hasLowerCase = /[a-z]/.test(password);
      const hasUpperCase = /[A-Z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      return hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChar;
    },
    {
      message: 'Password must contain uppercase, lowercase, numbers, and special characters',
    }
  ),
  confirmPassword: zod.string().min(1, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const defaultValues: VerifyAccountSchemaType = {
  password: '',
  confirmPassword: '',
};

// ----------------------------------------------------------------------

export function JwtVerifyAccountView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { checkUserSession } = useAuthContext();
  
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState<{
    email: string;
    type: string;
    tenantName: string;
    companyName: string;
    metadata?: any;
  } | null>(null);

  const password = useBoolean();
  const confirmPassword = useBoolean();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<VerifyAccountSchemaType>({
    resolver: zodResolver(VerifyAccountSchema),
    defaultValues,
  });

  // Validate magic link token on component mount
  const validateToken = useCallback(async () => {
    const token = searchParams.get('token');
    
    if (!token) {
      setErrorMsg('No verification token provided');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('/api/v1/auth/validate-magic-link', {
        params: { token },
      });

      if (response.data.success) {
        setAccountInfo(response.data.data);
        setErrorMsg('');
      } else {
        setErrorMsg(response.data.message || 'Invalid verification link');
      }
    } catch (error: any) {
      console.error('Error validating magic link:', error);
      setErrorMsg(
        error.response?.data?.message || 'Invalid or expired verification link'
      );
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const onSubmit = useCallback(
    async (data: VerifyAccountSchemaType) => {
      const token = searchParams.get('token');
      
      if (!token) {
        setErrorMsg('No verification token provided');
        return;
      }

      try {
        setErrorMsg('');

        const response = await axios.post('/api/v1/auth/setup-account', {
          token,
          password: data.password,
          confirmPassword: data.confirmPassword,
        });

        if (response.data.success) {
          const { token: jwtToken } = response.data.data;

          // Set the session with the JWT token
          await setSession(jwtToken);

          // Update the auth context by checking user session
          await checkUserSession?.();

          // Redirect to dashboard
          router.push(paths.dashboard.root);
        } else {
          setErrorMsg(response.data.message || 'Failed to setup account');
        }
      } catch (error: any) {
        console.error('Error setting up account:', error);
        setErrorMsg(
          error.response?.data?.message || 'Failed to setup account. Please try again.'
        );
      }
    },
    [searchParams, checkUserSession, router]
  );

  const handleGoBack = useCallback(() => {
    router.push(paths.auth.jwt.signIn);
  }, [router]);

  if (loading) {
    return (
      <Card sx={{ p: 5 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            Verifying...
          </Typography>
          <Typography color="text.secondary">
            Please wait while we verify your invitation link.
          </Typography>
        </Box>
      </Card>
    );
  }

  if (errorMsg && !accountInfo) {
    return (
      <Card sx={{ p: 5 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Iconify
            icon="solar:close-circle-bold"
            sx={{ mb: 3, color: 'error.main', width: 96, height: 96 }}
          />
          <Typography variant="h3" sx={{ mb: 2 }}>
            Invalid Link
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {errorMsg}
          </Typography>
          <Button variant="contained" onClick={handleGoBack}>
            Back to Sign In
          </Button>
        </Box>
      </Card>
    );
  }

  const getWelcomeMessage = () => {
    switch (accountInfo?.type) {
      case 'personnel_invitation':
        return `Welcome to ${accountInfo.companyName}! Complete your account setup to join the team.`;
      case 'tenant_activation':
        return `Welcome! Set up your password to activate your ${accountInfo.companyName} account.`;
      default:
        return 'Complete your account setup by creating a secure password.';
    }
  };

  const renderForm = (
    <Stack spacing={3}>
      <Controller
        name="password"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            label="Password"
            placeholder="Enter your password"
            type={password.value ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={password.onToggle} edge="end">
                    <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText={
              errors.password?.message ||
              'Must contain uppercase, lowercase, numbers, and special characters'
            }
            error={!!errors.password}
          />
        )}
      />

      <Controller
        name="confirmPassword"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            label="Confirm Password"
            placeholder="Confirm your password"
            type={confirmPassword.value ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={confirmPassword.onToggle} edge="end">
                    <Iconify
                      icon={confirmPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                    />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
        )}
      />

      {!!errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      <LoadingButton
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Setting up account..."
      >
        Complete Account Setup
      </LoadingButton>
    </Stack>
  );

  return (
    <Card sx={{ p: 5 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Iconify
          icon="solar:shield-check-bold"
          sx={{ mb: 3, color: 'success.main', width: 96, height: 96 }}
        />
        <Typography variant="h3" sx={{ mb: 1 }}>
          Setup Your Account
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          {getWelcomeMessage()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Email:</strong> {accountInfo?.email}
        </Typography>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        {renderForm}
      </form>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button variant="text" onClick={handleGoBack}>
          Back to Sign In
        </Button>
      </Box>
    </Card>
  );
}
