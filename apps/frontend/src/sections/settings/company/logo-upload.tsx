'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/auth/hooks/use-auth-context';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';

import axiosInstance from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function LogoUpload({ onSuccess, onError }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const { tenant } = useAuthContext();

  // Check subscription plan from tenant
  const canCustomize = tenant?.subscription?.plan !== 'free';

  // Load initial logo URL from tenant branding
  useEffect(() => {
    if (tenant?.branding?.logoUrl) {
      setLogoUrl(tenant.branding.logoUrl);
    }
  }, [tenant]);

  // Load branding data on component mount
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await axiosInstance.get('/api/v1/branding');
        if (response.data.branding?.logoUrl) {
          setLogoUrl(response.data.branding.logoUrl);
        }
      } catch (error) {
        console.error('Error loading branding:', error);
      }
    };

    loadBranding();
  }, []);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        onError('Invalid file type. Please upload JPG, PNG, WebP, or SVG files only.');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        onError('File too large. Maximum size is 5MB.');
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosInstance.post('/api/v1/branding/upload-logo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        setLogoUrl(response.data.logoUrl);
        onSuccess('Logo uploaded successfully!');
      } catch (error) {
        console.error('Error uploading logo:', error);
        onError('Failed to upload logo. Please try again.');
      } finally {
        setIsUploading(false);
        // Reset input value so the same file can be selected again
        event.target.value = '';
      }
    },
    [onError, onSuccess]
  );

  const handleRemoveLogo = useCallback(async () => {
    setIsRemoving(true);

    try {
      await axiosInstance.put('/api/v1/branding', {
        logoUrl: null,
      });

      setLogoUrl(null);
      onSuccess('Logo removed successfully!');
    } catch (error) {
      console.error('Error removing logo:', error);
      onError('Failed to remove logo. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  }, [onError, onSuccess]);

  if (!canCustomize) {
    return (
      <Card sx={{ p: 3, textAlign: 'center' }}>
        <Iconify
          icon="solar:lock-bold"
          sx={{ width: 48, height: 48, mx: 'auto', mb: 2, color: 'text.disabled' }}
        />
        <Typography variant="h6" color="text.disabled" gutterBottom>
          Logo Upload Requires Upgrade
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upgrade to Basic plan or higher to upload your company logo.
        </Typography>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Current Logo */}
      <Box sx={{ textAlign: 'center' }}>
        <Avatar
          src={logoUrl || undefined}
          sx={{
            width: 120,
            height: 120,
            mx: 'auto',
            mb: 2,
            border: (theme) => `1px dashed ${theme.palette.divider}`,
          }}
        >
          <Iconify icon="solar:buildings-bold" sx={{ width: 48, height: 48 }} />
        </Avatar>

        {logoUrl && (
          <Tooltip title="Remove Logo">
            <IconButton
              color="error"
              onClick={handleRemoveLogo}
              disabled={isRemoving}
              sx={{ mt: 1 }}
            >
              <Iconify icon="solar:trash-bin-minimalistic-bold" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Upload Instructions */}
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Upload your company logo to personalize your workspace. Recommended size: 120x120px.
      </Typography>

      {/* Upload Button */}
      <Box sx={{ textAlign: 'center' }}>
        <input
          accept="image/*"
          style={{ display: 'none' }}
          id="logo-upload"
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor="logo-upload">
          <LoadingButton
            component="span"
            variant="contained"
            loading={isUploading}
            startIcon={<Iconify icon="solar:cloud-upload-bold" />}
            sx={{ minWidth: 140 }}
          >
            {logoUrl
              ? 'Change Logo'
              : 'Upload Logo'}
          </LoadingButton>
        </label>
      </Box>

      {/* File Requirements */}
      <Typography variant="caption" color="text.secondary" textAlign="center">
        Supported formats: JPG, PNG, WebP, SVG. Maximum size: 5MB.
      </Typography>
    </Stack>
  );
}
