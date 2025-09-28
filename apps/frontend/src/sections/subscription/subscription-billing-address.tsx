import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export function SubscriptionBillingAddress({ sx, ...other }: BoxProps) {
  return (
    <Box sx={sx} {...other}>
      <Typography component="h6" variant="h5" sx={{ mb: { xs: 3, md: 5 } }}>
        Billing Address
      </Typography>

      <Stack spacing={3}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField fullWidth label="First Name" placeholder="John" />
          <TextField fullWidth label="Last Name" placeholder="Doe" />
        </Box>

        <TextField fullWidth label="Company" placeholder="Acme Corp" />

        <TextField fullWidth label="Address Line 1" placeholder="123 Main Street" />

        <TextField fullWidth label="Address Line 2" placeholder="Suite 100 (optional)" />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
          <TextField fullWidth label="City" placeholder="New York" />
          <TextField fullWidth label="State" placeholder="NY" />
          <TextField fullWidth label="ZIP Code" placeholder="10001" />
        </Box>

        <TextField fullWidth label="Country" placeholder="United States" />
      </Stack>
    </Box>
  );
}
