'use client';

import { useState } from 'react';

import { Box, Card, Stack, Typography } from '@mui/material';

import { WorkOrderSmsReminders } from './work-order-sms-reminders';

// ----------------------------------------------------------------------

// Demo data
const DEMO_CLIENT = {
  _id: '1',
  name: 'John Doe',
  company: 'Acme Corp',
  phone: '+1234567890',
  contactPerson: {
    name: 'Jane Smith',
    phone: '+0987654321',
    email: 'jane@acme.com',
  },
};

const DEMO_SCHEDULED_DATE = new Date('2024-02-15T10:00:00Z');

// ----------------------------------------------------------------------

export function WorkOrderSmsRemindersDemo() {
  const [config, setConfig] = useState<any>(null);

  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig);
    console.log('SMS Config Updated:', newConfig);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        SMS/Viber Reminders Demo
      </Typography>

      <Stack spacing={3}>
        <Card sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Demo Scenario
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Client: {DEMO_CLIENT.name} ({DEMO_CLIENT.company})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Phone: {DEMO_CLIENT.phone}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Contact Person: {DEMO_CLIENT.contactPerson.name} ({DEMO_CLIENT.contactPerson.phone})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Scheduled Date: {DEMO_SCHEDULED_DATE.toLocaleDateString()}
          </Typography>
        </Card>

        <WorkOrderSmsReminders
          client={DEMO_CLIENT}
          scheduledDate={DEMO_SCHEDULED_DATE}
          workOrderTitle="Monthly HVAC Maintenance"
          onConfigChange={handleConfigChange}
          mode="create"
          showComponent
        />

        {config && (
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Current Configuration
            </Typography>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(config, null, 2)}
            </pre>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
