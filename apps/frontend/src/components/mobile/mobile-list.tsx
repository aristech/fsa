'use client';

import React, { useRef, useState, useCallback } from 'react';

import { styled } from '@mui/material/styles';
import { Box, alpha, useTheme, Typography, CircularProgress } from '@mui/material';

import { Iconify } from '../iconify';

export type MobileListVariant = 'default' | 'card' | 'compact';
export type MobileListSize = 'small' | 'medium' | 'large';

interface MobileListProps {
  children: React.ReactNode;
  variant?: MobileListVariant;
  size?: MobileListSize;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  emptyState?: {
    icon?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
  pullToRefresh?: {
    enabled: boolean;
    onRefresh: () => Promise<void>;
    threshold?: number;
  };
  infiniteScroll?: {
    enabled: boolean;
    hasMore: boolean;
    onLoadMore: () => Promise<void>;
    threshold?: number;
  };
  onItemPress?: (index: number) => void;
  onItemLongPress?: (index: number) => void;
  hapticFeedback?: boolean;
  showDividers?: boolean;
  spacing?: number;
}

// Styled components
const StyledList = styled(Box, {
  shouldForwardProp: (prop) =>
    !['mobileVariant', 'mobileSize', 'showDividers', 'spacing'].includes(prop as string),
})<{
  mobileVariant: MobileListVariant;
  mobileSize: MobileListSize;
  showDividers: boolean;
  spacing: number;
}>(({ theme, mobileVariant, mobileSize, showDividers, spacing }) => {
  const sizeConfig = {
    small: { padding: '8px', itemSpacing: '4px' },
    medium: { padding: '12px', itemSpacing: '8px' },
    large: { padding: '16px', itemSpacing: '12px' },
  };

  const config = sizeConfig[mobileSize];

  return {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    padding: config.padding,
    backgroundColor: theme.palette.background.default,

    // Variant-specific styles
    ...(mobileVariant === 'card' && {
      '& > *': {
        marginBottom: config.itemSpacing,
        '&:last-child': {
          marginBottom: 0,
        },
      },
    }),

    ...(mobileVariant === 'compact' && {
      '& > *': {
        marginBottom: '2px',
        '&:last-child': {
          marginBottom: 0,
        },
      },
    }),

    // Dividers
    ...(showDividers &&
      mobileVariant === 'default' && {
        '& > *:not(:last-child)': {
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          paddingBottom: config.itemSpacing,
          marginBottom: config.itemSpacing,
        },
      }),

    // Custom spacing
    ...(spacing > 0 && {
      '& > *': {
        marginBottom: `${spacing}px`,
        '&:last-child': {
          marginBottom: 0,
        },
      },
    }),
  };
});

const PullToRefreshIndicator = styled(Box, {
  shouldForwardProp: (prop) => !['isRefreshing', 'pullDistance'].includes(prop as string),
})<{
  isRefreshing: boolean;
  pullDistance: number;
}>(({ theme, isRefreshing, pullDistance }) => ({
  position: 'sticky',
  top: 0,
  left: 0,
  right: 0,
  height: '60px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  zIndex: 1,
  transform: `translateY(${Math.min(pullDistance - 60, 0)}px)`,
  transition: isRefreshing ? 'none' : 'transform 0.3s ease-out',
}));

const InfiniteScrollTrigger = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
  minHeight: '60px',
}));

const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  textAlign: 'center',
  minHeight: '200px',
}));

const ErrorState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  textAlign: 'center',
  backgroundColor: alpha(theme.palette.error.main, 0.1),
  borderRadius: theme.spacing(1),
  margin: theme.spacing(2),
}));

