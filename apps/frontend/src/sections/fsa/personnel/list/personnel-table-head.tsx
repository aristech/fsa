'use client';

import { TableRow, Checkbox, TableHead, TableCell, TableSortLabel } from '@mui/material';

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

const TABLE_HEAD = [
  { id: 'name', label: 'Personnel', align: 'left' as const },
  { id: 'role', label: 'Role', align: 'left' as const },
  { id: 'status', label: 'Status', align: 'left' as const },
  { id: 'skills', label: 'Skills', align: 'left' as const },
  { id: 'hourlyRate', label: 'Rate', align: 'center' as const },
  { id: 'assignments', label: 'Assignments', align: 'center' as const },
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
