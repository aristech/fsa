'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { styled } from '@mui/material/styles';
import {
  Box,
  Paper,
  Badge,
  alpha,
  useTheme,
  keyframes,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';

export interface MobileNavigationItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number | string;
  disabled?: boolean;
  exact?: boolean; // Whether to match exact path
}

interface MobileBottomNavigationProps {
  items: MobileNavigationItem[];
  value?: number;
  onChange?: (event: React.SyntheticEvent, newValue: number) => void;
  showLabels?: boolean;
  enableHapticFeedback?: boolean;
  enableAnimations?: boolean;
  maxBadgeCount?: number;
}

// Animation keyframes
const bounceIn = keyframes`
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

// Styled BottomNavigation with mobile optimizations
const StyledBottomNavigation = styled(BottomNavigation, {
  shouldForwardProp: (prop) =>
    !['enableAnimations', 'enableHapticFeedback'].includes(prop as string),
})<{
  enableAnimations: boolean;
  enableHapticFeedback: boolean;
}>(({ theme, enableAnimations, enableHapticFeedback }) => ({
  height: '80px', // Increased height for better touch targets
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  paddingBottom: 'env(safe-area-inset-bottom)', // Handle iPhone safe area

  '& .MuiBottomNavigationAction-root': {
    minWidth: '60px',
    maxWidth: '120px',
    padding: '8px 12px',
    transition: enableAnimations ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',

    '&.Mui-selected': {
      color: theme.palette.primary.main,
      transform: enableAnimations ? 'translateY(-2px)' : 'none',

      '& .MuiBottomNavigationAction-label': {
        fontWeight: 600,
        fontSize: '12px',
        marginTop: '4px',
        animation: enableAnimations ? `${bounceIn} 0.3s ease-out` : 'none',
      },

      '& .MuiSvgIcon-root': {
        animation: enableAnimations ? `${pulse} 0.6s ease-in-out` : 'none',
      },
    },

    '&:not(.Mui-selected)': {
      color: theme.palette.text.secondary,

      '& .MuiBottomNavigationAction-label': {
        fontWeight: 400,
        fontSize: '11px',
        marginTop: '4px',
        opacity: 0.8,
      },
    },

    '&.Mui-disabled': {
      opacity: 0.4,
      pointerEvents: 'none',
    },

    // Touch feedback
    '&:active': {
      transform: enableHapticFeedback ? 'scale(0.95)' : 'none',
      backgroundColor: enableHapticFeedback
        ? alpha(theme.palette.primary.main, 0.1)
        : 'transparent',
    },
  },

  // Hover effects for desktop
  '@media (hover: hover)': {
    '& .MuiBottomNavigationAction-root:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.05),
      transform: 'translateY(-1px)',
    },
  },
}));

// Styled Badge with custom positioning
const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    right: '8px',
    top: '8px',
    minWidth: '18px',
    height: '18px',
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    border: `2px solid ${theme.palette.background.paper}`,
    animation: `${pulse} 2s infinite`,
  },

  '& .MuiBadge-dot': {
    right: '12px',
    top: '12px',
    width: '8px',
    height: '8px',
    backgroundColor: theme.palette.error.main,
    border: `2px solid ${theme.palette.background.paper}`,
  },
}));

// Navigation item wrapper with badge support
const NavigationItemWrapper = styled(Box)({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
});

export function MobileBottomNavigation({
  items,
  value,
  onChange,
  showLabels = true,
  enableHapticFeedback = true,
  enableAnimations = true,
  maxBadgeCount = 99,
}: MobileBottomNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const [currentValue, setCurrentValue] = useState(value || 0);

  // Find current navigation index based on pathname
  const currentIndex = items.findIndex((item) => {
    if (item.exact) {
      return pathname === item.path;
    }
    return pathname.startsWith(item.path);
  });

  // Update current value when pathname changes
  useEffect(() => {
    if (currentIndex >= 0 && currentIndex !== currentValue) {
      setCurrentValue(currentIndex);
    }
  }, [currentIndex, currentValue]);

  // Handle navigation change
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    const item = items[newValue];

    if (item.disabled) {
      return;
    }

    // Haptic feedback
    if (enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration
    }

    setCurrentValue(newValue);
    onChange?.(event, newValue);

    // Navigate to the path
    if (item.path) {
      router.push(item.path);
    }
  };

  // Format badge value
  const formatBadgeValue = (badge: number | string | undefined): string => {
    if (!badge) return '';
    if (typeof badge === 'string') return badge;
    return badge > maxBadgeCount ? `${maxBadgeCount}+` : badge.toString();
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        borderRadius: '20px 20px 0 0',
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        // Handle iPhone safe area
        paddingBottom: 'env(safe-area-inset-bottom)',
        // Smooth shadow animation
        transition: 'box-shadow 0.3s ease',
        '&:hover': {
          boxShadow: theme.shadows[12],
        },
      }}
    >
      <StyledBottomNavigation
        value={currentValue}
        onChange={handleChange}
        showLabels={showLabels}
        enableAnimations={enableAnimations}
        enableHapticFeedback={enableHapticFeedback}
      >
        {items.map((item, index) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={
              <NavigationItemWrapper>
                {item.badge ? (
                  <StyledBadge
                    badgeContent={formatBadgeValue(item.badge)}
                    color="error"
                    variant={typeof item.badge === 'string' ? 'standard' : 'standard'}
                    max={maxBadgeCount}
                  >
                    {item.icon}
                  </StyledBadge>
                ) : (
                  item.icon
                )}
              </NavigationItemWrapper>
            }
            disabled={item.disabled}
            sx={{
              // Custom styles for each item
              '& .MuiBottomNavigationAction-label': {
                fontSize: showLabels ? '11px' : '0px',
                fontWeight: currentValue === index ? 600 : 400,
                marginTop: showLabels ? '4px' : '0px',
                transition: 'all 0.2s ease',
              },

              // Icon styles
              '& .MuiSvgIcon-root': {
                fontSize: '24px',
                transition: 'all 0.2s ease',
              },

              // Active state
              '&.Mui-selected': {
                '& .MuiSvgIcon-root': {
                  fontSize: '26px',
                },
              },
            }}
          />
        ))}
      </StyledBottomNavigation>
    </Paper>
  );
}

// Hook for managing navigation state
export function useMobileNavigation(items: MobileNavigationItem[]) {
  const [value, setValue] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  // Find current index based on pathname
  const currentIndex = items.findIndex((item) => {
    if (item.exact) {
      return pathname === item.path;
    }
    return pathname.startsWith(item.path);
  });

  // Update value when pathname changes
  useEffect(() => {
    if (currentIndex >= 0) {
      setValue(currentIndex);
    }
  }, [currentIndex]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    const item = items[newValue];
    if (item && !item.disabled) {
      router.push(item.path);
    }
  };

  return {
    value,
    handleChange,
    currentIndex,
  };
}

// Export types
