import type { IUserItem } from 'src/types/user';

import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useTenantAPI } from 'src/hooks/use-tenant';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

type Props = {
  row: IUserItem;
  selected: boolean;
  editHref: string;
  onSelectRow: () => void;
  onDeleteRow: () => void;
  onEdit?: () => void;
};

export function PersonnelUserTableRow({
  row,
  selected,
  editHref,
  onSelectRow,
  onDeleteRow,
  onEdit,
}: Props) {
  const confirmDialog = useBoolean();
  const { getURL } = useTenantAPI();

  const handleToggleActive = async (checked: boolean) => {
    try {
      const response = await fetch(getURL(`/api/v1/personnel/${row.id}/toggle-active`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Personnel status updated:', result);
        // You might want to trigger a refresh of the data here
        // or update the local state
      } else {
        console.error('Failed to update personnel status');
      }
    } catch (error) {
      console.error('Error updating personnel status:', error);
    }
  };

  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete"
      content="Are you sure want to delete?"
      action={
        <Button variant="contained" color="error" onClick={onDeleteRow}>
          Delete
        </Button>
      }
    />
  );

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onClick={onSelectRow}
            slotProps={{
              input: {
                id: `${row.id}-checkbox`,
                'aria-label': `${row.id} checkbox`,
              },
            }}
          />
        </TableCell>

        <TableCell>
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar alt={row.name} src={row.avatarUrl} />

            <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
              <Link
                href={editHref || '#'}
                color="inherit"
                sx={{ cursor: 'pointer' }}
                onClick={(e) => {
                  if (onEdit) {
                    e.preventDefault();
                    onEdit();
                  }
                }}
              >
                {row.name}
              </Link>
              <Box component="span" sx={{ color: 'text.disabled' }}>
                {row.email}
              </Box>
            </Stack>
          </Box>
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.phoneNumber}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.role}</TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={
              (row.status === 'active' && 'success') ||
              (row.status === 'pending' && 'warning') ||
              (row.status === 'banned' && 'error') ||
              'default'
            }
          >
            {row.status}
          </Label>
        </TableCell>

        <TableCell>
          <FormControlLabel
            control={
              <Switch
                checked={row.isActive ?? true}
                onChange={(e) => handleToggleActive(e.target.checked)}
                size="small"
              />
            }
            label=""
            sx={{ margin: 0 }}
          />
        </TableCell>

        <TableCell align="right">
          <Tooltip title="Delete" placement="top" arrow>
            <IconButton color="error" onClick={confirmDialog.onTrue}>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      {renderConfirmDialog()}
    </>
  );
}
