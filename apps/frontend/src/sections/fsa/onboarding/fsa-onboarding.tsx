'use client';

import { useMemo } from 'react';
import NextLink from 'next/link';

import { Box, Card, Stack, Button, Typography, CardContent } from '@mui/material';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales/use-locales';

import { Iconify } from 'src/components/iconify';

type Props = {
  tenantName?: string;
};

export function FsaOnboarding({ tenantName }: Props) {
  const { t } = useTranslate('common');

  const steps = useMemo(
    () => [
      {
        icon: <Iconify icon="mingcute:user-add-line" />,
        title: t('onboarding.step_personnel_title', 'Add your first technician'),
        desc: t(
          'onboarding.step_personnel_desc',
          'Create a personnel record so you can assign work orders and track time.'
        ),
        actionHref: paths.dashboard.fsa.personnel.new,
        actionLabel: t('onboarding.action_add_personnel', 'Add personnel'),
      },
      {
        icon: <Iconify icon="mingcute:building-2-line" />,
        title: t('onboarding.step_client_title', 'Add a client'),
        desc: t(
          'onboarding.step_client_desc',
          'Create a client to keep contact details and related work centralized.'
        ),
        actionHref: paths.dashboard.fsa.clients.new,
        actionLabel: t('onboarding.action_add_client', 'Add client'),
      },
      {
        icon: <Iconify icon="mingcute:briefcase-line" />,
        title: t('onboarding.step_work_order_title', 'Create your first work order'),
        desc: t(
          'onboarding.step_work_order_desc',
          'Plan the work, assign personnel, and start tracking progress.'
        ),
        actionHref: paths.dashboard.fsa.workOrders.new,
        actionLabel: t('onboarding.action_create_work_order', 'Create work order'),
      },
    ],
    [t]
  );

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {t('onboarding.title', 'Welcome to Field Service App')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t(
                'onboarding.subtitle',
                'Let’s set up the basics so you can make the most of your workspace.'
              )}
              {tenantName ? ` — ${tenantName}` : ''}
            </Typography>
          </Box>

          <GridSteps steps={steps} />

          <Box>
            <Button
              component={NextLink}
              href={paths.dashboard.fsa.workOrders.new}
              variant="contained"
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
            >
              {t('onboarding.cta_primary', 'Skip and create work order')}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

type Step = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  actionHref: string;
  actionLabel: string;
};

function GridSteps({ steps }: { steps: Step[] }) {
  return (
    <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr 1fr' }} gap={2}>
      {steps.map((s, idx) => (
        <Card key={idx} variant="outlined">
          <CardContent>
            <Stack spacing={1.5} alignItems="flex-start">
              <Box color="text.secondary">{s.icon}</Box>
              <Typography variant="h6">{s.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {s.desc}
              </Typography>
              <Button component={NextLink} href={s.actionHref} size="small">
                {s.actionLabel}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export default FsaOnboarding;
