import { Container, Typography } from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';

import { WorkOrderCreateForm } from '../work-order-create-form';

// ----------------------------------------------------------------------

export function WorkOrderCreateView() {
  const { t } = useTranslate('common');
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 5 }}>
        {t('pages.createWorkOrder', { defaultValue: 'Create Work Order' })}
      </Typography>

      <WorkOrderCreateForm />
    </Container>
  );
}
