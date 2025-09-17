'use client';

import { useState, useEffect } from 'react';

import {
  Box,
  Card,
  Chip,
  Alert,
  Stack,
  Avatar,
  Button,
  Dialog,
  TextField,
  IconButton,
  Typography,
  CardContent,
  DialogTitle,
  DialogActions,
  DialogContent,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import axiosInstance from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';
import { signOut } from 'src/auth/context/jwt/action';

// ----------------------------------------------------------------------

interface PersonnelData {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  role?: {
    _id: string;
    name: string;
    color: string;
  };
  environmentAccess: string;
  skills: string[];
  certifications: string[];
  hourlyRate: number;
  notes?: string;
  isActive: boolean;
}

export default function FieldProfilePage() {
  const router = useRouter();
  const { user: _user, authenticated, loading: authLoading } = useAuthContext();

  const [personnel, setPersonnel] = useState<PersonnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [editData, setEditData] = useState({
    phone: '',
    notes: '',
  });

  // Fetch personnel data (token-based; no need for user id)
  useEffect(() => {
    let active = true;
    const fetchPersonnelData = async () => {
      try {
        if (!authenticated) {
          if (active) setLoading(false);
          return;
        }
        setLoading(true);
        const response = await axiosInstance.get('/api/v1/personnel/me');
        if (!active) return;
        if (response.data.success) {
          const personnelData = response.data.data;
          setPersonnel(personnelData);
          setEditData({
            phone: personnelData.user.phone || '',
            notes: personnelData.notes || '',
          });
        } else {
          setPersonnel(null);
        }
      } catch (error: any) {
        console.error('Error fetching personnel data:', error);
        if (error.response?.status === 404) {
          // No personnel record yet; show setup UI
          setPersonnel(null);
        } else {
          toast.error('Failed to load profile data');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchPersonnelData();
    return () => {
      active = false;
    };
  }, [authenticated]);

  const handleSaveProfile = async () => {
    if (!personnel) return;

    try {
      await axiosInstance.put('/api/v1/personnel/me', {
        phone: editData.phone,
        notes: editData.notes,
      });

      // Update local state
      setPersonnel(prev => prev ? {
        ...prev,
        user: { ...prev.user, phone: editData.phone },
        notes: editData.notes,
      } : null);

      setEditMode(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
    setLogoutDialogOpen(false);
  };

  const handleSetupProfile = async () => {
    try {
      setSettingUp(true);
      const response = await axiosInstance.post('/api/v1/personnel/setup');

      if (response.data.success) {
        setPersonnel(response.data.data);
        setEditData({
          phone: response.data.data.user.phone || '',
          notes: response.data.data.notes || '',
        });
        toast.success('Profile set up successfully! You can now use field operations.');
      }
    } catch (error: any) {
      console.error('Error setting up profile:', error);
      if (error.response?.status === 400) {
        toast.error('Personnel record already exists');
      } else {
        toast.error('Failed to set up profile. Please try again.');
      }
    } finally {
      setSettingUp(false);
    }
  };

  const getEnvironmentLabel = (access: string) => {
    switch (access) {
      case 'field':
        return 'Field Only';
      case 'dashboard':
        return 'Dashboard Only';
      case 'all':
        return 'All Environments';
      default:
        return 'Unknown';
    }
  };

  const getEnvironmentColor = (access: string) => {
    switch (access) {
      case 'field':
        return 'success';
      case 'dashboard':
        return 'info';
      case 'all':
        return 'primary';
      default:
        return 'default';
    }
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Loading profile...</Typography>
      </Box>
    );
  }

  if (!personnel) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          <Typography variant="h6" gutterBottom>
            Welcome to Field Operations!
          </Typography>
          <Typography variant="body2" gutterBottom>
            Your account needs a personnel profile to access field operations.
            We&apos;ll set this up automatically with default settings that you can customize later.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              onClick={handleSetupProfile}
              variant="contained"
              disabled={settingUp}
              startIcon={settingUp ? undefined : <Iconify icon="solar:user-plus-bold" />}
            >
              {settingUp ? 'Setting up...' : 'Set Up My Profile'}
            </Button>
            <Button
              onClick={() => setLogoutDialogOpen(true)}
              variant="outlined"
              color="error"
              size="small"
            >
              Logout
            </Button>
          </Box>
        </Alert>

        {/* Include logout dialog even when no personnel record */}
        <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
          <DialogTitle>Confirm Logout</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to logout?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLogoutDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLogout} color="error" variant="contained">
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 'md', mx: 'auto' }}>
      <Stack spacing={2}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              mx: 'auto',
              mb: 2,
              fontSize: 32,
              bgcolor: 'primary.main',
            }}
          >
            {(() => {
              const name = personnel.user.name || 'Unknown User';
              const nameParts = name.split(' ');
              if (nameParts.length >= 2) {
                return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
              }
              return name.charAt(0).toUpperCase();
            })()}
          </Avatar>
          <Typography variant="h5" gutterBottom>
            {personnel.user.name || 'Unknown User'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {personnel.role?.name || 'No Role Assigned'}
          </Typography>
        </Box>

        {/* Basic Info Card */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Basic Information</Typography>
              <IconButton
                onClick={() => setEditMode(!editMode)}
                size="small"
                color={editMode ? 'primary' : 'default'}
              >
                <Iconify icon={editMode ? 'solar:check-bold' : 'solar:pen-bold'} />
              </IconButton>
            </Box>

            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography>{personnel.user.email}</Typography>
              </Box>

              {editMode ? (
                <TextField
                  label="Phone"
                  value={editData.phone}
                  onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                  fullWidth
                  size="small"
                />
              ) : (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography>{personnel.user.phone || 'Not provided'}</Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Role
                </Typography>
                <Chip
                  label={personnel.role?.name || 'No Role Assigned'}
                  color="primary"
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Environment Access
                </Typography>
                <Chip
                  label={getEnvironmentLabel(personnel.environmentAccess)}
                  color={getEnvironmentColor(personnel.environmentAccess) as any}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={personnel.isActive ? 'Active' : 'Inactive'}
                  color={personnel.isActive ? 'success' : 'error'}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Stack>

            {editMode && (
              <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button onClick={() => setEditMode(false)} variant="outlined" size="small">
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile} variant="contained" size="small">
                  Save
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Skills & Certifications */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Skills & Certifications
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Skills
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {personnel.skills.length > 0 ? (
                  personnel.skills.map((skill, index) => (
                    <Chip key={index} label={skill} size="small" variant="outlined" />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No skills listed
                  </Typography>
                )}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Certifications
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {personnel.certifications.length > 0 ? (
                  personnel.certifications.map((cert, index) => (
                    <Chip key={index} label={cert} size="small" variant="outlined" color="primary" />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No certifications listed
                  </Typography>
                )}
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Notes
            </Typography>

            {editMode ? (
              <TextField
                value={editData.notes}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={3}
                fullWidth
                placeholder="Add personal notes..."
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {personnel.notes || 'No notes available'}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Account Actions
            </Typography>
            <Stack spacing={2}>
              <Button
                onClick={() => setLogoutDialogOpen(true)}
                variant="outlined"
                color="error"
                startIcon={<Iconify icon="solar:logout-2-bold" />}
                fullWidth
              >
                Logout
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
        <DialogTitle>Confirm Logout</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to logout?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleLogout} color="error" variant="contained">
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}