'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { styled } from '@mui/material/styles';
import {
  Box,
  Alert,
  alpha,
  Dialog,
  Button,
  useTheme,
  Backdrop,
  keyframes,
  AlertTitle,
  Typography,
  IconButton,
  DialogContent,
  DialogActions,
  LinearProgress,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '../iconify';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition =
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type ToastProps = {
  id?: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  position?: ToastPosition;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
};

// Toast animations
const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

// Styled Toast Container
const ToastContainer = styled(Box, {
  shouldForwardProp: (prop) => !['toastPosition', 'isExiting'].includes(prop as string),
})<{
  toastPosition: ToastPosition;
  isExiting: boolean;
}>(({ theme, toastPosition, isExiting }) => {
  const positionStyles = {
    top: { top: theme.spacing(2), left: '50%', transform: 'translateX(-50%)' },
    bottom: { bottom: theme.spacing(2), left: '50%', transform: 'translateX(-50%)' },
    'top-left': { top: theme.spacing(2), left: theme.spacing(2) },
    'top-right': { top: theme.spacing(2), right: theme.spacing(2) },
    'bottom-left': { bottom: theme.spacing(2), left: theme.spacing(2) },
    'bottom-right': { bottom: theme.spacing(2), right: theme.spacing(2) },
  };

  return {
    position: 'fixed',
    zIndex: theme.zIndex.snackbar,
    maxWidth: '400px',
    width: 'calc(100% - 32px)',
    ...positionStyles[toastPosition as keyof typeof positionStyles],
    animation: isExiting
      ? `${slideOut} 0.3s ease-in-out forwards`
      : `${slideIn} 0.3s ease-in-out forwards`,
  };
});

// Styled Toast
const StyledToast = styled(Alert)(({ theme }) => ({
  width: '100%',
  borderRadius: '12px',
  boxShadow: theme.shadows[8],
  '& .MuiAlert-message': {
    width: '100%',
  },
}));

// Individual Toast Component
function Toast({ toast, onClose }: { toast: ToastProps; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast.duration, handleClose]);

  // const getIcon = () => {
  //   switch (toast.type) {
  //     case 'success':
  //       return 'eva:checkmark-circle-fill';
  //     case 'error':
  //       return 'eva:alert-circle-fill';
  //     case 'warning':
  //       return 'eva:alert-triangle-fill';
  //     case 'info':
  //       return 'eva:info-fill';
  //     default:
  //       return 'eva:info-fill';
  //   }
  // };

  return (
    <ToastContainer toastPosition={toast.position || 'top'} isExiting={isExiting}>
      <StyledToast
        severity={toast.type}
        onClose={handleClose}
        action={
          toast.action ? (
            <Button
              color="inherit"
              size="small"
              onClick={toast.action.onClick}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              {toast.action.label}
            </Button>
          ) : undefined
        }
      >
        <AlertTitle sx={{ fontSize: '14px', fontWeight: 600 }}>{toast.title}</AlertTitle>
        {toast.message && (
          <Typography variant="body2" sx={{ fontSize: '13px' }}>
            {toast.message}
          </Typography>
        )}
      </StyledToast>
    </ToastContainer>
  );
}

// Toast Manager Hook
export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = useCallback((toast: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    return id;
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const hideAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    hideToast,
    hideAllToasts,
  };
}

// Toast Provider Component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, hideToast } = useToast();

  return (
    <>
      {children}
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => toast.id && hideToast(toast.id)} />
      ))}
    </>
  );
}

// Mobile Modal Component
export type MobileModalProps = {
  open: boolean;
  onCloseAction: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  fullScreen?: boolean;
  showCloseButton?: boolean;
  backdropClose?: boolean;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
};

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    margin: theme.spacing(2),
    maxHeight: 'calc(100% - 32px)',
  },
  '& .MuiDialog-paperFullScreen': {
    borderRadius: 0,
    margin: 0,
    maxHeight: '100%',
  },
}));

const DialogHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
}));

const DialogContentStyled = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(3),
  '&.MuiDialogContent-dividers': {
    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  },
}));

