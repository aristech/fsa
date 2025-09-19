'use client';

import type { CardProps } from '@mui/material';

import React, { useRef, useState } from 'react';

import { styled } from '@mui/material/styles';
import {
  Box,
  Card,
  Chip,
  alpha,
  Typography,
  CardContent,
  CardActions,
} from '@mui/material';

import { Iconify } from '../iconify';

export type MobileCardSize = 'small' | 'medium' | 'large';
export type MobileCardVariant = 'default' | 'elevated' | 'outlined' | 'filled';
export type MobileCardStatus = 'pending' | 'in-progress' | 'completed' | 'overdue' | 'cancelled';

interface MobileCardProps extends Omit<CardProps, 'variant' | 'onSelect'> {
  size?: MobileCardSize;
  variant?: MobileCardVariant;
  title?: string;
  subtitle?: string;
  description?: string;
  status?: MobileCardStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  progress?: number;
  actions?: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
  swipeable?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  loading?: boolean;
  error?: boolean;
  icon?: React.ReactNode;
  badge?: string | number;
  timestamp?: string;
  location?: string;
}

// Mobile-optimized card sizes
const cardSizes = {
  small: {
    minHeight: '80px',
    padding: '12px',
    borderRadius: '8px',
  },
  medium: {
    minHeight: '120px',
    padding: '16px',
    borderRadius: '12px',
  },
  large: {
    minHeight: '160px',
    padding: '20px',
    borderRadius: '16px',
  },
};

// Status colors and icons
const statusConfig = {
  pending: { color: 'warning', icon: 'eva:clock-fill', label: 'Pending' },
  'in-progress': { color: 'info', icon: 'eva:arrow-forward-fill', label: 'In Progress' },
  completed: { color: 'success', icon: 'eva:checkmark-circle-fill', label: 'Completed' },
  overdue: { color: 'error', icon: 'eva:alert-circle-fill', label: 'Overdue' },
  cancelled: { color: 'default', icon: 'eva:close-circle-fill', label: 'Cancelled' },
};

// Priority colors
const priorityColors = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  urgent: 'error',
};

// Styled Card with mobile optimizations
const StyledMobileCard = styled(Card, {
  shouldForwardProp: (prop) =>
    !['mobileSize', 'mobileVariant', 'swipeable', 'selected', 'loading', 'error'].includes(
      prop as string
    ),
})<{
  mobileSize: MobileCardSize;
  mobileVariant: MobileCardVariant;
  swipeable: boolean;
  selected: boolean;
  loading: boolean;
  error: boolean;
}>(({ theme, mobileSize, mobileVariant, swipeable, selected, loading, error }) => {
  const sizeConfig = cardSizes[mobileSize];

  const baseStyles = {
    minHeight: sizeConfig.minHeight,
    borderRadius: sizeConfig.borderRadius,
    cursor: swipeable ? 'grab' : 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    overflow: 'hidden',
    // Ensure proper touch targets
    touchAction: swipeable ? 'pan-y' : 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,

    '&:active': {
      transform: swipeable ? 'none' : 'scale(0.98)',
    },

    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
  };

  // Variant styles
  const variantStyles = {
    default: {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[1],
    },
    elevated: {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[3],
    },
    outlined: {
      backgroundColor: theme.palette.background.paper,
      border: `2px solid ${alpha(theme.palette.divider, 0.3)}`,
      boxShadow: 'none',
    },
    filled: {
      backgroundColor: alpha(theme.palette.primary.main, 0.05),
      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      boxShadow: 'none',
    },
  };

  // Selected state
  const selectedStyles = selected
    ? {
        border: `2px solid ${theme.palette.primary.main}`,
        backgroundColor: alpha(theme.palette.primary.main, 0.05),
      }
    : {};

  // Loading state
  const loadingStyles = loading
    ? {
        opacity: 0.7,
        pointerEvents: 'none' as const,
      }
    : {};

  // Error state
  const errorStyles = error
    ? {
        border: `2px solid ${theme.palette.error.main}`,
        backgroundColor: alpha(theme.palette.error.main, 0.05),
      }
    : {};

  return {
    ...baseStyles,
    ...variantStyles[mobileVariant],
    ...selectedStyles,
    ...loadingStyles,
    ...errorStyles,
  };
});

// Progress bar component
const ProgressBar = styled(Box)<{ progress: number; color: string }>(
  ({ theme, progress, color }) => ({
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: '4px',
    width: `${progress}%`,
    backgroundColor:
      (theme.palette[color as keyof typeof theme.palette] as any)?.main ||
      theme.palette.primary.main,
    borderRadius: '0 0 12px 12px',
    transition: 'width 0.3s ease',
  })
);

