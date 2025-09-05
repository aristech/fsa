'use client';

import {
  Dialog,
  Button,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

// ----------------------------------------------------------------------

interface PersonnelCreateViewProps {
  open: boolean;
  onClose: () => void;
}

// ----------------------------------------------------------------------

export function PersonnelCreateView({ open, onClose }: PersonnelCreateViewProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Personnel</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Personnel creation form will be implemented here.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained">Create</Button>
      </DialogActions>
    </Dialog>
  );
}
