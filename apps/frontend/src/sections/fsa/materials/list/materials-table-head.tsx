'use client';

import { Checkbox, TableRow, TableCell, TableHead, TableSortLabel } from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';

// ----------------------------------------------------------------------

interface MaterialsTableHeadProps {
  order: 'asc' | 'desc';
  orderBy: string;
  onSort: (id: string) => void;
  onSelectAllRows: (checked: boolean) => void;
  numSelected: number;
  rowCount: number;
}

// ----------------------------------------------------------------------

const createTableHead = (t: any) =>
  [
    { id: 'name', label: t('materials.table.material'), align: 'left' as const },
    { id: 'category', label: t('materials.table.category'), align: 'left' as const },
    { id: 'sku', label: t('materials.table.sku'), align: 'left' as const },
    { id: 'quantity', label: t('materials.table.quantity'), align: 'center' as const },
    { id: 'unitCost', label: t('materials.table.unitCost'), align: 'center' as const },
    { id: 'location', label: t('materials.table.location'), align: 'left' as const },
    { id: 'status', label: t('materials.table.status'), align: 'center' as const },
    { id: '', label: '', align: 'right' as const },
  ] as const;

export function MaterialsTableHead({
  order,
  orderBy,
  onSort,
  onSelectAllRows,
  numSelected,
  rowCount,
}: MaterialsTableHeadProps) {
  const { t } = useTranslate('dashboard');
  const TABLE_HEAD = createTableHead(t);

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={(event) => onSelectAllRows(event.target.checked)}
          />
        </TableCell>

        {TABLE_HEAD.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.align}
            sortDirection={orderBy === headCell.id ? order : false}
            sx={{ width: (headCell as any).width, minWidth: (headCell as any).minWidth }}
          >
            {headCell.id ? (
              <TableSortLabel
                hideSortIcon
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={() => onSort(headCell.id)}
              >
                {headCell.label}
              </TableSortLabel>
            ) : (
              headCell.label
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
