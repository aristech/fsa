'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePopover } from 'minimal-shared/hooks';

import {
  Box,
  Card,
  Table,
  Stack,
  Button,
  Avatar,
  Dialog,
  Popover,
  TableRow,
  MenuItem,
  TableBody,
  TableCell,
  TableHead,
  IconButton,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  CircularProgress,
  DialogContentText,
} from '@mui/material';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { View403 } from 'src/sections/error';

// ----------------------------------------------------------------------

type Client = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  vatNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactPerson?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// ----------------------------------------------------------------------

export function ClientList() {
  const popover = usePopover();
  const router = useRouter();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch clients from API with pagination
  const { data, error, isLoading, mutate } = useSWR(
    `${endpoints.fsa.clients.list}?limit=${rowsPerPage}&offset=${page * rowsPerPage}`,
    fetcher<{
      success: boolean;
      data: { clients: Client[]; total: number; limit: number; offset: number };
    }>
  );

  const clients = data?.data?.clients || [];
  const total = data?.data?.total || 0;

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Action handlers
  const handleEditClient = (client: Client) => {
    router.push(`/dashboard/clients/${client._id}/edit`);
    popover.onClose();
  };

  const handleViewWorkOrders = (client: Client) => {
    router.push(`/dashboard/work-orders?clientId=${client._id}`);
    popover.onClose();
  };

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
    popover.onClose();
  };

  const confirmDelete = async () => {
    if (!selectedClient) return;

    try {
      setIsDeleting(true);
      await axiosInstance.delete(endpoints.fsa.clients.details(selectedClient._id));
      toast.success('Client deleted successfully');
      mutate(); // Refresh the list
      setDeleteDialogOpen(false);
      setSelectedClient(null);
    } catch (deleteError) {
      console.error('Error deleting client:', deleteError);
      toast.error('Failed to delete client');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleActionClick = (client: Client, event: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedClient(client);
    popover.onOpen(event);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </Card>
    );
  }

  // Error state
  if (error) {
    return <View403 />;
  }

  return (
    <>
      <Card>
        <Scrollbar>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>VAT Number</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client._id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar
                        alt={client.name}
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: 'primary.main',
                        }}
                      >
                        {client.name.charAt(0)}
                      </Avatar>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2">{client.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {client.email}
                        </Typography>
                      </Stack>
                    </Stack>
                  </TableCell>

                  <TableCell>{client.company || '-'}</TableCell>

                  <TableCell>{client.vatNumber || '-'}</TableCell>

                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">{client.phone || '-'}</Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {client.address && client.address.city && client.address.state
                        ? `${client.address.city}, ${client.address.state}`
                        : client.address?.street || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <IconButton
                      color={
                        popover.open && selectedClient?._id === client._id ? 'inherit' : 'default'
                      }
                      onClick={(event) => handleActionClick(client, event)}
                    >
                      <Iconify icon="solar:list-bold" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
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
        <MenuItem onClick={() => selectedClient && handleEditClient(selectedClient)}>
          <Iconify icon="solar:pen-bold" sx={{ mr: 2 }} />
          Edit
        </MenuItem>

        <MenuItem onClick={() => selectedClient && handleViewWorkOrders(selectedClient)}>
          <Iconify icon="solar:list-bold" sx={{ mr: 2 }} />
          Work Orders
        </MenuItem>

        <MenuItem
          onClick={() => selectedClient && handleDeleteClient(selectedClient)}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" sx={{ mr: 2 }} />
          Delete
        </MenuItem>
      </Popover>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Delete Client</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete &quot;{selectedClient?.name}&quot;? This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
