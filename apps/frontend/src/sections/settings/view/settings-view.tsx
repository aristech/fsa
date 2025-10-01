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
  smsRemindersHref: string;
  companyHref?: string;
  supportHref?: string;
};

export function SettingsView({ webhooksHref, apiKeysHref, smsRemindersHref, companyHref, supportHref }: Props) {
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

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader
            title={t('settings.smsReminders.title')}
            subheader={t('settings.smsReminders.subtitle')}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('settings.smsReminders.description')}
            </Typography>
            <Button
              component={Link}
              href={smsRemindersHref}
              variant="contained"
              startIcon={<Iconify icon="solar:chat-line-bold" />}
            >
              {t('settings.smsReminders.manageSmsReminders')}
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {companyHref && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title={t('settings.company.title')}
              subheader={t('settings.company.subtitle')}
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('settings.company.description')}
              </Typography>
              <Button
                component={Link}
                href={companyHref}
                variant="contained"
                startIcon={<Iconify icon="solar:buildings-bold" />}
              >
                {t('settings.company.manageCompany')}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}

      {supportHref && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title={t('settings.support.title', { defaultValue: 'Support & Feedback' })}
              subheader={t('settings.support.subtitle', { defaultValue: 'Report bugs and request features' })}
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('settings.support.description', { defaultValue: 'Help us improve by reporting bugs or requesting new features. Your feedback is important to us.' })}
              </Typography>
              <Button
                component={Link}
                href={supportHref}
                variant="contained"
                startIcon={<Iconify icon="solar:bug-bold" />}
              >
                {t('settings.support.reportBug', { defaultValue: 'Report Bug / Request Feature' })}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}
