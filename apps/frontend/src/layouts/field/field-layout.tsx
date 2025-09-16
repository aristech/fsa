'use client';

import { Box, useTheme, Container } from '@mui/material';

import { Iconify } from 'src/components/iconify';
import {
  MobileHeader,
  MobileBottomNavigation,
  type MobileNavigationItem,
} from 'src/components/mobile';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

interface FieldLayoutProps {
  children: React.ReactNode;
}

const navigationItems: MobileNavigationItem[] = [
  {
    label: 'Calendar',
    icon: <Iconify icon="solar:calendar-bold" width={24} />,
    path: '/field/calendar',
  },
  {
    label: 'Tasks',
    icon: <Iconify icon="solar:clipboard-list-bold" width={24} />,
    path: '/field/tasks',
    badge: 3,
  },
  {
    label: 'Reports',
    icon: <Iconify icon="solar:document-text-bold" width={24} />,
    path: '/field/reports',
  },
  {
    label: 'Notifications',
    icon: <Iconify icon="solar:bell-bold" width={24} />,
    path: '/field/notifications',
    badge: 5,
  },
  { label: 'Profile', icon: <Iconify icon="solar:user-bold" width={24} />, path: '/field/profile' },
];

export function FieldLayout({ children }: FieldLayoutProps) {
  const theme = useTheme();
  const { user, authenticated } = useAuthContext();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        // Bottom navigation on all screen sizes
        paddingBottom: authenticated ? '80px' : 0, // Space for bottom navigation only when authenticated
      }}
    >
      {/* Mobile Header - Only show when authenticated */}
      {authenticated && (
        <MobileHeader
          title="Field Operations"
          subtitle={`Welcome, ${user?.firstName || 'Field Operator'}`}
          showNotifications
          notificationCount={5}
          sticky
          collapsible
        />
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
        }}
      >
        <Container sx={{ padding: { xs: 0.5 } }} maxWidth="lg">
          {children}
        </Container>
      </Box>

      {/* Bottom Navigation (All Screen Sizes) - Only show when authenticated */}
      {authenticated && (
        <Box>
          <MobileBottomNavigation
            items={navigationItems}
            enableHapticFeedback
            enableAnimations
            showLabels
          />
        </Box>
      )}
    </Box>
  );
}
