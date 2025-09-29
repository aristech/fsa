'use client';

/* eslint-disable perfectionist/sort-imports */

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { truncateText } from 'src/utils/text-truncate';

import { WebhookFormDialog, type Webhook as WebhookFormModel } from './webhook-form-dialog';
import { webhooksApi, type Webhook } from 'src/services/webhooks';
import { Container } from '@mui/material';

// ----------------------------------------------------------------------

export function WebhooksView() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookFormModel | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; webhook: Webhook | null }>({
    open: false,
    webhook: null,
  });
  const [loading, setLoading] = useState(true);
  const [secretDialog, setSecretDialog] = useState<{ open: boolean; secret: string }>({
    open: false,
    secret: '',
  });

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const response = await webhooksApi.getWebhooks();
      if (response.success) {
        setWebhooks(response.data);
      }
    } catch (error) {
      console.error('Failed to load webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const handleCreate = () => {
    setEditingWebhook(null);
    setOpenForm(true);
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setOpenForm(true);
  };

  const handleDelete = (webhook: Webhook) => setDeleteDialog({ open: true, webhook });

  const handleConfirmDelete = async () => {
    if (!deleteDialog.webhook) return;

    try {
      const response = await webhooksApi.deleteWebhook(deleteDialog.webhook._id);
      if (response.success) {
        setWebhooks((prev) => prev.filter((w) => w._id !== deleteDialog.webhook!._id));
        toast.success('Webhook deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      toast.error('Failed to delete webhook');
    }

    setDeleteDialog({ open: false, webhook: null });
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingWebhook) {
        const response = await webhooksApi.updateWebhook(editingWebhook._id, data);
        if (response.success) {
          setWebhooks((prev) =>
            prev.map((w) => (w._id === editingWebhook._id ? response.data : w))
          );
          toast.success('Webhook updated successfully');
        }
      } else {
        const response = await webhooksApi.createWebhook(data);
        if (response.success) {
          setWebhooks((prev) => [response.data, ...prev]);
          toast.success('Webhook created successfully');

          // Show secret key dialog
          setSecretDialog({ open: true, secret: response.secretKey });
        }
      }
      setOpenForm(false);
      setEditingWebhook(null);
    } catch (error) {
      console.error('Failed to save webhook:', error);
      toast.error(`Failed to ${editingWebhook ? 'update' : 'create'} webhook`);
    }
  };

  const handleTest = async (webhook: Webhook) => {
    try {
      const response = await webhooksApi.testWebhook(webhook._id);
      if (response.success && response.data.success) {
        toast.success(`Webhook test successful (${response.data.httpStatus})`);
      } else {
        toast.error(`Webhook test failed: ${response.data.errorMessage || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to test webhook:', error);
      toast.error('Failed to test webhook');
    }
  };

  return (
    <Container maxWidth={false}>
      <Card>
        <CardHeader
          title="Webhooks"
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              onClick={handleCreate}
            >
              Create Webhook
            </Button>
          }
        />
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{truncateText('Name')}</TableCell>
                    <TableCell>{truncateText('Status')}</TableCell>
                    <TableCell>{truncateText('Topics')}</TableCell>
                    <TableCell>{truncateText('Delivery URL')}</TableCell>
                    <TableCell>{truncateText('Last Triggered')}</TableCell>
                    <TableCell>{truncateText('Failures')}</TableCell>
                    <TableCell align="right">{truncateText('Actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {webhooks.map((w) => (
                    <TableRow key={w._id}>
                      <TableCell>
                        <Typography variant="subtitle2">{truncateText(w.name)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={truncateText(w.status ? 'Active' : 'Inactive')}
                          color={w.status ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {w.topics.map((t) => (
                            <Chip key={t} label={truncateText(t)} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {truncateText(w.deliveryUrl)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {w.lastTriggeredAt
                            ? new Date(w.lastTriggeredAt).toLocaleString()
                            : 'Never'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={w.failureCount}
                          size="small"
                          color={w.failureCount > 0 ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton size="small" onClick={() => handleTest(w)} title="Test">
                            <Iconify icon="solar:play-bold" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleEdit(w)} title="Edit">
                            <Iconify icon="solar:pen-bold" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(w)}
                            title="Delete"
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <WebhookFormDialog
        open={openForm}
        webhook={editingWebhook}
        onClose={() => {
          setOpenForm(false);
          setEditingWebhook(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, webhook: null })}
        title="Delete Webhook"
        content={`Are you sure you want to delete "${deleteDialog.webhook?.name}"?`}
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />

      <ConfirmDialog
        open={secretDialog.open}
        onClose={() => setSecretDialog({ open: false, secret: '' })}
        title="Webhook Secret Key"
        content={
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This is your webhook secret key. Store it securely - it won&apos;t be shown again.
            </Alert>
            <TextField
              value={secretDialog.secret}
              fullWidth
              multiline
              rows={3}
              InputProps={{ readOnly: true }}
              sx={{ fontFamily: 'monospace' }}
            />
          </>
        }
        action={
          <Button
            variant="contained"
            onClick={() => {
              navigator.clipboard.writeText(secretDialog.secret);
              toast.success('Secret key copied to clipboard');
              setSecretDialog({ open: false, secret: '' });
            }}
          >
            Copy & Close
          </Button>
        }
      />
    </Container>
  );
}
