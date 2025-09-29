'use client';

import { z } from 'zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import axiosInstance from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';
import { Form, RHFTextField, RHFPhoneInput } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const companyInfoSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  phone: z.string().max(20, 'Phone number too long').optional(),
  address: z
    .object({
      street: z.string().max(200, 'Street address too long').optional(),
      city: z.string().max(100, 'City too long').optional(),
      state: z.string().max(100, 'State too long').optional(),
      zipCode: z.string().max(20, 'Zip code too long').optional(),
      country: z.string().max(100, 'Country too long').optional(),
    })
    .optional(),
  website: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || /^https?:\/\/.+/.test(val), 'Invalid website URL'),
  description: z.string().max(500, 'Description too long').optional(),
  industry: z.string().max(100, 'Industry too long').optional(),
});

type CompanyInfoFormData = z.infer<typeof companyInfoSchema>;

type Props = {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function CompanyInfoForm({ onSuccess, onError }: Props) {
  const methods = useForm<CompanyInfoFormData>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'GR',
      },
      website: '',
      description: '',
      industry: '',
    },
  });

  // Load current company information
  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const response = await axiosInstance.get('/api/v1/company-info');
        const { companyInfo } = response.data;

        methods.reset({
          name: companyInfo.name || '',
          phone: companyInfo.phone || '',
          address: {
            street: companyInfo.address?.street || '',
            city: companyInfo.address?.city || '',
            state: companyInfo.address?.state || '',
            zipCode: companyInfo.address?.zipCode || '',
            country: companyInfo.address?.country || 'GR',
          },
          website: companyInfo.website || '',
          description: companyInfo.description || '',
          industry: companyInfo.industry || '',
        });
      } catch (error) {
        console.error('Error loading company info:', error);
      }
    };

    loadCompanyInfo();
  }, [methods]);

  const onSubmit = async (data: CompanyInfoFormData) => {
    try {
      await axiosInstance.put('/api/v1/company-info', data);
      onSuccess('Company information updated successfully!');
    } catch (error) {
      console.error('Error updating company info:', error);
      onError('Failed to update company information. Please try again.');
    }
  };

  return (
    <Form methods={methods} onSubmit={methods.handleSubmit(onSubmit)}>
      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <RHFTextField name="name" label="Company Name" required />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <RHFPhoneInput name="phone" label="Phone" />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <RHFTextField name="website" label="Website" placeholder="https://example.com" />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <RHFTextField name="industry" label="Industry" />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <RHFTextField name="description" label="Description" multiline rows={3} />
        </Grid>

        {/* Address Information */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Address Information
          </Typography>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <RHFTextField name="address.street" label="Street Address" />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <RHFTextField name="address.city" label="City" />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <RHFTextField name="address.state" label="State" />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <RHFTextField name="address.zipCode" label="Zip Code" />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <RHFTextField name="address.country" label="Country" />
        </Grid>

        {/* Actions */}
        <Grid size={{ xs: 12 }}>
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <LoadingButton
              type="submit"
              variant="contained"
              loading={methods.formState.isSubmitting}
              startIcon={<Iconify icon="solar:disk-bold" />}
            >
              Save
            </LoadingButton>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              startIcon={<Iconify icon="solar:refresh-bold" />}
            >
              Reset
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Form>
  );
}
