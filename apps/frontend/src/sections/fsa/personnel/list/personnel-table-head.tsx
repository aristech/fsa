'use client';

import { Checkbox, TableRow, TableCell, TableHead, TableSortLabel } from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';

// ----------------------------------------------------------------------

interface PersonnelTableHeadProps {
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
    { id: 'name', label: t('personnel.table.name'), align: 'left' as const },
    { id: 'role', label: t('personnel.table.role'), align: 'left' as const },
    { id: 'status', label: t('personnel.table.status'), align: 'left' as const },
    { id: 'skills', label: t('personnel.table.skills'), align: 'left' as const },
    { id: 'hourlyRate', label: t('personnel.table.hourlyRate'), align: 'center' as const },
    { id: 'assignments', label: t('personnel.table.totalAssignments'), align: 'center' as const },
    { id: 'total', label: 'Total', align: 'center' as const },
    { id: '', label: '', align: 'right' as const },
  ] as const;

export function PersonnelTableHead({
  order,
  orderBy,
  onSort,
  onSelectAllRows,
  numSelected,
  rowCount,
}: PersonnelTableHeadProps) {
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
