'use client';

import React, { useRef, useState } from 'react';

import { styled } from '@mui/material/styles';
import {
  Box,
  alpha,
  Drawer,
  useTheme,
  keyframes,
  IconButton,
  Typography,
  SwipeableDrawer,
} from '@mui/material';

import { Iconify } from '../iconify';

export type MobileDrawerAnchor = 'bottom' | 'left' | 'right' | 'top';
export type MobileDrawerVariant = 'temporary' | 'persistent' | 'permanent' | 'swipeable';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
  anchor?: MobileDrawerAnchor;
  variant?: MobileDrawerVariant;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  showDragIndicator?: boolean;
  showHeader?: boolean;
  fullHeight?: boolean;
  maxHeight?: string | number;
  enableSwipeToClose?: boolean;
  enableBackdropClose?: boolean;
  backdropColor?: string;
  elevation?: number;
  borderRadius?: string;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
}

// Animation keyframes
const slideUp = keyframes`
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

// Styled Drawer with mobile optimizations
const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) =>
    !['fullHeight', 'maxHeight', 'borderRadius', 'enableSwipeToClose'].includes(prop as string),
})<{
  fullHeight: boolean;
  maxHeight: string | number;
  borderRadius: string;
  enableSwipeToClose: boolean;
}>(({ theme, fullHeight, maxHeight, borderRadius, enableSwipeToClose }) => ({
  '& .MuiDrawer-paper': {
    width: '100%',
    maxWidth: '100vw',
    height: fullHeight ? '100vh' : 'auto',
    maxHeight: fullHeight ? '100vh' : maxHeight,
    borderRadius,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[16],
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,

    // Handle iPhone safe area
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',

    // Animation
    animation: `${slideUp} 0.3s cubic-bezier(0.4, 0, 0.2, 1)`,

    // Swipeable behavior
    ...(enableSwipeToClose && {
      touchAction: 'pan-y',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  },

  // Backdrop
  '& .MuiBackdrop-root': {
    backgroundColor: alpha(theme.palette.common.black, 0.5),
    backdropFilter: 'blur(4px)',
    animation: `${fadeIn} 0.3s ease-out`,
  },
}));

// Drawer header
const DrawerHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: theme.palette.background.paper,
  position: 'sticky',
  top: 0,
  zIndex: 1,
}));

// Drag indicator
const DragIndicator = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '8px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '40px',
  height: '4px',
  borderRadius: '2px',
  backgroundColor: alpha(theme.palette.text.secondary, 0.3),
  cursor: 'grab',

  '&:active': {
    cursor: 'grabbing',
  },
}));

// Drawer content
const DrawerContent = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: '0 20px 20px',

  // Custom scrollbar
  '&::-webkit-scrollbar': {
    width: '4px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.text.secondary, 0.3),
    borderRadius: '2px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: alpha(theme.palette.text.secondary, 0.5),
  },
}));

// Drawer footer
const DrawerFooter = styled(Box)(({ theme }) => ({
  padding: '16px 20px',
  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: theme.palette.background.paper,
  position: 'sticky',
  bottom: 0,
  zIndex: 1,
}));

// Title container
const TitleContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  flex: 1,
  minWidth: 0,
});

// Main title
const MainTitle = styled(Typography)(({ theme }) => ({
  fontSize: '20px',
  fontWeight: 600,
  lineHeight: 1.2,
  color: theme.palette.text.primary,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
}));

// Subtitle
const Subtitle = styled(Typography)(({ theme }) => ({
  fontSize: '14px',
  fontWeight: 400,
  lineHeight: 1.2,
  color: theme.palette.text.secondary,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
  marginTop: '2px',
}));

// Error message
const ErrorMessage = styled(Box)(({ theme }) => ({
  padding: '12px 16px',
  backgroundColor: alpha(theme.palette.error.main, 0.1),
  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
  borderRadius: '8px',
  margin: '16px 0',
}));

// Loading overlay
const LoadingOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
  backdropFilter: 'blur(2px)',
}));

export function MobileDrawer({
  open,
  onClose,
  onOpen,
  anchor = 'bottom',
  variant = 'temporary',
  title,
  subtitle,
  children,
  showCloseButton = true,
  showDragIndicator = true,
  showHeader = true,
  fullHeight = false,
  maxHeight = '80vh',
  enableSwipeToClose = true,
  enableBackdropClose = true,
  backdropColor,
  elevation = 16,
  borderRadius = '20px 20px 0 0',
  headerActions,
  footerActions,
  loading = false,
  error = false,
  errorMessage,
}: MobileDrawerProps) {
  const theme = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle touch events for swipe to close
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enableSwipeToClose || anchor !== 'bottom') return;

    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
    setDragCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enableSwipeToClose || !isDragging || anchor !== 'bottom') return;

    const currentY = e.touches[0].clientY;
    setDragCurrentY(currentY);

    // Add visual feedback for dragging
    const diff = currentY - dragStartY;
    if (diff > 0 && drawerRef.current) {
      drawerRef.current.style.transform = `translateY(${Math.min(diff, 100)}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!enableSwipeToClose || !isDragging || anchor !== 'bottom') return;

    const diff = dragCurrentY - dragStartY;

    // Reset transform
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
    }

    // Close if dragged down enough
    if (diff > 100) {
      onClose();
    }

    setIsDragging(false);
    setDragStartY(0);
    setDragCurrentY(0);
  };

  // Handle backdrop click
  const handleBackdropClick = () => {
    if (enableBackdropClose) {
      onClose();
    }
  };

  // Handle close button click
  const handleCloseClick = () => {
    onClose();
  };

  // Render drawer content
  const renderDrawerContent = () => (
    <Box
      ref={drawerRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag Indicator */}
      {showDragIndicator && anchor === 'bottom' && <DragIndicator />}

      {/* Header */}
      {showHeader && (
        <DrawerHeader>
          <TitleContainer>
            {title && <MainTitle variant="h6">{title}</MainTitle>}
            {subtitle && <Subtitle variant="body2">{subtitle}</Subtitle>}
          </TitleContainer>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {headerActions}
            {showCloseButton && (
              <IconButton onClick={handleCloseClick} size="small" aria-label="Close drawer">
                <Iconify icon="eva:close-fill" width={20} />
              </IconButton>
            )}
          </Box>
        </DrawerHeader>
      )}

      {/* Content */}
      <DrawerContent>
        {/* Error Message */}
        {error && errorMessage && (
          <ErrorMessage>
            <Typography variant="body2" color="error">
              {errorMessage}
            </Typography>
          </ErrorMessage>
        )}

        {/* Main Content */}
        {children}

        {/* Loading Overlay */}
        {loading && (
          <LoadingOverlay>
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          </LoadingOverlay>
        )}
      </DrawerContent>

      {/* Footer */}
      {footerActions && <DrawerFooter>{footerActions}</DrawerFooter>}
    </Box>
  );

  // Use SwipeableDrawer for bottom anchor with swipe support
  if (anchor === 'bottom' && enableSwipeToClose) {
    return (
      <SwipeableDrawer
        anchor={anchor}
        open={open}
        onClose={onClose}
        onOpen={onOpen || (() => {})}
        disableSwipeToOpen={false}
        swipeAreaWidth={20}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: '100%',
            maxWidth: '100vw',
            height: fullHeight ? '100vh' : 'auto',
            maxHeight: fullHeight ? '100vh' : maxHeight,
            borderRadius,
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.shadows[elevation],
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          },
          '& .MuiBackdrop-root': {
            backgroundColor: backdropColor || alpha(theme.palette.common.black, 0.5),
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        {renderDrawerContent()}
      </SwipeableDrawer>
    );
  }

  // Use regular Drawer for other cases
  return (
    <StyledDrawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      variant={variant === 'swipeable' ? 'temporary' : variant}
      fullHeight={fullHeight}
      maxHeight={maxHeight}
      borderRadius={borderRadius}
      enableSwipeToClose={enableSwipeToClose}
      ModalProps={{
        keepMounted: true,
        BackdropProps: {
          onClick: handleBackdropClick,
          sx: {
            backgroundColor: backdropColor || alpha(theme.palette.common.black, 0.5),
            backdropFilter: 'blur(4px)',
          },
        },
      }}
    >
      {renderDrawerContent()}
    </StyledDrawer>
  );
}

// Hook for managing drawer state
export function useMobileDrawer() {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleToggle = () => setOpen(!open);

  return {
    open,
    handleOpen,
    handleClose,
    handleToggle,
  };
}
