'use client';

import { useRouter } from 'next/navigation';
import React, { useRef, useState, useEffect } from 'react';

import { styled } from '@mui/material/styles';
import {
  Box,
  Badge,
  alpha,
  AppBar,
  Toolbar,
  useTheme,
  Collapse,
  InputBase,
  keyframes,
  Typography,
  IconButton,
} from '@mui/material';

import { Iconify } from '../iconify';

export interface MobileHeaderAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number | string;
  disabled?: boolean;
}

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showMenuButton?: boolean;
  onMenuClick?: () => void;
  actions?: MobileHeaderAction[];
  showNotifications?: boolean;
  notificationCount?: number;
  onNotificationClick?: () => void;
  collapsible?: boolean;
  elevation?: number;
  backgroundColor?: string;
  sticky?: boolean;
}

// Animation keyframes
const slideDown = keyframes`
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

// const fadeIn = keyframes`
//   from {
//     opacity: 0;
//   }
//   to {
//     opacity: 1;
//   }
// `;

// Styled AppBar with mobile optimizations
const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => !['sticky', 'collapsible'].includes(prop as string),
})<{
  sticky: boolean;
  collapsible: boolean;
}>(({ theme, sticky, collapsible }) => ({
  position: sticky ? 'sticky' : 'relative',
  top: 0,
  zIndex: theme.zIndex.appBar,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[2],
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  animation: `${slideDown} 0.3s ease-out`,

  // Handle iPhone safe area
  paddingTop: 'env(safe-area-inset-top)',

  // Collapsible behavior
  ...(collapsible && {
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  }),
}));

// Styled Toolbar
const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  minHeight: '64px',
  padding: '0 16px',
  gap: '12px',

  // Handle iPhone safe area
  paddingTop: 'env(safe-area-inset-top)',
}));

// Search container
const SearchContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  flex: 1,
  maxWidth: '400px',
  margin: '0 16px',
}));

// Search input
const SearchInput = styled(InputBase)(({ theme }) => ({
  width: '100%',
  height: '40px',
  padding: '8px 16px 8px 48px',
  borderRadius: '20px',
  backgroundColor: alpha(theme.palette.action.hover, 0.5),
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  fontSize: '16px',
  transition: 'all 0.2s ease',

  '&:focus': {
    backgroundColor: theme.palette.background.paper,
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
  },

  '&::placeholder': {
    color: theme.palette.text.secondary,
    opacity: 0.7,
  },
}));

// Search icon
const SearchIcon = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: theme.palette.text.secondary,
  pointerEvents: 'none',
  zIndex: 1,
}));

// Action button with badge
const ActionButton = styled(IconButton)(({ theme }) => ({
  position: 'relative',
  width: '44px',
  height: '44px',
  borderRadius: '12px',
  transition: 'all 0.2s ease',

  '&:hover': {
    backgroundColor: alpha(theme.palette.action.hover, 0.8),
    transform: 'scale(1.05)',
  },

  '&:active': {
    transform: 'scale(0.95)',
  },
}));

// Title container
const TitleContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  flex: 1,
  minWidth: 0, // Allow text truncation
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

// Actions container
const ActionsContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexShrink: 0,
});

export function MobileHeader({
  title = 'Field Operations',
  subtitle,
  showBackButton = false,
  onBackClick,
  showSearch = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  showMenuButton = false,
  onMenuClick,
  actions = [],
  showNotifications = false,
  notificationCount = 0,
  onNotificationClick,
  collapsible = false,
  elevation = 2,
  backgroundColor,
  sticky = true,
}: MobileHeaderProps) {
  const theme = useTheme();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);
  const router = useRouter();
  // Handle scroll for collapsible header
  useEffect(() => {
    if (!collapsible) return undefined;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        // Scrolling down
        setIsCollapsed(true);
      } else {
        // Scrolling up
        setIsCollapsed(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [collapsible]);

  // Handle search focus
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
  };

  // Handle search change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(event.target.value);
  };

  // Handle back button click
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      window.history.back();
    }
  };

  // Handle menu button click
  const handleMenuClick = () => {
    onMenuClick?.();
  };

  // Handle notification click
  const handleNotificationClick = () => {
    // send user to notifications page
    router.push('/field/notifications');
  };

  return (
    <StyledAppBar
      position="static"
      elevation={elevation}
      sticky={sticky}
      collapsible={collapsible}
      sx={{
        backgroundColor: backgroundColor || theme.palette.background.paper,
        transform: isCollapsed ? 'translateY(-100%)' : 'translateY(0)',
      }}
    >
      <StyledToolbar>
        {/* Back Button */}
        {showBackButton && (
          <ActionButton onClick={handleBackClick} sx={{ mr: 1 }} aria-label="Go back">
            <Iconify icon="eva:arrow-back-fill" width={24} />
          </ActionButton>
        )}

        {/* Menu Button */}
        {showMenuButton && !showBackButton && (
          <ActionButton onClick={handleMenuClick} sx={{ mr: 1 }} aria-label="Open menu">
            <Iconify icon="eva:menu-fill" width={24} />
          </ActionButton>
        )}

        {/* Title Container */}
        <TitleContainer>
          <MainTitle variant="h6">{title}</MainTitle>
          {subtitle && <Subtitle variant="body2">{subtitle}</Subtitle>}
        </TitleContainer>

        {/* Search Container */}
        {showSearch && (
          <Collapse in={isSearchFocused || searchValue.length > 0} timeout={300}>
            <SearchContainer>
              <SearchIcon>
                <Iconify icon="eva:search-fill" width={20} />
              </SearchIcon>
              <SearchInput
                ref={searchInputRef}
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                inputProps={{ 'aria-label': 'Search' }}
              />
              {searchValue && (
                <IconButton
                  size="small"
                  onClick={() => onSearchChange?.('')}
                  sx={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '24px',
                    height: '24px',
                  }}
                >
                  <Iconify icon="eva:close-fill" width={20} />
                </IconButton>
              )}
            </SearchContainer>
          </Collapse>
        )}

        {/* Actions Container */}
        <ActionsContainer>
          {/* Custom Actions */}
          {actions.map((action, index) => (
            <ActionButton
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              aria-label={action.label}
            >
              {action.badge ? (
                <Badge badgeContent={action.badge} color="error" max={99}>
                  {action.icon}
                </Badge>
              ) : (
                action.icon
              )}
            </ActionButton>
          ))}

          {/* Notifications */}
          {showNotifications && (
            <ActionButton onClick={handleNotificationClick} aria-label="Notifications">
              <Badge badgeContent={notificationCount} color="error" max={99}>
                <Iconify icon="eva:bell-fill" width={24} />
              </Badge>
            </ActionButton>
          )}

          {/* More Actions */}
          {actions.length > 0 && (
            <ActionButton aria-label="More actions">
              <Iconify icon="eva:more-vertical-fill" width={24} />
            </ActionButton>
          )}
        </ActionsContainer>
      </StyledToolbar>
    </StyledAppBar>
  );
}

// Hook for managing header state
export function useMobileHeader() {
  const [searchValue, setSearchValue] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) {
      setSearchValue('');
    }
  };

  const handleSearchClear = () => {
    setSearchValue('');
  };

  return {
    searchValue,
    isSearchOpen,
    handleSearchChange,
    handleSearchToggle,
    handleSearchClear,
  };
}

// Export types
