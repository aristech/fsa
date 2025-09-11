'use client';

import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

import { useAuthContext } from '../../hooks';
import { getErrorMessage } from '../../utils';
import { FormHead } from '../../components/form-head';
import { signInWithPassword } from '../../context/jwt';

// ----------------------------------------------------------------------

export type SignInSchemaType = z.infer<typeof SignInSchema>;

export const SignInSchema = z.object({
  email: schemaUtils.email(),
  password: z
    .string()
    .min(1, { error: 'Password is required!' })
    .min(6, { error: 'Password must be at least 6 characters!' }),
  tenantSlug: z
    .string()
    .min(1, { error: 'Tenant slug is required!' })
    .regex(/^[a-z0-9_]+$/, {
      error: 'Tenant slug must contain only lowercase letters, numbers, and underscores!',
    }),
  rememberMe: z.boolean().optional().default(false),
});

// ----------------------------------------------------------------------

// email: 'admin@fsa.com',
//     password: 'admin123',
//     tenantSlug: 'progressnet',

export function JwtSignInView() {
  const router = useRouter();

  const showPassword = useBoolean();

  const { checkUserSession } = useAuthContext();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultValues: SignInSchemaType = {
    email: '',
    password: '',
    tenantSlug: '',
    rememberMe: false,
  };

  const methods = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  // Prefill from localStorage if available
  const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('auth_email') : null;
  const savedTenant =
    typeof window !== 'undefined' ? localStorage.getItem('auth_tenantSlug') : null;
  if (savedEmail && savedTenant && !watch('email') && !watch('tenantSlug')) {
    setValue('email', savedEmail);
    setValue('tenantSlug', savedTenant);
    setValue('rememberMe', true);
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      await signInWithPassword({
        email: data.email,
        password: data.password,
        tenantSlug: data.tenantSlug,
        rememberMe: !!data.rememberMe,
      });

      // Persist based on rememberMe
      if (data.rememberMe) {
        localStorage.setItem('auth_email', data.email);
        localStorage.setItem('auth_tenantSlug', data.tenantSlug);
      } else {
        localStorage.removeItem('auth_email');
        localStorage.removeItem('auth_tenantSlug');
      }
      await checkUserSession?.();

      // Redirect after sign-in
      const url = new URL(window.location.href);
      const returnTo = url.searchParams.get('returnTo');
      router.replace(returnTo || '/dashboard');
    } catch (error) {
      console.error(error);
      const feedbackMessage = getErrorMessage(error);
      setErrorMessage(feedbackMessage);
    }
  });

  const renderForm = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ flex: 1 }}>
          <Field.Text
            name="tenantSlug"
            label="Tenant Slug"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
        <Tooltip
          title="Your organization identifier. Find it in your invitation email, labeled as Tenant Slug."
          placement="top"
        >
          <IconButton edge="end">
            <Iconify icon="solar:info-circle-bold" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Field.Text name="email" label="Email address" slotProps={{ inputLabel: { shrink: true } }} />

      <Box sx={{ gap: 1.5, display: 'flex', flexDirection: 'column' }}>
        <Link
          component={RouterLink}
          href="#"
          variant="body2"
          color="inherit"
          sx={{ alignSelf: 'flex-end' }}
        >
          Forgot password?
        </Link>

        <Field.Text
          name="password"
          label="Password"
          placeholder="8+ characters"
          type={showPassword.value ? 'text' : 'password'}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={showPassword.onToggle} edge="end">
                    <Iconify
                      icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                    />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Field.Checkbox name="rememberMe" label="Remember me on this device" />

      <Button
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Sign in..."
      >
        Sign in
      </Button>
    </Box>
  );

  return (
    <>
      <FormHead
        title="Sign in to your account"
        description={
          <>
            {`Don’t have an account? `}
            <Link component={RouterLink} href={paths.auth.jwt.signUp} variant="subtitle2">
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
    </>
  );
}
