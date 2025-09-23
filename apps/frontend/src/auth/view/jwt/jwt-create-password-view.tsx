'use client';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';

import axiosInstance from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export type CreatePasswordSchemaType = zod.infer<typeof CreatePasswordSchema>;

export const CreatePasswordSchema = zod
  .object({
    password: zod
      .string()
      .min(1, { message: 'Password is required!' })
      .min(8, { message: 'Password must be at least 8 characters!' }),
    confirmPassword: zod.string().min(1, { message: 'Confirm password is required!' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match!',
    path: ['confirmPassword'],
  });

// ----------------------------------------------------------------------

export function JwtCreatePasswordView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = searchParams.get('token');

  const methods = useForm<CreatePasswordSchemaType>({
    resolver: zodResolver(CreatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (token) {
      // Verify token on component mount
      const verifyToken = async () => {
        try {
          const response = await axiosInstance.post('/api/v1/auth/verify-magic-link', {
            token,
          });

          if (response.status >= 200 && response.status < 300) {
            setTokenValid(true);
          } else {
            setTokenValid(false);
          }
        } catch (error) {
          console.error('Token verification error:', error);
          setTokenValid(false);
        }
      };

      verifyToken();
    } else {
      setTokenValid(false);
    }
  }, [token]);

  const onSubmit = handleSubmit(async (data) => {
    if (!token) {
      toast.error('Invalid or expired token');
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post('/api/v1/auth/create-password', {
        token,
        password: data.password,
      });

      if (response.status >= 200 && response.status < 300) {
        toast.success('Password created successfully');
        router.push(paths.auth.jwt.signIn);
      }
    } catch (error: any) {
      console.error('Password creation error:', error);
      const message = error?.response?.data?.message || 'Failed to create password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  });

  if (tokenValid === null) {
    return (
      <Stack spacing={3} sx={{ textAlign: 'center' }}>
        <Typography variant="h5">Verifying link...</Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we verify your password reset link.
        </Typography>
      </Stack>
    );
  }

  if (tokenValid === false) {
    return (
      <Stack spacing={3} sx={{ textAlign: 'center' }}>
        <Box
          component="img"
          alt="Link expired"
          src="/assets/icons/ic-file-x.svg"
          sx={{ width: 96, height: 96, mx: 'auto' }}
        />

        <Stack spacing={1}>
          <Typography variant="h5">Link expired or invalid</Typography>
          <Typography variant="body2" color="text.secondary">
            The password reset link you clicked is either expired or invalid.
            <br />
            Please request a new password reset link.
          </Typography>
        </Stack>

        <LoadingButton
          fullWidth
          size="large"
          variant="contained"
          onClick={() => router.push(paths.auth.jwt.resetPassword)}
        >
          Request new link
        </LoadingButton>
      </Stack>
    );
  }

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Stack spacing={2} sx={{ mb: 5 }}>
        <Typography variant="h3">Create new password</Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Your new password must be different from previously used passwords.
        </Typography>
      </Stack>

      <Stack spacing={3}>
        <Field.Text
          name="password"
          label="Password"
          placeholder="8+ characters"
          type={showPassword ? 'text' : 'password'}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    <Iconify
                      icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                    />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Field.Text
          name="confirmPassword"
          label="Confirm password"
          placeholder="8+ characters"
          type={showConfirmPassword ? 'text' : 'password'}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                    <Iconify
                      icon={showConfirmPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                    />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <LoadingButton
          fullWidth
          size="large"
          type="submit"
          variant="contained"
          loading={isSubmitting || loading}
          loadingIndicator="Creating password..."
        >
          Create password
        </LoadingButton>
      </Stack>
    </Form>
  );
}