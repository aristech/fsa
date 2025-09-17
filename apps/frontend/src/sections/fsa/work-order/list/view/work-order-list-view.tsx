import { Container, Typography } from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';

import { WorkOrderList } from '../work-order-list';

// ----------------------------------------------------------------------

export function WorkOrderListView() {
  const { t } = useTranslate('common');
  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 5 }}>
        {t('pages.workOrders', { defaultValue: 'Work Orders' })}
      </Typography>

      <WorkOrderList />
    </Container>
  );
}
