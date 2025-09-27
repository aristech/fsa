'use client';

import { useState } from 'react';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';

import { SmsRemindersTest } from '../sms-reminders-test';
import { SmsRemindersConfig } from '../sms-reminders-config';
import { SmsRemindersStatus } from '../sms-reminders-status';
import { SmsRemindersPending } from '../sms-reminders-pending';
import { SmsRemindersTemplates } from '../sms-reminders-templates';

// ----------------------------------------------------------------------

export function SmsRemindersView() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Grid container spacing={3}>
      {/* Status Overview */}
      <Grid size={{ xs: 12 }}>
        <SmsRemindersStatus key={`status-${refreshKey}`} />
      </Grid>

      {/* Configuration */}
      <Grid size={{ xs: 12, md: 6 }}>
        <SmsRemindersConfig onUpdate={handleRefresh} />
      </Grid>

      {/* Test Interface */}
      <Grid size={{ xs: 12, md: 6 }}>
        <SmsRemindersTest onTestComplete={handleRefresh} />
      </Grid>

      {/* Message Templates */}
      <Grid size={{ xs: 12 }}>
        <SmsRemindersTemplates key={`templates-${refreshKey}`} />
      </Grid>

      {/* Pending Tasks */}
      <Grid size={{ xs: 12 }}>
        <SmsRemindersPending key={`pending-${refreshKey}`} />
      </Grid>

      {/* Help Section */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ p: 3 }}>
          <Alert severity="info">
            <AlertTitle>SMS/Viber Reminders Setup</AlertTitle>
            <Typography variant="body2" sx={{ mb: 2 }}>
              This feature allows you to send automated SMS and Viber messages to clients for service reminders.
              Messages are sent to clients who have valid phone numbers and upcoming scheduled services.
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Requirements:</strong>
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li>Yuboto account with API key</li>
                <li>Sufficient account balance</li>
                <li>Clients with valid phone numbers</li>
                <li>Tasks with enabled reminders</li>
              </ul>
            </Typography>
          </Alert>
        </Card>
      </Grid>
    </Grid>
  );
}