export function MobileList({
  children,
  variant = 'default',
  size = 'medium',
  loading = false,
  error = false,
  errorMessage = 'Something went wrong. Please try again.',
  emptyState,
  pullToRefresh,
  infiniteScroll,
  onItemPress,
  onItemLongPress,
  hapticFeedback = true,
  showDividers = true,
  spacing = 0,
}: MobileListProps) {
  const theme = useTheme();
  const listRef = useRef<HTMLDivElement>(null);

  // Pull to refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [startY, setStartY] = useState(0);

  // Infinite scroll state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasTriggeredLoad, setHasTriggeredLoad] = useState(false);

  // Handle pull to refresh
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!pullToRefresh?.enabled || isRefreshing) return;

      const scrollTop = listRef.current?.scrollTop || 0;
      if (scrollTop === 0) {
        setStartY(e.touches[0].clientY);
        setIsPulling(true);
      }
    },
    [pullToRefresh?.enabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || !pullToRefresh?.enabled || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY);
      const threshold = pullToRefresh.threshold || 80;

      if (distance > 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, threshold * 1.5));
      }
    },
    [isPulling, pullToRefresh, isRefreshing, startY]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || !pullToRefresh?.enabled || isRefreshing) return;

    const threshold = pullToRefresh.threshold || 80;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await pullToRefresh.onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    setIsPulling(false);
  }, [isPulling, pullToRefresh, isRefreshing, pullDistance]);

  // Handle infinite scroll
  const handleScroll = useCallback(async () => {
    if (!infiniteScroll?.enabled || isLoadingMore || !infiniteScroll.hasMore || hasTriggeredLoad)
      return;

    const element = listRef.current;
    if (!element) return;

    const threshold = infiniteScroll.threshold || 100;
    const { scrollTop, scrollHeight, clientHeight } = element;

    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      setHasTriggeredLoad(true);
      setIsLoadingMore(true);

      try {
        await infiniteScroll.onLoadMore();
      } finally {
        setIsLoadingMore(false);
        setHasTriggeredLoad(false);
      }
    }
  }, [infiniteScroll, isLoadingMore, hasTriggeredLoad]);

  // Haptic feedback
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (hapticFeedback && 'vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30],
        };
        navigator.vibrate(patterns[type]);
      }
    },
    [hapticFeedback]
  );

  // Handle item interactions
  const handleItemPress = useCallback(
    (index: number) => {
      triggerHaptic('light');
      onItemPress?.(index);
    },
    [onItemPress, triggerHaptic]
  );

  const handleItemLongPress = useCallback(
    (index: number) => {
      triggerHaptic('medium');
      onItemLongPress?.(index);
    },
    [onItemLongPress, triggerHaptic]
  );

  // Render loading state
  if (loading && !children) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
        }}
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <ErrorState>
        <Iconify icon="eva:alert-circle-fill" width={48} sx={{ color: 'error.main', mb: 2 }} />
        <Typography variant="h6" color="error" gutterBottom>
          Error
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {errorMessage}
        </Typography>
      </ErrorState>
    );
  }

  // Render empty state
  if (!loading && !children) {
    return (
      <EmptyState>
        {emptyState?.icon && (
          <Iconify icon={emptyState.icon} width={64} sx={{ color: 'text.secondary', mb: 2 }} />
        )}
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {emptyState?.title || 'No items found'}
        </Typography>
        {emptyState?.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {emptyState.description}
          </Typography>
        )}
        {emptyState?.action}
      </EmptyState>
    );
  }

  return (
    <StyledList
      ref={listRef}
      mobileVariant={variant}
      mobileSize={size}
      showDividers={showDividers}
      spacing={spacing}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
    >
      {/* Pull to refresh indicator */}
      {pullToRefresh?.enabled && (
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance}>
          {isRefreshing ? (
            <CircularProgress size={24} />
          ) : (
            <Iconify
              icon="eva:arrow-downward-fill"
              width={24}
              sx={{
                color: 'primary.main',
                transform: `rotate(${pullDistance > (pullToRefresh.threshold || 80) ? 180 : 0}deg)`,
                transition: 'transform 0.3s ease',
              }}
            />
          )}
        </PullToRefreshIndicator>
      )}

      {/* List content */}
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...(child.props as any),
            onClick: () => handleItemPress(index),
            onTouchStart: (e: React.TouchEvent) => {
              (child.props as any).onTouchStart?.(e);
              // Long press detection
              const timer = setTimeout(() => {
                handleItemLongPress(index);
              }, 500);

              const handleTouchEndLocal = () => {
                clearTimeout(timer);
                document.removeEventListener('touchend', handleTouchEndLocal);
              };

              document.addEventListener('touchend', handleTouchEndLocal);
            },
          });
        }
        return child;
      })}

      {/* Infinite scroll trigger */}
      {infiniteScroll?.enabled && infiniteScroll.hasMore && (
        <InfiniteScrollTrigger>
          {isLoadingMore ? (
            <CircularProgress size={24} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Pull up to load more
            </Typography>
          )}
        </InfiniteScrollTrigger>
      )}
    </StyledList>
  );
}

// Hook for managing list state
export function useMobileList<T>({
  initialData = [],
  pageSize = 20,
}: {
  initialData?: T[];
  pageSize?: number;
} = {}) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(
    async (loadFunction: (page: number, pageSize: number) => Promise<T[]>) => {
      if (loading || !hasMore) return;

      setLoading(true);
      setError(false);

      try {
        const newData = await loadFunction(page, pageSize);
        setData((prev) => [...prev, ...newData]);
        setPage((prev) => prev + 1);
        setHasMore(newData.length === pageSize);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [loading, hasMore, page, pageSize]
  );

  const refresh = useCallback(
    async (refreshFunction: () => Promise<T[]>) => {
      setLoading(true);
      setError(false);
      setPage(1);

      try {
        const newData = await refreshFunction();
        setData(newData);
        setHasMore(newData.length === pageSize);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setPage(1);
    setHasMore(true);
    setError(false);
    setLoading(false);
  }, [initialData]);

  return {
    data,
    loading,
    error,
    hasMore,
    page,
    loadMore,
    refresh,
    reset,
    setData,
  };
}
