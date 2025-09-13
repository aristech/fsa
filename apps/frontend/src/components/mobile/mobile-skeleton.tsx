'use client';

import React from 'react';

import { styled } from '@mui/material/styles';
import { Box, alpha, useTheme, keyframes } from '@mui/material';

export type MobileSkeletonVariant = 'text' | 'rectangular' | 'circular' | 'card' | 'list-item';
export type MobileSkeletonSize = 'small' | 'medium' | 'large';

interface MobileSkeletonProps {
  variant?: MobileSkeletonVariant;
  size?: MobileSkeletonSize;
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  count?: number;
  spacing?: number;
  children?: React.ReactNode;
}

// Animation keyframes
const pulse = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
`;

const wave = keyframes`
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

// Styled skeleton component
const StyledSkeleton = styled(Box, {
  shouldForwardProp: (prop) =>
    !['mobileVariant', 'mobileSize', 'animation'].includes(prop as string),
})<{
  mobileVariant: MobileSkeletonVariant;
  mobileSize: MobileSkeletonSize;
  animation: 'pulse' | 'wave' | 'none';
}>(({ theme, mobileVariant, mobileSize, animation }) => {
  const sizeConfig = {
    small: { borderRadius: '4px', height: '16px' },
    medium: { borderRadius: '6px', height: '20px' },
    large: { borderRadius: '8px', height: '24px' },
  };

  const config = sizeConfig[mobileSize];

  const baseStyles = {
    backgroundColor: alpha(theme.palette.grey[300], 0.3),
    borderRadius: config.borderRadius,
    position: 'relative' as const,
    overflow: 'hidden',
  };

  const variantStyles = {
    text: {
      height: config.height,
      width: '100%',
    },
    rectangular: {
      height: config.height,
      width: '100%',
    },
    circular: {
      height: config.height,
      width: config.height,
      borderRadius: '50%',
    },
    card: {
      height: '120px',
      width: '100%',
      borderRadius: '12px',
    },
    'list-item': {
      height: '60px',
      width: '100%',
      borderRadius: '8px',
    },
  };

  const animationStyles = {
    pulse: {
      animation: `${pulse} 1.5s ease-in-out infinite`,
    },
    wave: {
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        transform: 'translateX(-100%)',
        background: `linear-gradient(
          90deg,
          transparent,
          ${alpha(theme.palette.common.white, 0.4)},
          transparent
        )`,
        animation: `${wave} 1.6s linear infinite`,
      },
    },
    none: {},
  };

  return {
    ...baseStyles,
    ...variantStyles[mobileVariant],
    ...animationStyles[animation],
  };
});

// Skeleton text component
const SkeletonTextContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  width: '100%',
}));

// Skeleton card component
const SkeletonCardContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: '12px',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
}));

// Skeleton list item component
const SkeletonListItemContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: '8px',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
}));

export function MobileSkeleton({
  variant = 'text',
  size = 'medium',
  width,
  height,
  animation = 'pulse',
  count = 1,
  spacing = 0,
  children,
}: MobileSkeletonProps) {
  const theme = useTheme();

  // If children are provided, render skeleton wrapper
  if (children) {
    return (
      <Box sx={{ position: 'relative' }}>
        {children}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: alpha(theme.palette.grey[300], 0.3),
            borderRadius: 'inherit',
            ...(animation === 'pulse' && {
              animation: `${pulse} 1.5s ease-in-out infinite`,
            }),
          }}
        />
      </Box>
    );
  }

  // Render multiple skeletons
  if (count > 1) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacing }}>
        {Array.from({ length: count }).map((_, index) => (
          <StyledSkeleton
            key={index}
            mobileVariant={variant}
            mobileSize={size}
            animation={animation}
            sx={{ width, height }}
          />
        ))}
      </Box>
    );
  }

  // Render single skeleton
  return (
    <StyledSkeleton
      mobileVariant={variant}
      mobileSize={size}
      animation={animation}
      sx={{ width, height }}
    />
  );
}

// Predefined skeleton components
export function SkeletonText({
  lines = 3,
  ...props
}: { lines?: number } & Omit<MobileSkeletonProps, 'variant'>) {
  return (
    <SkeletonTextContainer>
      {Array.from({ length: lines }).map((_, index) => (
        <MobileSkeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? '60%' : '100%'}
          {...props}
        />
      ))}
    </SkeletonTextContainer>
  );
}

export function SkeletonCard({ ...props }: Omit<MobileSkeletonProps, 'variant'>) {
  return (
    <SkeletonCardContainer>
      <MobileSkeleton variant="rectangular" height="120px" {...props} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <MobileSkeleton variant="text" width="80%" {...props} />
        <MobileSkeleton variant="text" width="60%" {...props} />
        <MobileSkeleton variant="text" width="40%" {...props} />
      </Box>
    </SkeletonCardContainer>
  );
}

export function SkeletonListItem({ ...props }: Omit<MobileSkeletonProps, 'variant'>) {
  return (
    <SkeletonListItemContainer>
      <MobileSkeleton variant="circular" width="40px" height="40px" {...props} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <MobileSkeleton variant="text" width="70%" {...props} />
        <MobileSkeleton variant="text" width="50%" {...props} />
      </Box>
      <MobileSkeleton variant="rectangular" width="60px" height="24px" {...props} />
    </SkeletonListItemContainer>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 3,
  ...props
}: { rows?: number; columns?: number } & Omit<MobileSkeletonProps, 'variant'>) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box key={rowIndex} sx={{ display: 'flex', gap: 2 }}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <MobileSkeleton
              key={colIndex}
              variant="text"
              width={colIndex === 0 ? '40%' : '30%'}
              {...props}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}
