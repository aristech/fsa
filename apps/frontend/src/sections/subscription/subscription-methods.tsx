import type { BoxProps } from '@mui/material/Box';

import { useState, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';

import { Iconify } from 'src/components/iconify';

import { SubscriptionCardCreateForm } from './subscription-card-create-form';

// ----------------------------------------------------------------------

const PAYMENT_OPTIONS = [
  { label: 'Credit / Debit Card', value: 'card' },
  { label: 'Bank Transfer', value: 'bank' },
];

const CARD_OPTIONS = [
  { value: 'visa1', label: '**** **** **** 1212 - Visa ending in 1212' },
  { value: 'visa2', label: '**** **** **** 2424 - Visa ending in 2424' },
  { value: 'mastercard', label: '**** **** **** 4545 - Mastercard ending in 4545' },
];

// ----------------------------------------------------------------------

export function SubscriptionMethods({ sx, ...other }: BoxProps) {
  const openForm = useBoolean();
  const [method, setMethod] = useState('card');

  const handleChangeMethod = useCallback((newValue: string) => {
    setMethod(newValue);
  }, []);

  const handleManagePaymentMethods = async () => {
    try {
      console.log('Opening Stripe billing portal for payment method management');

      // Import endpoints dynamically
      const { endpoints } = await import('src/lib/axios');

      const response = await endpoints.subscription.createPortalSession();

      if (response.data.success && response.data.data?.url) {
        console.log('Redirecting to Stripe billing portal:', response.data.data.url);
        window.location.href = response.data.data.url;
      } else {
        throw new Error('Failed to create portal session');
      }
    } catch (error) {
      console.error('Billing portal creation failed:', error);
      // Fallback: show error message
      alert('Unable to open billing portal. Please try again later.');
    }
  };

  const renderCardCreateFormDialog = () => (
    <Dialog fullWidth maxWidth="xs" open={openForm.value} onClose={openForm.onFalse}>
      <DialogTitle>Add Payment Method</DialogTitle>

      <SubscriptionCardCreateForm sx={{ px: 3 }} />

      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={openForm.onFalse}>
          Cancel
        </Button>
        <Button color="inherit" variant="contained" onClick={openForm.onFalse}>
          Add Method
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Box sx={sx} {...other}>
        <Typography component="h6" variant="h5" sx={{ mb: { xs: 3, md: 5 } }}>
          Payment Methods
        </Typography>

        <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
          {PAYMENT_OPTIONS.map((option) => {
            const isSelected = method === option.value;

            return (
              <OptionItem
                key={option.label}
                option={option}
                selected={isSelected}
                onOpen={openForm.onTrue}
                isCard={isSelected && option.value === 'card'}
                onClick={() => handleChangeMethod(option.value)}
              />
            );
          })}
        </Box>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={openForm.onTrue}
          >
            Add Payment Method
          </Button>

          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:settings-bold" />}
            onClick={handleManagePaymentMethods}
          >
            Manage Methods
          </Button>
        </Box>
      </Box>

      {renderCardCreateFormDialog()}
    </>
  );
}

// ----------------------------------------------------------------------

type OptionItemProps = BoxProps & {
  selected: boolean;
  isCard: boolean;
  onOpen: () => void;
  option: (typeof PAYMENT_OPTIONS)[number];
};

function OptionItem({ option, onOpen, selected, isCard, sx, ...other }: OptionItemProps) {
  return (
    <Box
      sx={[
        (theme) => ({
          borderRadius: 1.5,
          border: `solid 1px ${varAlpha(theme.vars?.palette.grey['500Channel'] || '0 0 0', 0.24)}`,
          transition: theme.transitions.create(['box-shadow'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shortest,
          }),
          ...(selected && { boxShadow: `0 0 0 2px ${theme.vars?.palette.text.primary}` }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        sx={{
          px: 2,
          gap: 2,
          height: 80,
          display: 'flex',
          cursor: 'pointer',
          alignItems: 'center',
        }}
      >
        <Iconify
          width={24}
          icon={selected ? 'solar:check-circle-bold' : 'eva:radio-button-off-fill'}
          sx={{ color: 'text.disabled', ...(selected && { color: 'primary.main' }) }}
        />

        <Box component="span" sx={{ typography: 'subtitle1', flexGrow: 1 }}>
          {option.label}
        </Box>

        <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
          {option.value === 'card' ? (
            <>
              <Iconify icon="payments:mastercard" width={36} height="auto" />
              <Iconify icon="payments:visa" width={36} height="auto" />
            </>
          ) : (
            <Iconify icon="solar:bank-bold" width={24} />
          )}
        </Box>
      </Box>

      {isCard && (
        <Box sx={{ px: 3 }}>
          <TextField select fullWidth label="Saved Cards" slotProps={{ select: { native: true } }}>
            {CARD_OPTIONS.map((card) => (
              <option key={card.value} value={card.value}>
                {card.label}
              </option>
            ))}
          </TextField>
        </Box>
      )}
    </Box>
  );
}
