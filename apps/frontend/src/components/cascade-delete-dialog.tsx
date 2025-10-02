'use client';

import { useState } from 'react';

import {
  Box,
  List,
  Alert,
  Button,
  Dialog,
  Divider,
  Checkbox,
  ListItem,
  Typography,
  DialogTitle,
  ListItemIcon,
  ListItemText,
  DialogContent,
  DialogActions,
  FormControlLabel,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export interface CascadeDeleteInfo {
  tasksCount: number;
  filesCount: number;
  commentsCount: number;
  assignmentsCount: number;
  subtasksCount?: number;
  workOrdersCount?: number; // For client deletions
}

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (cascadeDelete: boolean) => void;
  title: string;
  entityName: string;
  entityType: 'work-order' | 'client';
  info: CascadeDeleteInfo;
  loading?: boolean;
};

export function CascadeDeleteDialog({
  open,
  onClose,
  onConfirm,
  title,
  entityName,
  entityType,
  info,
  loading = false,
}: Props) {
  const [cascadeDelete, setCascadeDelete] = useState(false);
  const [understood, setUnderstood] = useState(false);

  const handleClose = () => {
    setCascadeDelete(false);
    setUnderstood(false);
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(cascadeDelete);
    handleClose();
  };

  const hasRelatedData =
    info.tasksCount > 0 ||
    info.filesCount > 0 ||
    info.commentsCount > 0 ||
    info.assignmentsCount > 0 ||
    (info.workOrdersCount && info.workOrdersCount > 0);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Iconify icon="solar:trash-bin-trash-bold" sx={{ color: 'error.main' }} />
          {title}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            ⚠️ Critical Action: Deleting &ldquo;{entityName}&rdquo;
          </Typography>
          <Typography variant="body2">
            This action is permanent and cannot be undone. Please review the information below
            carefully.
          </Typography>
        </Alert>

        {hasRelatedData ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              📊 Related Data Summary
            </Typography>

            <List dense sx={{ bgcolor: 'background.neutral', borderRadius: 1, mb: 2 }}>
              {entityType === 'client' && info.workOrdersCount! > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <Iconify icon="solar:clipboard-list-bold" sx={{ color: 'warning.main' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${info.workOrdersCount} Work Orders`}
                    secondary="All work orders belonging to this client"
                  />
                </ListItem>
              )}

              {info.tasksCount > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <Iconify icon="solar:checklist-bold" sx={{ color: 'info.main' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${info.tasksCount} Tasks`}
                    secondary={
                      entityType === 'work-order'
                        ? 'Tasks assigned to this work order'
                        : "All tasks related to this client's work orders"
                    }
                  />
                </ListItem>
              )}

              {info.subtasksCount! > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <Iconify icon="solar:list-check-bold" sx={{ color: 'info.main' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${info.subtasksCount} Subtasks`}
                    secondary="All subtasks within the related tasks"
                  />
                </ListItem>
              )}

              {info.filesCount > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <Iconify icon="solar:folder-with-files-bold" sx={{ color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${info.filesCount} Files`}
                    secondary="All uploaded files and attachments"
                  />
                </ListItem>
              )}

              {info.commentsCount > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <Iconify icon="solar:chat-round-dots-bold" sx={{ color: 'secondary.main' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${info.commentsCount} Comments`}
                    secondary="All comments and notes"
                  />
                </ListItem>
              )}

              {info.assignmentsCount > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <Iconify
                      icon="solar:users-group-two-rounded-bold"
                      sx={{ color: 'success.main' }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${info.assignmentsCount} Assignments`}
                    secondary="All personnel assignments"
                  />
                </ListItem>
              )}
            </List>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 1, mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={cascadeDelete}
                    onChange={(e) => setCascadeDelete(e.target.checked)}
                    color="error"
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle2" color="error.main">
                      🗑️ Delete ALL related data
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {entityType === 'work-order'
                        ? 'This will permanently delete all tasks, files, comments, and assignments related to this work order.'
                        : 'This will permanently delete all work orders, tasks, files, comments, and assignments related to this client.'}
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {!cascadeDelete && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  If you don&apos;t select cascade delete, the {entityType} will be removed but
                  related data will be preserved:
                </Typography>
                <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                  {entityType === 'work-order' && (
                    <li>Tasks will be unlinked from this work order but kept</li>
                  )}
                  {entityType === 'client' && (
                    <>
                      <li>Work orders will be unlinked from this client but kept</li>
                      <li>Tasks will be unlinked from this client but kept</li>
                    </>
                  )}
                  <li>Files and attachments will be preserved</li>
                  <li>Comments and assignments will be kept</li>
                </Box>
              </Alert>
            )}
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              This {entityType} has no related data. Only the {entityType} itself will be deleted.
            </Typography>
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                color="warning"
              />
            }
            label={
              <Typography variant="body2" color="warning.darker">
                ✅ I understand this action is permanent and cannot be undone
              </Typography>
            }
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} size="large">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!understood || loading}
          onClick={handleConfirm}
          size="large"
          startIcon={loading ? undefined : <Iconify icon="solar:trash-bin-trash-bold" />}
        >
          {loading
            ? 'Deleting...'
            : `Delete ${cascadeDelete ? 'All' : entityType === 'work-order' ? 'Work Order' : 'Client'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
