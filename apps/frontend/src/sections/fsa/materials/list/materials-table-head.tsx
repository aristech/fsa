'use client';

import { Checkbox, TableRow, TableCell, TableHead, TableSortLabel } from '@mui/material';

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

const TABLE_HEAD = [
  { id: 'name', label: 'Material', align: 'left' as const },
  { id: 'category', label: 'Category', align: 'left' as const },
  { id: 'sku', label: 'SKU', align: 'left' as const },
  { id: 'quantity', label: 'Quantity', align: 'center' as const },
  { id: 'unitCost', label: 'Unit Cost', align: 'center' as const },
  { id: 'location', label: 'Location', align: 'left' as const },
  { id: 'status', label: 'Status', align: 'center' as const },
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