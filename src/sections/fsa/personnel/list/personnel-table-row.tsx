'use client';

import { useState } from 'react';

import { useTheme } from '@mui/material/styles';
import {
  Box,
  Chip,
  Stack,
  Avatar,
  Tooltip,
  TableRow,
  Checkbox,
  TableCell,
  Typography,
  IconButton,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

import { PersonnelQuickEditForm } from './personnel-quick-edit-form';

// ----------------------------------------------------------------------

interface Personnel {
  _id: string;
  employeeId: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  roleId?: {
    _id: string;
    name: string;
    color: string;
  };
  skills: string[];
  hourlyRate: number;
  isActive: boolean;
  taskCount: number;
  projectCount: number;
  totalAssignments: number;
}

interface PersonnelTableRowProps {
  row: Personnel;
  selected: boolean;
  onSelectRow: () => void;
}

// ----------------------------------------------------------------------

export function PersonnelTableRow({ row, selected, onSelectRow }: PersonnelTableRowProps) {
  const theme = useTheme();
  const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setOpenPopover(event.currentTarget);
  };

  const handleClosePopover = () => {
    setOpenPopover(null);
  };

  const getStatusColor = () => {
    if (!row.roleId) {
      return theme.palette.error.main; // No role assigned
    }
    if (!row.isActive) {
      return theme.palette.grey[500]; // Inactive
    }
    return theme.palette.success.main; // Active with role
  };

  const getStatusLabel = () => {
    if (!row.roleId) {
      return 'No Role';
    }
    if (!row.isActive) {
      return 'Inactive';
    }
    return 'Active';
  };

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              alt={row.userId.name}
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${row.userId.name}`}
              sx={{ width: 40, height: 40 }}
            />
            <Box>
              <Typography variant="subtitle2" noWrap>
                {row.userId.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {row.employeeId}
              </Typography>
            </Box>
          </Stack>
        </TableCell>

        <TableCell>
          {row.roleId ? (
            <Chip
              label={row.roleId.name}
              size="small"
              sx={{
                backgroundColor: row.roleId.color,
                color: 'white',
                fontWeight: 600,
              }}
            />
          ) : (
            <Chip label="No Role" size="small" color="error" variant="outlined" />
          )}
        </TableCell>

        <TableCell>
          <Chip
            label={getStatusLabel()}
            size="small"
            sx={{
              backgroundColor: getStatusColor(),
              color: 'white',
            }}
          />
        </TableCell>

        <TableCell>
          <Stack direction="row" spacing={1}>
            {row.skills.slice(0, 2).map((skill) => (
              <Chip
                key={skill}
                label={skill}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            ))}
            {row.skills.length > 2 && (
              <Chip
                label={`+${row.skills.length - 2}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
          </Stack>
        </TableCell>

        <TableCell align="center">
          <Typography variant="body2" fontWeight={600}>
            ${row.hourlyRate}/hr
          </Typography>
        </TableCell>

        <TableCell align="center">
          <Stack direction="row" spacing={1} justifyContent="center">
            <Tooltip title="Tasks">
              <Chip label={row.taskCount} size="small" color="primary" variant="outlined" />
            </Tooltip>
            <Tooltip title="Projects">
              <Chip label={row.projectCount} size="small" color="secondary" variant="outlined" />
            </Tooltip>
          </Stack>
        </TableCell>

        <TableCell align="center">
          <Typography variant="body2" fontWeight={600}>
            {row.totalAssignments}
          </Typography>
        </TableCell>

        <TableCell align="right">
          <Tooltip title="Edit">
            <IconButton onClick={handleOpenPopover}>
              <Iconify icon="solar:pen-bold" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      <PersonnelQuickEditForm open={openPopover} onClose={handleClosePopover} personnel={row} />
    </>
  );
}
