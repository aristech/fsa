'use client';

import type { MobileNavigationItem } from 'src/components/mobile';

import { useMemo } from 'react';

import { Box, useTheme, Container } from '@mui/material';

import { allLangs, useTranslate } from 'src/locales';
import { LanguagePopover } from 'src/layouts/components/language-popover';
import { NotificationsDrawer } from 'src/layouts/components/notifications-drawer';

import { Iconify } from 'src/components/iconify';
import { MobileHeader, MobileBottomNavigation } from 'src/components/mobile';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

interface FieldLayoutProps {
  children: React.ReactNode;
}

export function FieldLayout({ children }: FieldLayoutProps) {
  const theme = useTheme();
  const { user, authenticated } = useAuthContext();
  const { t } = useTranslate('field');

  const navigationItems: MobileNavigationItem[] = useMemo(() => [
    {
      label: t('navigation.calendar'),
      icon: <Iconify icon="solar:calendar-bold" width={24} />,
      path: '/field/calendar',
    },
    {
      label: t('navigation.tasks'),
      icon: <Iconify icon="solar:clipboard-list-bold" width={24} />,
      path: '/field/tasks',
    },
    {
      label: t('navigation.reports'),
      icon: <Iconify icon="solar:document-text-bold" width={24} />,
      path: '/field/reports',
    },
    {
      label: t('navigation.profile'),
      icon: <Iconify icon="solar:user-bold" width={24} />,
      path: '/field/profile'
    },
  ], [t]);

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
        <Box sx={{ position: 'relative' }}>
          <MobileHeader
            title={t('header.title')}
            subtitle={t('header.welcome', { name: user?.firstName || t('header.defaultName') })}
            sticky
            collapsible
          />
          {/* Notifications Drawer - Positioned in header */}
          <Box
            sx={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top) + 12px)',
              right: { xs: 16, sm: 20 },
              zIndex: theme.zIndex.appBar + 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <NotificationsDrawer />
          </Box>
          {/* Language Switcher - Positioned in header */}
          <Box
            sx={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top) + 12px)',
              right: { xs: 68, sm: 76 },
              zIndex: theme.zIndex.appBar + 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <LanguagePopover data={allLangs} />
          </Box>
        </Box>
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
