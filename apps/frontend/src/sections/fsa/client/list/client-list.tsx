'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePopover } from 'minimal-shared/hooks';

import {
  Box,
  Card,
  Stack,
  Table,
  Avatar,
  Button,
  Popover,
  MenuItem,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  IconButton,
  Typography,
  TablePagination,
  CircularProgress,
} from '@mui/material';

import { truncateText } from 'src/utils/text-truncate';

import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CascadeDeleteDialog, type CascadeDeleteInfo } from 'src/components/cascade-delete-dialog';

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
  const { t } = useTranslate('dashboard');
  const popover = usePopover();
  const router = useRouter();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cascadeDeleteInfo, setCascadeDeleteInfo] = useState<CascadeDeleteInfo | null>(null);
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

  const handleDeleteClient = async (client: Client) => {
    setSelectedClient(client);
    popover.onClose();

    try {
      // Fetch related data count before showing dialog
      const response = await axiosInstance.get(
        `${endpoints.fsa.clients.details(client._id)}/delete-info`
      );
      setCascadeDeleteInfo(response.data.data);
      setDeleteDialogOpen(true);
    } catch (fetchError) {
      console.error('Failed to fetch delete info:', fetchError);
      toast.error('Failed to load deletion information');
    }
  };

  const confirmDelete = async (cascadeDelete: boolean) => {
    if (!selectedClient) return;

    try {
      setIsDeleting(true);
      await axiosInstance.delete(
        `${endpoints.fsa.clients.details(selectedClient._id)}${cascadeDelete ? '?cascade=true' : ''}`
      );
      toast.success(t('clients.clientDeleted'));
      mutate(); // Refresh the list
      setDeleteDialogOpen(false);
      setSelectedClient(null);
      setCascadeDeleteInfo(null);
    } catch (deleteError) {
      console.error('Error deleting client:', deleteError);
      toast.error(t('clients.failedToDelete'));
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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => router.push('/dashboard/clients/new/')}
        >
          {t('clients.createNew', { defaultValue: 'Create New Client' })}
        </Button>
      </Box>

      <Card>
        <Scrollbar>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>{truncateText(t('clients.table.client'))}</TableCell>
                <TableCell>{truncateText(t('clients.table.company'))}</TableCell>
                <TableCell>{truncateText(t('clients.table.vatNumber'))}</TableCell>
                <TableCell>{truncateText(t('clients.table.contact'))}</TableCell>
                <TableCell>{truncateText(t('clients.table.location'))}</TableCell>
                <TableCell>{truncateText(t('clients.table.created'))}</TableCell>
                <TableCell align="right">{truncateText(t('clients.table.actions'))}</TableCell>
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
                        <Typography variant="subtitle2">{truncateText(client.name)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {truncateText(client.email)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </TableCell>

                  <TableCell>{truncateText(client.company) || '-'}</TableCell>

                  <TableCell>{truncateText(client.vatNumber) || '-'}</TableCell>

                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">{truncateText(client.phone) || '-'}</Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {client.address && client.address.city && client.address.state
                        ? truncateText(`${client.address.city}, ${client.address.state}`)
                        : truncateText(client.address?.street) || '-'}
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
          {t('clients.table.edit')}
        </MenuItem>

        <MenuItem onClick={() => selectedClient && handleViewWorkOrders(selectedClient)}>
          <Iconify icon="solar:list-bold" sx={{ mr: 2 }} />
          {t('clients.table.workOrders')}
        </MenuItem>

        <MenuItem
          onClick={() => selectedClient && handleDeleteClient(selectedClient)}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" sx={{ mr: 2 }} />
          {t('clients.table.delete')}
        </MenuItem>
      </Popover>

      {/* Cascade Delete Dialog */}
      {cascadeDeleteInfo && (
        <CascadeDeleteDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setCascadeDeleteInfo(null);
          }}
          onConfirm={confirmDelete}
          title={t('clients.deleteClient', { defaultValue: 'Delete Client' })}
          entityName={selectedClient?.name || 'Client'}
          entityType="client"
          info={cascadeDeleteInfo}
          loading={isDeleting}
        />
      )}
    </>
  );
}
