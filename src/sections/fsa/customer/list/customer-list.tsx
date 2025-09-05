'use client';

import { useState } from 'react';
import { usePopover } from 'minimal-shared/hooks';

import {
  Card,
  Table,
  Stack,
  Button,
  Avatar,
  Popover,
  TableRow,
  MenuItem,
  TableBody,
  TableCell,
  TableHead,
  IconButton,
  Typography,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const CUSTOMERS = [
  {
    id: '1',
    name: 'TechCorp Solutions',
    email: 'contact@techcorp.com',
    phone: '+1-555-0456',
    company: 'TechCorp Solutions Inc.',
    address: '123 Business Ave, New York, NY 10001',
    workOrdersCount: 5,
    lastWorkOrder: '2024-01-15',
  },
  {
    id: '2',
    name: 'ABC Manufacturing',
    email: 'info@abcmanufacturing.com',
    phone: '+1-555-0789',
    company: 'ABC Manufacturing Co.',
    address: '456 Industrial Blvd, Chicago, IL 60601',
    workOrdersCount: 12,
    lastWorkOrder: '2024-01-14',
  },
  {
    id: '3',
    name: 'XYZ Office Building',
    email: 'admin@xyzoffice.com',
    phone: '+1-555-0321',
    company: 'XYZ Office Building LLC',
    address: '789 Corporate Dr, Los Angeles, CA 90210',
    workOrdersCount: 3,
    lastWorkOrder: '2024-01-13',
  },
  {
    id: '4',
    name: 'Safety First Corp',
    email: 'safety@safetyfirst.com',
    phone: '+1-555-0654',
    company: 'Safety First Corporation',
    address: '321 Security St, Houston, TX 77001',
    workOrdersCount: 8,
    lastWorkOrder: '2024-01-16',
  },
];

// ----------------------------------------------------------------------

export function CustomerList() {
  const [tableData] = useState(CUSTOMERS);
  const popover = usePopover();

  return (
    <>
      <Card>
        <CustomBreadcrumbs
          heading="Customers"
          links={[{ name: 'Dashboard', href: '/dashboard' }, { name: 'Customers' }]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              href="/dashboard/customers/new"
            >
              New Customer
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Scrollbar>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Work Orders</TableCell>
                <TableCell>Last Work Order</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar
                        alt={row.name}
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: 'primary.main',
                        }}
                      >
                        {row.name.charAt(0)}
                      </Avatar>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2">{row.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {row.email}
                        </Typography>
                      </Stack>
                    </Stack>
                  </TableCell>

                  <TableCell>{row.company}</TableCell>

                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">{row.phone}</Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.address}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {row.workOrdersCount}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.lastWorkOrder}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <IconButton
                      color={popover.open ? 'inherit' : 'default'}
                      onClick={popover.onOpen}
                    >
                      <Iconify icon="solar:list-bold" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Scrollbar>
      </Card>

      <Popover
        open={popover.open}
        onClose={popover.onClose}
        anchorEl={popover.open ? popover.anchorEl : null}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { width: 160 },
        }}
      >
        <MenuItem onClick={popover.onClose}>
          <Iconify icon="solar:eye-bold" sx={{ mr: 2 }} />
          View
        </MenuItem>

        <MenuItem onClick={popover.onClose}>
          <Iconify icon="solar:pen-bold" sx={{ mr: 2 }} />
          Edit
        </MenuItem>

        <MenuItem onClick={popover.onClose}>
          <Iconify icon="solar:list-bold" sx={{ mr: 2 }} />
          Work Orders
        </MenuItem>

        <MenuItem onClick={popover.onClose} sx={{ color: 'error.main' }}>
          <Iconify icon="solar:trash-bin-trash-bold" sx={{ mr: 2 }} />
          Delete
        </MenuItem>
      </Popover>
    </>
  );
}
