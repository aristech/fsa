'use client';

import { useState, useEffect } from 'react';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import { Stack, Container } from '@mui/material';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { useTranslate } from 'src/locales/use-locales';

import { LogoUpload } from '../logo-upload';
import { CompanyInfoForm } from '../company-info-form';

// ----------------------------------------------------------------------

export function CompanySettingsView() {
  const { t } = useTranslate('dashboard');
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [alertMessage]);

  const handleSuccess = (message: string) => {
    setAlertMessage({ type: 'success', message });
  };

  const handleError = (message: string) => {
    setAlertMessage({ type: 'error', message });
  };

  return (
    <Container maxWidth={false}>
      <Stack
        spacing={4}
        sx={{
          p: 3,
        }}
      >
        {alertMessage && (
          <Alert severity={alertMessage.type} sx={{ mb: 3 }} onClose={() => setAlertMessage(null)}>
            {alertMessage.message}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Company Information */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card>
              <CardHeader
                title={t('settings.company.info.title')}
                subheader={t('settings.company.info.subtitle')}
              />
              <CardContent>
                <CompanyInfoForm onSuccessAction={handleSuccess} onErrorAction={handleError} />
              </CardContent>
            </Card>
          </Grid>

          {/* Logo Upload */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardHeader
                title={t('settings.company.logo.title')}
                subheader={t('settings.company.logo.subtitle')}
              />
              <CardContent>
                <LogoUpload onSuccessAction={handleSuccess} onErrorAction={handleError} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
