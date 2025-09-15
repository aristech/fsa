import useSWR, { mutate } from 'swr';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useRealtimeEvent } from 'src/hooks/use-realtime';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface CheckInSession {
  _id: string;
  taskId: string;
  personnelId: string;
  checkInTime: string;
  notes?: string;
  isActive: boolean;
}

interface Props {
  taskId: string;
  workOrderId?: string;
  onTimeEntryCreated?: () => void;
}

// Browser session storage key for recovery
const SESSION_STORAGE_KEY = 'checkin_sessions';

// Helper functions for offline persistence
const getStoredSessions = (): CheckInSession[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const storeSession = (session: CheckInSession) => {
  if (typeof window === 'undefined') return;
  try {
    const sessions = getStoredSessions();
    const filtered = sessions.filter(s => s.taskId !== session.taskId);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([...filtered, session]));
  } catch (error) {
    console.warn('Failed to store session locally:', error);
  }
};

const removeStoredSession = (taskId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const sessions = getStoredSessions();
    const filtered = sessions.filter(s => s.taskId !== taskId);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.warn('Failed to remove stored session:', error);
  }
};

const generateClientSessionId = (): string => `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function KanbanCheckInOut({ taskId, workOrderId, onTimeEntryCreated }: Props) {
  const theme = useTheme();
  const [notes, setNotes] = useState('');
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);
  const [storedSessions, setStoredSessions] = useState<CheckInSession[]>([]);

  // Fetch active check-in session for current user on this task
  const { data: sessionData, mutate: mutateSession } = useSWR<{
    success: boolean;
    data: CheckInSession | null;
  }>(`${endpoints.fsa.timeEntries.list}?taskId=${taskId}&active=true`, async (url: string) => {
    try {
      const response = await axiosInstance.get(url);
      return response.data;
    } catch {
      return { success: true, data: null };
    }
  });

  const activeSession = sessionData?.data;
  const isCheckedIn = !!activeSession?.isActive;

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for stored sessions on mount and when coming back online
  useEffect(() => {
    if (isOnline) {
      const stored = getStoredSessions();
      const taskSession = stored.find(s => s.taskId === taskId);

      if (taskSession && !activeSession) {
        // Found a stored session but no active session from server
        setStoredSessions([taskSession]);
        setRecoveryDialogOpen(true);
      }
    }
  }, [isOnline, activeSession, taskId]);

  // Heartbeat to keep session alive (every 5 minutes)
  useEffect(() => {
    if (!isCheckedIn || !activeSession?._id || !isOnline) return undefined;

    const sendHeartbeat = async () => {
      try {
        await axiosInstance.post(endpoints.fsa.timeEntries.heartbeat, {
          sessionId: activeSession._id,
        });
      } catch (error) {
        console.warn('Failed to send heartbeat:', error);
      }
    };

    const interval = setInterval(sendHeartbeat, 5 * 60 * 1000); // 5 minutes

    // Send initial heartbeat
    sendHeartbeat();

    return () => {
      clearInterval(interval);
    };
  }, [isCheckedIn, activeSession?._id, isOnline]);

  // Listen for real-time check-in/check-out events
  useRealtimeEvent(
    'notification',
    useCallback((data: any) => {
      if (data.data?.taskId === taskId) {
        if (data.type === 'checkin' || data.type === 'checkout') {
          // Refresh session data when someone else checks in/out
          mutateSession();

          if (data.type === 'checkin') {
            toast.info('Someone checked in to this task');
          } else if (data.type === 'checkout') {
            toast.info('Someone checked out and logged time');
            // Refresh time entries if callback provided
            if (onTimeEntryCreated) {
              onTimeEntryCreated();
            }
          }
        }
      }
    }, [taskId, mutateSession, onTimeEntryCreated]),
    [taskId]
  );

  // Calculate elapsed time if checked in
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    if (!isCheckedIn || !activeSession?.checkInTime) {
      setElapsedTime('00:00:00');
      return undefined;
    }

    const updateElapsedTime = () => {
      const checkInTime = new Date(activeSession.checkInTime);
      const now = new Date();
      const diff = now.getTime() - checkInTime.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isCheckedIn, activeSession?.checkInTime]);

  const handleCheckIn = useCallback(async () => {
    if (isCheckedIn) {
      return;
    }

    setCheckingIn(true);
    const clientSessionId = generateClientSessionId();

    try {
      const payload = {
        taskId,
        action: 'checkin',
        notes: '',
        clientSessionId,
      };

      if (isOnline) {
        // Online: Send to server
        const response = await axiosInstance.post(endpoints.fsa.timeEntries.checkin, payload);
        const session = response.data.data;

        // Store locally for recovery
        storeSession(session);

        // Refresh session data
        mutateSession();

        toast.success('Checked in successfully');
      } else {
        // Offline: Store locally only
        const localSession: CheckInSession = {
          _id: clientSessionId,
          taskId,
          personnelId: 'offline', // Will be resolved when online
          checkInTime: new Date().toISOString(),
          notes: '',
          isActive: true,
        };

        storeSession(localSession);
        toast.success('Checked in offline - will sync when connection restored');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to check in';
      toast.error(message);
    } finally {
      setCheckingIn(false);
    }
  }, [taskId, isCheckedIn, isOnline, mutateSession]);

  const handleCheckOut = useCallback(async () => {
    if (!isCheckedIn || !activeSession) {
      return;
    }

    setCheckingOut(true);
    try {
      const checkInTime = new Date(activeSession.checkInTime);
      const checkOutTime = new Date();
      const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      const payload = {
        taskId,
        workOrderId,
        action: 'checkout',
        sessionId: activeSession._id,
        date: checkInTime.toISOString().split('T')[0], // Use check-in date
        hours: Math.round(hours * 100) / 100, // Round to 2 decimal places
        notes: notes || activeSession.notes || '',
      };

      await axiosInstance.post(endpoints.fsa.timeEntries.checkout, payload);

      // Refresh session data and time entries
      mutateSession();
      if (onTimeEntryCreated) {
        onTimeEntryCreated();
      }

      // Refresh time entries list
      mutate([endpoints.fsa.timeEntries.list, { params: { taskId, limit: 100 } }]);

      setCheckOutDialogOpen(false);
      setNotes('');
      toast.success(`Checked out successfully (${hours.toFixed(2)}h logged)`);

      // Remove from local storage
      removeStoredSession(taskId);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to check out';
      toast.error(message);
    } finally {
      setCheckingOut(false);
    }
  }, [taskId, workOrderId, isCheckedIn, activeSession, notes, mutateSession, onTimeEntryCreated]);

  const openCheckOutDialog = () => {
    setNotes(activeSession?.notes || '');
    setCheckOutDialogOpen(true);
  };

  // Handle session recovery
  const handleRecoverSession = useCallback(async (storedSession: CheckInSession) => {
    try {
      // Try to sync the offline session with server
      const payload = {
        taskId,
        action: 'checkin',
        notes: storedSession.notes || '',
        clientSessionId: storedSession._id,
      };

      const response = await axiosInstance.post(endpoints.fsa.timeEntries.checkin, payload);
      const session = response.data.data;

      // Update local storage with server session
      storeSession(session);

      // Refresh session data
      mutateSession();

      setRecoveryDialogOpen(false);
      setStoredSessions([]);

      toast.success('Session recovered successfully');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to recover session';
      toast.error(message);
    }
  }, [taskId, mutateSession]);

  // Handle emergency checkout for stored session
  const handleEmergencyCheckout = useCallback(async (storedSession: CheckInSession) => {
    try {
      const checkInTime = new Date(storedSession.checkInTime);
      const checkOutTime = new Date();
      const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      // Use emergency checkout endpoint
      await axiosInstance.post(endpoints.fsa.timeEntries.emergencyCheckout, {
        sessionId: storedSession._id,
        notes: `Emergency checkout - offline session recovery (${hours.toFixed(2)}h)`,
      });

      // Remove from local storage
      removeStoredSession(taskId);

      setRecoveryDialogOpen(false);
      setStoredSessions([]);

      // Refresh data
      mutateSession();
      if (onTimeEntryCreated) {
        onTimeEntryCreated();
      }

      toast.success(`Emergency checkout completed (${hours.toFixed(2)}h logged)`);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to complete emergency checkout';
      toast.error(message);
    }
  }, [taskId, mutateSession, onTimeEntryCreated]);

  // Discard stored session
  const handleDiscardSession = useCallback((storedSession: CheckInSession) => {
    removeStoredSession(taskId);
    setRecoveryDialogOpen(false);
    setStoredSessions([]);
    toast.info('Stored session discarded');
  }, [taskId]);

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 2,
          borderColor: isCheckedIn ? 'success.main' : 'divider',
          backgroundColor: isCheckedIn
            ? alpha(theme.palette.success.main, 0.08)
            : 'background.paper',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: isCheckedIn ? 'success.main' : 'grey.400',
                animation: isCheckedIn ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 },
                },
              }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Time Tracking
            </Typography>
          
          </Box>

          <Stack direction="row" spacing={1}>
            {!isCheckedIn ? (
              <Button
                variant="contained"
                color="success"
                startIcon={<Iconify icon="eva:play-circle-fill" />}
                onClick={handleCheckIn}
                disabled={checkingIn}
                sx={{
                  minWidth: 120,
                  fontWeight: 600,
                }}
              >
                {checkingIn ? 'Checking In...' : 'Check In'}
              </Button>
            ) : (
              <>
                <Tooltip title="View details">
                  <IconButton
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.success.main, 0.2),
                      },
                    }}
                  >
                    <Iconify icon="eva:info-fill" />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Iconify icon="eva:stop-circle-fill" />}
                  onClick={openCheckOutDialog}
                  disabled={checkingOut}
                  sx={{
                    minWidth: 120,
                    fontWeight: 600,
                  }}
                >
                  Check Out
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        {isCheckedIn && activeSession && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={3}>
              <Typography variant="body2" color="text.secondary">
                <strong>Started:</strong> {new Date(activeSession.checkInTime).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Duration:</strong> {elapsedTime}
              </Typography>
            </Stack>
            {activeSession.notes && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <strong>Notes:</strong> {activeSession.notes}
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {/* Check Out Dialog */}
      <Dialog
        open={checkOutDialogOpen}
        onClose={() => setCheckOutDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="eva:clock-fill" />
            <span>Check Out - Time Entry</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Session Summary
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Duration:</strong> {elapsedTime}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Started:</strong> {activeSession && new Date(activeSession.checkInTime).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Ending:</strong> {new Date().toLocaleString()}
                  </Typography>
                </Stack>
              </Paper>
            </Box>

            <TextField
              label="Session Notes (Optional)"
              multiline
              rows={3}
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about your work during this session..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckOutDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCheckOut}
            disabled={checkingOut}
            startIcon={<Iconify icon="eva:stop-circle-fill" />}
          >
            {checkingOut ? 'Checking Out...' : 'Check Out & Log Time'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Session Recovery Dialog */}
      <Dialog
        open={recoveryDialogOpen}
        onClose={() => setRecoveryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="eva:alert-triangle-fill" />
            <span>Session Recovery</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body1">
              We found a check-in session from when you were offline. What would you like to do?
            </Typography>

            {storedSessions.map((session) => (
              <Paper key={session._id} variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle2">
                    Offline Check-in Session
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>Started:</strong> {new Date(session.checkInTime).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Duration:</strong>{' '}
                      {Math.floor((Date.now() - new Date(session.checkInTime).getTime()) / (1000 * 60 * 60))}h{' '}
                      {Math.floor(((Date.now() - new Date(session.checkInTime).getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m
                    </Typography>
                    {session.notes && (
                      <Typography variant="body2">
                        <strong>Notes:</strong> {session.notes}
                      </Typography>
                    )}
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleRecoverSession(session)}
                      startIcon={<Iconify icon="eva:sync-fill" />}
                    >
                      Recover & Continue
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={() => handleEmergencyCheckout(session)}
                      startIcon={<Iconify icon="eva:stop-circle-fill" />}
                    >
                      Checkout Now
                    </Button>
                    <Button
                      variant="text"
                      color="error"
                      onClick={() => handleDiscardSession(session)}
                      startIcon={<Iconify icon="eva:trash-2-fill" />}
                    >
                      Discard
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Offline Indicator */}
      {!isOnline && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 9999,
            p: 1,
            borderRadius: 1,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Iconify icon="eva:wifi-off-fill" />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Offline Mode
          </Typography>
        </Box>
      )}
    </>
  );
}