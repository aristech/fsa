'use client';

import Link from 'next/link';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';

type Props = {
  webhooksHref: string;
  apiKeysHref: string;
};

export function SettingsView({ webhooksHref, apiKeysHref }: Props) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Webhooks" subheader="Create and manage outbound webhooks" />
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Subscribe to topics and deliver events to your HTTP endpoints.
            </Typography>
            <Button
              component={Link}
              href={webhooksHref}
              variant="contained"
              startIcon={<Iconify icon="solar:webhook-bold" />}
            >
              Manage Webhooks
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="API Keys" subheader="Create REST API keys" />
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Generate keys for programmatic access with scoped permissions.
            </Typography>
            <Button
              component={Link}
              href={apiKeysHref}
              variant="contained"
              startIcon={<Iconify icon="solar:key-bold" />}
            >
              Manage API Keys
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
