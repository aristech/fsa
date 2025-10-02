'use client';

import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import RadioGroup from '@mui/material/RadioGroup';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';

import { safeDisplayText } from 'src/utils/html-utils';

import axiosInstance from 'src/lib/axios';
import { useTranslate } from 'src/locales/use-locales';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const SupportSchema = zod.object({
  type: zod.enum(['bug', 'feature', 'other']),
  title: zod
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: zod
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  email: zod.string().email('Invalid email').optional(),
});

type SupportFormData = zod.infer<typeof SupportSchema>;

// ----------------------------------------------------------------------

export function SupportView() {
  const { user, tenant } = useAuthContext();
  const { t } = useTranslate('dashboard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SupportFormData>({
    resolver: zodResolver(SupportSchema),
    defaultValues: {
      type: 'bug',
      title: '',
      description: '',
      email: user?.email || '',
    },
  });

  const watchType = watch('type');

  // Helper function to get human-readable role name
  const getRoleName = (role: string) => {
    if (!role) return 'Unknown';

    // Handle role IDs like "technician_68d9a3fcce0b46ac3b3a90bf"
    if (role.includes('_')) {
      const roleType = role.split('_')[0];
      return roleType.charAt(0).toUpperCase() + roleType.slice(1);
    }

    // Handle simple role names
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const onSubmit = async (data: SupportFormData) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      // Debug: Log user and tenant data (remove this after testing)
      console.log('Debug - User data:', { user, tenant });

      // Validate required user data
      if ((!user?.id && !user?._id) || !user?.email) {
        setSubmitError(
          'User information is missing. Please try refreshing the page and logging in again.'
        );
        return;
      }

      if (!tenant?._id) {
        setSubmitError('Company information is missing. Please try refreshing the page.');
        return;
      }

      // Prepare the data to send to backend
      const submissionData = {
        ...data,
        userInfo: {
          userId: user.id || user._id,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          userEmail: user.email,
          userRole: user.role || 'user',
          tenantId: tenant._id,
          tenantName: safeDisplayText(tenant.name) || 'Unknown Company',
          subscriptionPlan: tenant.subscription?.plan || 'free',
        },
      };

      console.log('Debug - Submission data:', submissionData);

      await axiosInstance.post('/api/v1/support/submit', submissionData);

      setSubmitSuccess(true);
      reset();
    } catch (error: any) {
      console.error('Error submitting support request:', error);
      setSubmitError(
        error.response?.data?.message || 'Failed to submit support request. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bug':
        return t('settings.support.bugReport', { defaultValue: 'Bug Report' });
      case 'feature':
        return t('settings.support.featureRequest', { defaultValue: 'Feature Request' });
      case 'other':
        return t('settings.support.other', { defaultValue: 'Other' });
      default:
        return type;
    }
  };

  const getTypeDescription = (type: string) => {
    switch (type) {
      case 'bug':
        return t('settings.support.bugDescription', {
          defaultValue: 'Report issues, errors, or unexpected behavior',
        });
      case 'feature':
        return t('settings.support.featureDescription', {
          defaultValue: 'Suggest new features or improvements',
        });
      case 'other':
        return t('settings.support.otherDescription', {
          defaultValue: 'General feedback or questions',
        });
      default:
        return '';
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Iconify icon="solar:bug-bold" width={24} />
                {t('settings.support.title', { defaultValue: 'Support & Feedback' })}
              </Box>
            }
            subheader={t('settings.support.subtitle', {
              defaultValue: 'Help us improve by reporting bugs or requesting new features',
            })}
          />
          <CardContent>
            {submitSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {t('settings.support.submitSuccess', {
                  defaultValue:
                    'Your support request has been submitted successfully. We will review it and get back to you if needed.',
                })}
              </Alert>
            )}

            {submitError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {submitError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">
                      {t('settings.support.requestType', { defaultValue: 'Request Type' })}
                    </FormLabel>
                    <RadioGroup
                      row
                      value={watchType}
                      onChange={(event) => {
                        const value = event.target.value as 'bug' | 'feature' | 'other';
                        setValue('type', value);
                      }}
                      sx={{ mt: 1 }}
                    >
                      <FormControlLabel
                        value="bug"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {getTypeLabel('bug')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {getTypeDescription('bug')}
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="feature"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {getTypeLabel('feature')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {getTypeDescription('feature')}
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="other"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {getTypeLabel('other')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {getTypeDescription('other')}
                            </Typography>
                          </Box>
                        }
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label={t('settings.support.titleLabel', { defaultValue: 'Title' })}
                    placeholder={
                      watchType === 'bug'
                        ? t('settings.support.bugTitlePlaceholder', {
                            defaultValue: 'e.g., "Button not working on work orders page"',
                          })
                        : watchType === 'feature'
                          ? t('settings.support.featureTitlePlaceholder', {
                              defaultValue: 'e.g., "Add bulk export for reports"',
                            })
                          : t('settings.support.otherTitlePlaceholder', {
                              defaultValue: 'Brief description of your request',
                            })
                    }
                    {...register('title')}
                    error={!!errors.title}
                    helperText={errors.title?.message}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label={t('settings.support.descriptionLabel', { defaultValue: 'Description' })}
                    placeholder={
                      watchType === 'bug'
                        ? t('settings.support.bugDescriptionPlaceholder', {
                            defaultValue:
                              'Please describe the issue in detail:\n\n1. What you were trying to do\n2. What happened instead\n3. Steps to reproduce the issue\n4. Any error messages you saw',
                          })
                        : watchType === 'feature'
                          ? t('settings.support.featureDescriptionPlaceholder', {
                              defaultValue:
                                'Please describe your feature request:\n\n1. What problem would this solve?\n2. How would you like it to work?\n3. Any specific requirements or examples',
                            })
                          : t('settings.support.otherDescriptionPlaceholder', {
                              defaultValue: 'Please provide details about your request or feedback',
                            })
                    }
                    {...register('description')}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('settings.support.emailLabel', {
                      defaultValue: 'Contact Email (Optional)',
                    })}
                    placeholder={t('settings.support.emailPlaceholder', {
                      defaultValue: 'Leave blank to use your account email',
                    })}
                    {...register('email')}
                    error={!!errors.email}
                    helperText={
                      errors.email?.message ||
                      t('settings.support.emailHelp', {
                        defaultValue: 'We will only contact you if we need more information',
                      })
                    }
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => reset()}
                      disabled={isSubmitting}
                    >
                      {t('common.reset', { defaultValue: 'Reset' })}
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isSubmitting}
                      startIcon={
                        isSubmitting ? (
                          <Iconify icon="eos-icons:loading" />
                        ) : (
                          <Iconify icon="solar:arrow-right-bold" />
                        )
                      }
                    >
                      {isSubmitting
                        ? t('settings.support.submitting', { defaultValue: 'Submitting...' })
                        : t('settings.support.submitButton', { defaultValue: 'Submit Request' })}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* User Information Card */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader
            title={t('settings.support.userInfo', { defaultValue: 'Your Information' })}
            subheader={t('settings.support.userInfoSubtitle', {
              defaultValue: 'This information will be included with your request',
            })}
          />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>{t('common.name', { defaultValue: 'Name' })}:</strong> {user?.firstName}{' '}
                {user?.lastName}
              </Typography>
              <Typography variant="body2">
                <strong>{t('common.email', { defaultValue: 'Email' })}:</strong> {user?.email}
              </Typography>
              <Typography variant="body2">
                <strong>{t('common.role', { defaultValue: 'Role' })}:</strong>{' '}
                {getRoleName(user?.role || '')}
              </Typography>
              <Typography variant="body2">
                <strong>{t('common.company', { defaultValue: 'Company' })}:</strong>{' '}
                {safeDisplayText(tenant?.name)}
              </Typography>
              <Typography variant="body2">
                <strong>{t('common.plan', { defaultValue: 'Plan' })}:</strong>{' '}
                {tenant?.subscription?.plan || 'Free'}
              </Typography>
              <Typography variant="body2">
                <strong>{t('common.userId', { defaultValue: 'User ID' })}:</strong>{' '}
                {user?.id || user?._id}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Support Guidelines */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader
            title={t('settings.support.guidelines', { defaultValue: 'Support Guidelines' })}
            subheader={t('settings.support.guidelinesSubtitle', {
              defaultValue: 'Help us help you better',
            })}
          />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {t('settings.support.bugReportTips', { defaultValue: 'For Bug Reports:' })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('settings.support.bugTips', {
                    defaultValue:
                      'Include specific steps to reproduce the issue and any error messages you see.',
                  })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {t('settings.support.featureRequestTips', {
                    defaultValue: 'For Feature Requests:',
                  })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('settings.support.featureTips', {
                    defaultValue:
                      "Explain the problem you're trying to solve and how the feature would help.",
                  })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {t('settings.support.responseTime', { defaultValue: 'Response Time:' })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('settings.support.responseTimeText', {
                    defaultValue: 'We typically respond within 1-2 business days.',
                  })}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
