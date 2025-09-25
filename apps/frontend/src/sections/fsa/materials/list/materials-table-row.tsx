'use client';

import type { IMaterial } from 'src/lib/models/Material';

import { useTheme } from '@mui/material/styles';
import {
  Chip,
  Stack,
  Tooltip,
  Checkbox,
  TableRow,
  TableCell,
  IconButton,
  Typography,
} from '@mui/material';

import { fCurrency } from 'src/utils/format-number';
import { truncateText } from 'src/utils/text-truncate';

import { useTranslate } from 'src/locales/use-locales';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface MaterialsTableRowProps {
  row: IMaterial;
  selected: boolean;
  onSelectRow: () => void;
  onEdit: () => void;
}

// ----------------------------------------------------------------------

export function MaterialsTableRow({ row, selected, onSelectRow, onEdit }: MaterialsTableRowProps) {
  const { t } = useTranslate('dashboard');
  const theme = useTheme();

  const getStatusColor = () => {
    switch (row.status) {
      case 'active':
        return theme.palette.success.main;
      case 'inactive':
        return theme.palette.warning.main;
      case 'discontinued':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const isLowStock = row.minimumStock && row.quantity <= row.minimumStock;

  return (
    <TableRow hover selected={selected}>
      <TableCell padding="checkbox">
        <Checkbox checked={selected} onClick={onSelectRow} />
      </TableCell>

      <TableCell>
        <Stack spacing={0.5}>
          <Typography variant="subtitle2" noWrap>
            {truncateText(row.name)}
          </Typography>
          {row.description && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {truncateText(row.description)}
            </Typography>
          )}
          {row.sku && (
            <Typography variant="caption" color="text.secondary">
              SKU: {truncateText(row.sku)}
            </Typography>
          )}
        </Stack>
      </TableCell>

      <TableCell>
        {row.category ? (
          <Chip
            label={truncateText(row.category)}
            size="small"
            variant="outlined"
            color="primary"
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        )}
      </TableCell>

      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {truncateText(row.sku) || '-'}
        </Typography>
      </TableCell>

      <TableCell align="center">
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
          <Typography
            variant="body2"
            fontWeight={600}
            color={isLowStock ? 'error.main' : 'text.primary'}
          >
            {row.quantity} {row.unit}
          </Typography>
          {isLowStock && (
            <Tooltip title={t('materials.status.lowStock')}>
              <Iconify
                icon="solar:danger-triangle-bold"
                sx={{ color: 'error.main', width: 16, height: 16 }}
              />
            </Tooltip>
          )}
        </Stack>
      </TableCell>

      <TableCell align="center">
        <Typography variant="body2" fontWeight={600}>
          {fCurrency(row.unitCost)}
        </Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2">{truncateText(row.location) || '-'}</Typography>
      </TableCell>

      <TableCell align="center">
        <Chip
          label={row.status}
          size="small"
          sx={{
            backgroundColor: getStatusColor(),
            color: 'white',
            textTransform: 'capitalize',
          }}
        />
      </TableCell>

      <TableCell align="right">
        <Tooltip title={t('materials.table.edit')}>
          <IconButton onClick={onEdit}>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
