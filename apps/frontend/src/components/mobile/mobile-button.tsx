'use client';

import type { ButtonProps } from '@mui/material';

import React from 'react';

import { styled } from '@mui/material/styles';
import { alpha, Button, CircularProgress } from '@mui/material';

// Mobile-optimized button sizes
export type MobileButtonSize = 'small' | 'medium' | 'large' | 'xlarge';
export type MobileButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'outline';

interface MobileButtonProps extends Omit<ButtonProps, 'size' | 'variant'> {
  size?: MobileButtonSize;
  variant?: MobileButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  touchFeedback?: boolean;
}

// Mobile-optimized button sizes (following our design system)
const buttonSizes = {
  small: {
    height: '40px',
    padding: '0 16px',
    fontSize: '14px',
    minWidth: '80px',
  },
  medium: {
    height: '48px',
    padding: '0 20px',
    fontSize: '16px',
    minWidth: '100px',
  },
  large: {
    height: '56px',
    padding: '0 24px',
    fontSize: '18px',
    minWidth: '120px',
  },
  xlarge: {
    height: '64px',
    padding: '0 28px',
    fontSize: '20px',
    minWidth: '140px',
  },
};

// Helper function to get mobile button styles
const getMobileButtonStyles = (
  theme: any,
  size: MobileButtonSize,
  variant: MobileButtonVariant,
  touchFeedback: boolean,
  loading: boolean
) => {
  const sizeConfig = buttonSizes[size];

  // Base styles for mobile optimization
  const baseStyles = {
    height: sizeConfig.height,
    padding: sizeConfig.padding,
    fontSize: sizeConfig.fontSize,
    minWidth: sizeConfig.minWidth,
    borderRadius: '12px', // More rounded for mobile
    fontWeight: 600,
    textTransform: 'none' as const,
    boxShadow: 'none',
    border: 'none',
    position: 'relative' as const,
    overflow: 'hidden',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    // Ensure proper touch targets
    touchAction: 'manipulation' as const,
    WebkitTapHighlightColor: 'transparent',
    // Prevent text selection on touch
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
  };

  // Variant-specific styles
  const variantStyles = {
    primary: {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      '&:hover': {
        backgroundColor: theme.palette.primary.dark,
        transform: 'translateY(-1px)',
        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
      },
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`,
      },
    },
    secondary: {
      backgroundColor: theme.palette.secondary.main,
      color: theme.palette.secondary.contrastText,
      '&:hover': {
        backgroundColor: theme.palette.secondary.dark,
        transform: 'translateY(-1px)',
        boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.3)}`,
      },
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: `0 2px 8px ${alpha(theme.palette.secondary.main, 0.2)}`,
      },
    },
    danger: {
      backgroundColor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
      '&:hover': {
        backgroundColor: theme.palette.error.dark,
        transform: 'translateY(-1px)',
        boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
      },
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: `0 2px 8px ${alpha(theme.palette.error.main, 0.2)}`,
      },
    },
    success: {
      backgroundColor: theme.palette.success.main,
      color: theme.palette.success.contrastText,
      '&:hover': {
        backgroundColor: theme.palette.success.dark,
        transform: 'translateY(-1px)',
        boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`,
      },
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: `0 2px 8px ${alpha(theme.palette.success.main, 0.2)}`,
      },
    },
    warning: {
      backgroundColor: theme.palette.warning.main,
      color: theme.palette.warning.contrastText,
      '&:hover': {
        backgroundColor: theme.palette.warning.dark,
        transform: 'translateY(-1px)',
        boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.3)}`,
      },
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: `0 2px 8px ${alpha(theme.palette.warning.main, 0.2)}`,
      },
    },
    outline: {
      backgroundColor: 'transparent',
      color: theme.palette.primary.main,
      border: `2px solid ${theme.palette.primary.main}`,
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        transform: 'translateY(-1px)',
        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
      },
      '&:active': {
        transform: 'translateY(0)',
        backgroundColor: alpha(theme.palette.primary.main, 0.2),
      },
    },
  };

  // Touch feedback styles
  const touchFeedbackStyles = touchFeedback
    ? {
        '&:active': {
          transform: 'scale(0.98)',
        },
      }
    : {};

  // Loading state styles
  const loadingStyles = loading
    ? {
        color: 'transparent',
        '& .MuiCircularProgress-root': {
          position: 'absolute' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        },
      }
    : {};

  return {
    ...baseStyles,
    ...variantStyles[variant],
    ...touchFeedbackStyles,
    ...loadingStyles,
  };
};

// Ripple effect component for touch feedback
const RippleEffect = styled('span')(({ theme }) => ({
  position: 'absolute',
  borderRadius: '50%',
  backgroundColor: alpha(theme.palette.common.white, 0.3),
  transform: 'scale(0)',
  animation: 'ripple 0.6s linear',
  pointerEvents: 'none',
  '@keyframes ripple': {
    to: {
      transform: 'scale(4)',
      opacity: 0,
    },
  },
}));

export function MobileButton({
  children,
  size = 'medium',
  variant = 'primary',
  loading = false,
  icon,
  fullWidth = false,
  touchFeedback = true,
  disabled,
  onClick,
  ...props
}: MobileButtonProps) {
  const [ripples, setRipples] = React.useState<Array<{ key: number; x: number; y: number }>>([]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;

    // Add ripple effect
    if (touchFeedback) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const newRipple = { key: Date.now(), x, y };

      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.key !== newRipple.key));
      }, 600);
    }

    onClick?.(event);
  };

  // Map custom size to MUI size
  const muiSize = size === 'xlarge' ? 'large' : size === 'medium' ? 'medium' : 'small';

  // Map custom variant to MUI variant
  const muiVariant = variant === 'outline' ? 'outlined' : 'contained';

  return (
    <Button
      size={muiSize}
      variant={muiVariant}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      onClick={handleClick}
      startIcon={!loading && icon}
      sx={(theme) => getMobileButtonStyles(theme, size, variant, touchFeedback, loading)}
      {...props}
    >
      {loading && (
        <CircularProgress
          size={size === 'small' ? 16 : size === 'medium' ? 20 : 24}
          color="inherit"
        />
      )}
      {children}

      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <RippleEffect
          key={ripple.key}
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
        />
      ))}
    </Button>
  );
}

// Types are already exported above
