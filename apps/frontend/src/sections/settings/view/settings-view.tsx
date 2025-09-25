'use client';

import Link from 'next/link';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { useTranslate } from 'src/locales/use-locales';

import { Iconify } from 'src/components/iconify';

type Props = {
  webhooksHref: string;
  apiKeysHref: string;
};

export function SettingsView({ webhooksHref, apiKeysHref }: Props) {
  const { t } = useTranslate('dashboard');

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader
            title={t('settings.webhooks.title')}
            subheader={t('settings.webhooks.subtitle')}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('settings.webhooks.description')}
            </Typography>
            <Button
              component={Link}
              href={webhooksHref}
              variant="contained"
              startIcon={<Iconify icon="solar:webhook-bold" />}
            >
              {t('settings.webhooks.manageWebhooks')}
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader
            title={t('settings.apiKeys.title')}
            subheader={t('settings.apiKeys.subtitle')}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('settings.apiKeys.description')}
            </Typography>
            <Button
              component={Link}
              href={apiKeysHref}
              variant="contained"
              startIcon={<Iconify icon="solar:key-bold" />}
            >
              {t('settings.apiKeys.manageApiKeys')}
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
