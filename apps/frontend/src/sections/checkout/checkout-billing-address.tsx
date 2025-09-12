import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';

import { Iconify } from 'src/components/iconify';

import { useCheckoutContext } from './context';
import { CheckoutSummary } from './checkout-summary';

// ----------------------------------------------------------------------

export function CheckoutBillingAddress() {
  const { onChangeStep, state: checkoutState } = useCheckoutContext();

  const addressForm = useBoolean();

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            size="small"
            color="inherit"
            onClick={() => onChangeStep('back')}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Back
          </Button>

          <Button
            size="small"
            color="primary"
            onClick={addressForm.onTrue}
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Add address
          </Button>
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <CheckoutSummary checkoutState={checkoutState} />
      </Grid>
    </Grid>
  );
}