// Swipe indicator
const SwipeIndicator = styled(Box)<{ direction: 'left' | 'right' | null }>(
  ({ theme, direction }) => ({
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: direction ? 0.8 : 0,
    transition: 'all 0.2s ease',
    zIndex: 1,
    ...(direction === 'left' && {
      left: '-30px',
      backgroundColor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
    }),
    ...(direction === 'right' && {
      right: '-30px',
      backgroundColor: theme.palette.success.main,
      color: theme.palette.success.contrastText,
    }),
  })
);

export function MobileCard({
  size = 'medium',
  variant = 'default',
  title,
  subtitle,
  description,
  status,
  priority,
  progress,
  actions,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  swipeable = false,
  selectable = false,
  selected = false,
  onSelect,
  loading = false,
  error = false,
  icon,
  badge,
  timestamp,
  location,
  children,
  ...props
}: MobileCardProps) {
  // const _theme = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Touch event handlers for swipe functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeable) return;
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeable || !isDragging) return;
    const currentXPos = e.touches[0].clientX;
    setCurrentX(currentXPos);

    const diff = currentXPos - startX;
    if (Math.abs(diff) > 50) {
      setSwipeDirection(diff > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(null);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeable || !isDragging) return;

    const diff = currentX - startX;
    if (Math.abs(diff) > 100) {
      if (diff > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (diff < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    setIsDragging(false);
    setSwipeDirection(null);
    setCurrentX(0);
  };

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(!selected);
    } else if (onTap) {
      onTap();
    }
  };

  // Status configuration
  const statusInfo = status ? statusConfig[status] : null;

  return (
    <StyledMobileCard
      ref={cardRef}
      {...({
        mobileSize: size,
        mobileVariant: variant,
        swipeable,
        selected,
        loading,
        error,
      } as any)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      {...props}
    >
      {/* Swipe indicators */}
      {swipeable && (
        <SwipeIndicator direction={swipeDirection}>
          {swipeDirection === 'left' && <Iconify icon="eva:more-vertical-fill" width={24} />}
          {swipeDirection === 'right' && <Iconify icon="eva:checkmark-circle-fill" width={24} />}
        </SwipeIndicator>
      )}

      {/* Progress bar */}
      {progress !== undefined && (
        <ProgressBar progress={progress} color={statusInfo?.color || 'primary'} />
      )}

      <CardContent
        sx={{
          padding: cardSizes[size].padding,
          '&:last-child': { paddingBottom: cardSizes[size].padding },
        }}
      >
        {/* Header with icon, title, and badge */}
        <Box
          sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            {icon && (
              <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                {icon}
              </Box>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {title && (
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    fontSize: size === 'small' ? '14px' : size === 'large' ? '18px' : '16px',
                    lineHeight: 1.2,
                    mb: subtitle ? 0.5 : 0,
                  }}
                  noWrap
                >
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: size === 'small' ? '12px' : '14px',
                    lineHeight: 1.2,
                  }}
                  noWrap
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Badge and status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {badge && (
              <Chip
                label={badge}
                size="small"
                color="primary"
                sx={{ fontSize: '10px', height: '20px' }}
              />
            )}
            {status && statusInfo && (
              <Iconify
                icon={statusInfo.icon}
                width={20}
                sx={{ color: `${statusInfo.color}.main` }}
              />
            )}
          </Box>
        </Box>

        {/* Description */}
        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: size === 'small' ? '12px' : '14px',
              lineHeight: 1.4,
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: size === 'small' ? 2 : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </Typography>
        )}

        {/* Priority and status chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          {priority && (
            <Chip
              label={priority.toUpperCase()}
              size="small"
              color={priorityColors[priority] as any}
              sx={{ fontSize: '10px', height: '20px' }}
            />
          )}
          {/* {status && (
            <Chip
              label={statusInfo?.label}
              size="small"
              color={statusInfo?.color as any}
              sx={{ fontSize: '10px', height: '20px' }}
            />
          )} */}
        </Box>

        {/* Timestamp and location */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          {timestamp && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
              {timestamp}
            </Typography>
          )}
          {location && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
              📍 {location}
            </Typography>
          )}
        </Box>

        {/* Custom content */}
        {children}
      </CardContent>

      {/* Actions */}
      {actions && (
        <CardActions sx={{ padding: `0 ${cardSizes[size].padding} ${cardSizes[size].padding}` }}>
          {actions}
        </CardActions>
      )}
    </StyledMobileCard>
  );
}

// Export types for use in other components