const DialogActionsStyled = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  gap: theme.spacing(1),
}));

export function MobileModal({
  open,
  onCloseAction,
  title,
  children,
  actions,
  fullScreen = false,
  showCloseButton = true,
  backdropClose = true,
  loading = false,
  error = false,
  errorMessage = 'Something went wrong',
  size = 'medium',
}: MobileModalProps) {
  const theme = useTheme();

  const getSizeProps = () => {
    switch (size) {
      case 'small':
        return { maxWidth: 'xs', fullWidth: true };
      case 'medium':
        return { maxWidth: 'sm', fullWidth: true };
      case 'large':
        return { maxWidth: 'md', fullWidth: true };
      case 'full':
        return { fullWidth: true };
      default:
        return { maxWidth: 'sm', fullWidth: true };
    }
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (backdropClose && event.target === event.currentTarget) {
      onCloseAction();
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={onCloseAction}
      fullScreen={fullScreen}
      {...(getSizeProps() as any)}
      BackdropProps={{
        onClick: handleBackdropClick,
        sx: {
          backgroundColor: alpha(theme.palette.common.black, 0.5),
          backdropFilter: 'blur(4px)',
        },
      }}
    >
      {/* Header */}
      {(title || showCloseButton) && (
        <DialogHeader>
          {title && (
            <Typography variant="h6" component="h2">
              {title}
            </Typography>
          )}
          {showCloseButton && (
            <IconButton onClick={onCloseAction} size="small" sx={{ ml: 'auto' }}>
              <Iconify icon="eva:close-fill" width={20} />
            </IconButton>
          )}
        </DialogHeader>
      )}

      {/* Content */}
      <DialogContentStyled dividers={!!actions}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {errorMessage}
          </Alert>
        )}

        {!loading && !error && children}
      </DialogContentStyled>

      {/* Actions */}
      {actions && <DialogActionsStyled>{actions}</DialogActionsStyled>}
    </StyledDialog>
  );
}

// Loading Overlay Component
export function MobileLoadingOverlay({
  open,
  message = 'Loading...',
  progress,
  showProgress = false,
}: {
  open: boolean;
  message?: string;
  progress?: number;
  showProgress?: boolean;
}) {
  const theme = useTheme();

  if (!open) return null;

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: theme.zIndex.modal + 1,
        backgroundColor: alpha(theme.palette.common.black, 0.7),
        backdropFilter: 'blur(4px)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          backgroundColor: theme.palette.background.paper,
          borderRadius: '16px',
          padding: theme.spacing(4),
          minWidth: '200px',
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" color="text.primary">
          {message}
        </Typography>
        {showProgress && progress !== undefined && (
          <Box sx={{ width: '100%', mt: 1 }}>
            <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: '4px' }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {Math.round(progress)}%
            </Typography>
          </Box>
        )}
      </Box>
    </Backdrop>
  );
}

// Success Animation Component
export function MobileSuccessAnimation({
  open,
  onCompleteAction,
  message = 'Success!',
}: {
  open: boolean;
  onCompleteAction?: () => void;
  message?: string;
}) {
  const theme = useTheme();

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onCompleteAction?.();
      }, 2000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, onCompleteAction]);

  if (!open) return null;

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: theme.zIndex.modal + 1,
        backgroundColor: alpha(theme.palette.common.black, 0.7),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          backgroundColor: theme.palette.background.paper,
          borderRadius: '16px',
          padding: theme.spacing(4),
          minWidth: '200px',
        }}
      >
        <Box
          sx={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: theme.palette.success.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 0.6s ease-in-out',
            '@keyframes pulse': {
              '0%': { transform: 'scale(0.8)', opacity: 0.8 },
              '50%': { transform: 'scale(1.1)', opacity: 1 },
              '100%': { transform: 'scale(1)', opacity: 1 },
            },
          }}
        >
          <Iconify icon="eva:checkmark-fill" width={32} sx={{ color: 'white' }} />
        </Box>
        <Typography variant="h6" color="text.primary">
          {message}
        </Typography>
      </Box>
    </Backdrop>
  );
}
