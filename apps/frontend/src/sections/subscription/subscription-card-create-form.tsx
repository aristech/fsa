import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export function SubscriptionCardCreateForm({ sx, ...other }: BoxProps) {
  return (
    <Box sx={sx} {...other}>
      <Stack spacing={3}>
        <Typography variant="h6">Add New Payment Method</Typography>

        <TextField fullWidth label="Card Number" placeholder="1234 5678 9012 3456" />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="Expiry Date" placeholder="MM/YY" />
          <TextField label="CVV" placeholder="123" />
        </Box>

        <TextField fullWidth label="Cardholder Name" placeholder="John Doe" />

        <TextField fullWidth label="Billing Address" placeholder="123 Main St, City, State 12345" />
      </Stack>
    </Box>
  );
}
