'use client';

import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import axiosInstance from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export type ResetPasswordSchemaType = zod.infer<typeof ResetPasswordSchema>;

export const ResetPasswordSchema = zod.object({
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
});

// ----------------------------------------------------------------------

export function JwtResetPasswordView() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const methods = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/api/v1/auth/request-password-reset', {
        email: data.email,
      });

      if (response.status >= 200 && response.status < 300) {
        setSent(true);
        toast.success('Password reset link sent to your email');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      const message = error?.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  });

  const renderForm = (
    <Stack spacing={3}>
      <Field.Text
        name="email"
        label="Email address"
        placeholder="example@gmail.com"
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <LoadingButton
        fullWidth
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting || loading}
        loadingIndicator="Sending reset link..."
      >
        Send reset link
      </LoadingButton>

      <Link
        component={RouterLink}
        href={paths.auth.jwt.signIn}
        color="inherit"
        variant="subtitle2"
        sx={{
          alignSelf: 'center',
          alignItems: 'center',
          display: 'inline-flex',
        }}
      >
        <Iconify icon="eva:arrow-ios-back-fill" width={16} />
        Return to sign in
      </Link>
    </Stack>
  );

  const renderSent = (
    <Stack spacing={3} sx={{ textAlign: 'center' }}>
      <Box
        component="img"
        alt="Check email"
        src="/assets/icons/empty/ic-mail.svg"
        sx={{ width: 96, height: 96, mx: 'auto' }}
      />

      <Stack spacing={1}>
        <Typography variant="h5">Reset link sent!</Typography>
        <Typography variant="body2" color="text.secondary">
          We&apos;ve sent a password reset link to your email address.
          <br />
          Please check your email and click the link to reset your password.
        </Typography>
      </Stack>

      <Button
        fullWidth
        size="large"
        variant="contained"
        component={RouterLink}
        href={paths.auth.jwt.signIn}
      >
        Back to sign in
      </Button>

      <Stack direction="row" spacing={0.5} justifyContent="center">
        <Typography variant="body2" color="text.secondary">
          Didn&apos;t receive the email?
        </Typography>
        <Link
          variant="subtitle2"
          onClick={() => {
            setSent(false);
            methods.reset();
          }}
          sx={{ cursor: 'pointer' }}
        >
          Resend
        </Link>
      </Stack>
    </Stack>
  );

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Stack spacing={2} sx={{ mb: 5, position: 'relative' }}>
        <Typography variant="h3">Forgot your password?</Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Please enter the email address associated with your account and we&apos;ll send you a link
          to reset your password.
        </Typography>
      </Stack>

      {sent ? renderSent : renderForm}
    </Form>
  );
}
