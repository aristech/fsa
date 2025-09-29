'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import { Container } from '@mui/material';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { truncateText } from 'src/utils/text-truncate';

import { apiKeysApi, type ApiKey } from 'src/services/api-keys';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { ApiKeyTestDialog } from './apikey-test-dialog';
import { ApiKeyFormDialog, type ApiKey as ApiKeyFormModel } from './apikeys-form-dialog';

// ----------------------------------------------------------------------

export function ApiKeysView() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<ApiKeyFormModel | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; data: ApiKey | null }>({
    open: false,
    data: null,
  });
  const [showKeyDialog, setShowKeyDialog] = useState<{ open: boolean; key: string }>({
    open: false,
    key: '',
  });
  const [loading, setLoading] = useState(true);
  const [testDialog, setTestDialog] = useState<{ open: boolean; apiKey: ApiKey | null }>({
    open: false,
    apiKey: null,
  });

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const response = await apiKeysApi.getApiKeys();
      if (response.success) {
        setApiKeys(response.data);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  const handleCreate = () => {
    setEditing(null);
    setOpenForm(true);
  };

  const handleEdit = (row: ApiKey) => {
    // adapt to form model shape (personnelId is string)
    const adapted: ApiKeyFormModel = {
      _id: row._id,
      name: row.name,
      personnelId: row.personnelId?._id || row.userId?._id || '', // Fallback for legacy keys
      expiresAt: row.expiresAt,
    };
    setEditing(adapted);
    setOpenForm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.data) return;

    try {
      const response = await apiKeysApi.deleteApiKey(deleteDialog.data._id);
      if (response.success) {
        setApiKeys((prev) => prev.filter((k) => k._id !== deleteDialog.data!._id));
        toast.success('API key deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast.error('Failed to delete API key');
    }

    setDeleteDialog({ open: false, data: null });
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editing) {
        const response = await apiKeysApi.updateApiKey(editing._id, data);
        if (response.success) {
          setApiKeys((prev) => prev.map((k) => (k._id === editing._id ? response.data : k)));
          toast.success('API key updated successfully');
        }
      } else {
        const response = await apiKeysApi.createApiKey(data);
        if (response.success) {
          setApiKeys((prev) => [response.data, ...prev]);
          toast.success('API key created successfully');

          // Show API key dialog
          setShowKeyDialog({ open: true, key: response.apiKey });
        }
      }
      setOpenForm(false);
      setEditing(null);
    } catch (error) {
      console.error('Failed to save API key:', error);
      toast.error(`Failed to ${editing ? 'update' : 'create'} API key`);
    }
  };

  const isExpired = (expiresAt?: string) => (expiresAt ? new Date(expiresAt) < new Date() : false);
  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    return new Date(expiresAt) <= soon;
  };

  const handleTestApiKey = (apiKey: ApiKey) => {
    setTestDialog({ open: true, apiKey });
  };

  return (
    <Container maxWidth={false}>
      <Card>
        <CardHeader
          title="API Keys"
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              onClick={handleCreate}
            >
              Create API Key
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
                    <TableCell>{truncateText('Personnel')}</TableCell>
                    <TableCell>{truncateText('Permissions')}</TableCell>
                    <TableCell>{truncateText('Last Used')}</TableCell>
                    <TableCell>{truncateText('Usage')}</TableCell>
                    <TableCell>{truncateText('Expires')}</TableCell>
                    <TableCell align="right">{truncateText('Actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apiKeys.map((k) => (
                    <TableRow key={k._id}>
                      <TableCell>
                        <Typography variant="subtitle2">{truncateText(k.name)}</Typography>
                      </TableCell>
                      <TableCell>
                        {k.personnelId ? (
                          <>
                            <Typography variant="body2">
                              {truncateText(k.personnelId.user.name)}{' '}
                              {k.personnelId.role && `(${truncateText(k.personnelId.role.name)})`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {truncateText(k.personnelId.user.email)} •{' '}
                              {truncateText(k.personnelId.employeeId)}
                            </Typography>
                          </>
                        ) : k.userId ? (
                          <>
                            <Typography variant="body2">
                              {truncateText(k.userId.firstName)} {truncateText(k.userId.lastName)}{' '}
                              (Legacy)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {truncateText(k.userId.email)}
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Unknown User
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {k.permissions.map((p) => (
                            <Chip
                              key={p}
                              label={truncateText(p === '*' ? 'All' : p)}
                              size="small"
                              variant="outlined"
                              color={p === '*' ? 'primary' : 'default'}
                            />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {k.usageCount?.toLocaleString?.() ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {k.expiresAt ? (
                          <Chip
                            label={new Date(k.expiresAt).toLocaleDateString()}
                            size="small"
                            color={
                              isExpired(k.expiresAt)
                                ? 'error'
                                : isExpiringSoon(k.expiresAt)
                                  ? 'warning'
                                  : 'default'
                            }
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Never
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton
                            size="small"
                            onClick={() => handleTestApiKey(k)}
                            title="Test API Key"
                          >
                            <Iconify icon="solar:play-bold" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleEdit(k)} title="Edit">
                            <Iconify icon="solar:pen-bold" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, data: k })}
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

      <ApiKeyFormDialog
        open={openForm}
        apiKey={editing}
        onClose={() => {
          setOpenForm(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, data: null })}
        title="Delete API Key"
        content={`Are you sure you want to delete "${deleteDialog.data?.name}"?`}
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />

      <ConfirmDialog
        open={showKeyDialog.open}
        onClose={() => setShowKeyDialog({ open: false, key: '' })}
        title="API Key Created"
        content={
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This is the only time you&apos;ll see this API key. Copy and store it securely.
            </Alert>
            <TextField
              value={showKeyDialog.key}
              fullWidth
              multiline
              rows={3}
              InputProps={{ readOnly: true }}
            />
          </>
        }
        action={
          <Button
            variant="contained"
            onClick={() => {
              navigator.clipboard.writeText(showKeyDialog.key);
              setShowKeyDialog({ open: false, key: '' });
            }}
          >
            Copy
          </Button>
        }
      />

      <ApiKeyTestDialog
        open={testDialog.open}
        apiKey={testDialog.apiKey}
        onClose={() => setTestDialog({ open: false, apiKey: null })}
      />
    </Container>
  );
}
