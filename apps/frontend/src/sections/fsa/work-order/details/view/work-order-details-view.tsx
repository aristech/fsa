import { Container, Typography } from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';

import { WorkOrderDetails } from '../work-order-details';

// ----------------------------------------------------------------------

type Props = {
  id: string;
};

export function WorkOrderDetailsView({ id }: Props) {
  const { t } = useTranslate('common');
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 5 }}>
        {t('pages.workOrderDetails', { defaultValue: 'Work Order Details' })}
      </Typography>

      <WorkOrderDetails id={id} />
    </Container>
  );
}
