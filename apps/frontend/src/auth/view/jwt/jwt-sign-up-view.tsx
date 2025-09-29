'use client';

import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

import { signUp } from '../../context/jwt';
import { useAuthContext } from '../../hooks';
import { getErrorMessage } from '../../utils';
import { FormHead } from '../../components/form-head';
import { FormDivider } from '../../components/form-divider';
import { FormSocials } from '../../components/form-socials';
import { SignUpTerms } from '../../components/sign-up-terms';

// ----------------------------------------------------------------------

export type SignUpSchemaType = z.infer<typeof SignUpSchema>;

export const SignUpSchema = z.object({
  firstName: z.string().min(1, { error: 'First name is required!' }),
  lastName: z.string().min(1, { error: 'Last name is required!' }),
  email: schemaUtils.email(),
  password: z
    .string()
    .min(1, { error: 'Password is required!' })
    .min(6, { error: 'Password must be at least 6 characters!' }),
  companyName: z.string().min(1, { error: 'Company name is required!' }),
});

// ----------------------------------------------------------------------

export function JwtSignUpView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const showPassword = useBoolean();

  const { checkUserSession } = useAuthContext();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extract plan info from URL query parameters
  const planId = searchParams.get('plan') || 'free';
  const billingCycle = searchParams.get('cycle') || 'monthly';
  const hasTrial = searchParams.get('trial') === 'true';

  const defaultValues: SignUpSchemaType = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
  };

  const methods = useForm({
    resolver: zodResolver(SignUpSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
      });
      await checkUserSession?.();

      router.refresh();
    } catch (error) {
      console.error(error);
      const feedbackMessage = getErrorMessage(error);
      setErrorMessage(feedbackMessage);
    }
  });

  const handleGoogleSignIn = async () => {
    try {
      setErrorMessage(null);

      // Use backend OAuth flow to avoid CORS issues
      const axiosInstance = (await import('src/lib/axios')).default;

      const response = await axiosInstance.post('/api/v1/auth/google', {
        planId, // Use plan from URL parameters
        billingCycle, // Include billing cycle
        redirectPath: '/dashboard',
      });

      if (response.data.success && response.data.data?.authUrl) {
        // Redirect to Google OAuth URL provided by backend
        window.location.href = response.data.data.authUrl;
      } else {
        throw new Error('Failed to get OAuth URL from server');
      }
    } catch (error) {
      console.error('Google sign-in setup error:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to initialize Google sign-in. Please try again.'
      );
    }
  };

  const renderForm = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{ display: 'flex', gap: { xs: 3, sm: 2 }, flexDirection: { xs: 'column', sm: 'row' } }}
      >
        <Field.Text
          name="firstName"
          label="First name"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Field.Text
          name="lastName"
          label="Last name"
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>

      <Field.Text name="email" label="Email address" slotProps={{ inputLabel: { shrink: true } }} />

      <Field.Text name="companyName" label="Company name" slotProps={{ inputLabel: { shrink: true } }} />

      <Field.Text
        name="password"
        label="Password"
        placeholder="6+ characters"
        type={showPassword.value ? 'text' : 'password'}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={showPassword.onToggle} edge="end">
                  <Iconify icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <Button
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Create account..."
      >
        Create account
      </Button>
    </Box>
  );

  return (
    <>
      <FormHead
        title={
          planId === 'free'
            ? 'Get started absolutely free'
            : `Get started with ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan`
        }
        description={
          <>
            {planId !== 'free' && hasTrial && (
              <Box sx={{ mb: 1, color: 'success.main', fontSize: '0.875rem' }}>
                ✨ Start with a free trial!
              </Box>
            )}
            {`Already have an account? `}
            <Link component={RouterLink} href={paths.auth.jwt.signIn} variant="subtitle2">
              Get started
            </Link>
          </>
        }
        sx={{ textAlign: { xs: 'center', md: 'left' } }}
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        {renderForm()}
      </Form>

      <FormDivider />

      <FormSocials signInWithGoogle={handleGoogleSignIn} />

      <SignUpTerms />
    </>
  );
}
