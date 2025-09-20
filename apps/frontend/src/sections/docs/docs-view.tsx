'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ListItem from '@mui/material/ListItem';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ListItemText from '@mui/material/ListItemText';

import { paths } from 'src/routes/paths';

export function DocsView() {
  const quickLinks = useMemo(
    () => [
      { label: 'Setup Environments', href: '/docs#environments' },
      { label: 'Tenant & Permissions', href: '/docs#tenants' },
      { label: 'Webhooks', href: '/docs#webhooks' },
      { label: 'API Keys', href: '/docs#api-keys' },
      { label: 'SoftOne Integration', href: '/docs#softone' },
    ],
    []
  );

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Box>
        <Typography variant="h3" gutterBottom>
          Documentation
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find what you need to use {process.env.NEXT_PUBLIC_APP_NAME ?? 'the app'} effectively.
          This page contains beginner-friendly guides and developer references, including connecting
          third parties like SoftOne.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Quick links" />
            <CardContent>
              <List dense>
                {quickLinks.map((l) => (
                  <ListItem key={l.href} component={Link} href={l.href} sx={{ px: 0 }}>
                    <ListItemText primary={l.label} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card id="environments">
            <CardHeader title="Setup Environments" subheader="Local, staging, and production" />
            <CardContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                - Frontend env file: apps/frontend/env.local.example → create env.local and fill
                server URL and public config.
                <br />- Backend env file: apps/backend/env.example → create .env with DB, JWT, mail
                settings.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                See: PM2-SETUP.md, FIELD_ENVIRONMENT_PLAN.md, FIELD_ENVIRONMENT_STATUS.md
              </Typography>
            </CardContent>
          </Card>

          <Card id="tenants" sx={{ mt: 3 }}>
            <CardHeader title="Tenants & Permissions" subheader="Multi-tenant isolation & RBAC" />
            <CardContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                - Tenants isolate data; user role and permissions determine access.
                <br />- Backend middleware: authenticate, permission guard, and tenant isolation are
                applied to routes.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                See: TENANT_SECURITY_AUDIT.md, CLIENTS_SECURITY_AUDIT.md
              </Typography>
            </CardContent>
          </Card>

          <Card id="webhooks" sx={{ mt: 3 }}>
            <CardHeader title="Webhooks" subheader="Outbound events to your systems" />
            <CardContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                In Dashboard → Settings → Webhooks, create endpoints with:
                <br />• Name, Status, Topics, Delivery URL, Secret, API Version
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  component={Link}
                  href={paths.dashboard.settings.webhooks}
                  variant="contained"
                >
                  Manage webhooks
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card id="api-keys" sx={{ mt: 3 }}>
            <CardHeader title="API Keys" subheader="Programmatic access to REST APIs" />
            <CardContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                In Dashboard → Settings → API Keys, generate keys with scoped permissions and
                optional expiration.
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  component={Link}
                  href={paths.dashboard.settings.apiKeys}
                  variant="contained"
                >
                  Manage API keys
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card id="softone" sx={{ mt: 3 }}>
            <CardHeader title="SoftOne Integration" subheader="Connect FSA with SoftOne ERP" />
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                For non-technical users
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                1) Ask your administrator for an API Key with the right permissions.
                <br />
                2) Provide your IT team a Webhook Delivery URL where you want to receive updates.
                <br />
                3) Share the Secret with your IT team to verify request signatures.
              </Typography>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                For developers
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                - Use API keys in Authorization: Bearer headers to access REST endpoints exposed by
                the backend. Make sure tenant and role permissions are satisfied.
                <br />- Subscribe to relevant webhook topics (e.g., work_order.created) and verify
                HMAC signatures with the provided secret.
                <br />- Map FSA entities to SoftOne: Clients ↔ Customers, Work Orders ↔ Jobs,
                Materials ↔ Items.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Internal references: INTERNATIONALIZATION_GUIDE.md, FRONTEND_I18N_IMPLEMENTATION.md,
                SNACKBAR_INTEGRATION_SUMMARY.md
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
