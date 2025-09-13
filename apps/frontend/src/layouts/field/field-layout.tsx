'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Box, Container, useTheme } from '@mui/material';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { CalendarToday, Assignment, Inventory, Notifications, Person } from '@mui/icons-material';
import { useAuth } from '@/auth/context/auth-provider';

interface FieldLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { label: 'Calendar', icon: CalendarToday, path: '/field' },
  { label: 'Tasks', icon: Assignment, path: '/field/tasks' },
  { label: 'Materials', icon: Inventory, path: '/field/materials' },
  { label: 'Notifications', icon: Notifications, path: '/field/notifications' },
  { label: 'Profile', icon: Person, path: '/field/profile' },
];

export function FieldLayout({ children }: FieldLayoutProps) {
  const theme = useTheme();
  const pathname = usePathname();
  const { user } = useAuth();
  const [value, setValue] = useState(0);

  // Find current navigation index based on pathname
  const currentIndex = navigationItems.findIndex(
    (item) => pathname === item.path || pathname.startsWith(item.path + '/')
  );

  const handleNavigationChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    // Navigation will be handled by Next.js Link components
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        // Mobile-first design
        paddingBottom: { xs: '80px', sm: '0px' }, // Space for bottom navigation on mobile
      }}
    >
      {/* Header */}
      <Paper
        elevation={1}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: theme.zIndex.appBar,
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          padding: { xs: 2, sm: 3 },
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <h1
                style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: 600,
                }}
              >
                Field Operations
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  opacity: 0.8,
                }}
              >
                Welcome, {user?.name || 'Field Operator'}
              </p>
            </Box>

            {/* Environment switcher for users with both access */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              {/* Will be implemented later */}
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          padding: { xs: 2, sm: 3 },
        }}
      >
        <Container maxWidth="lg">{children}</Container>
      </Box>

      {/* Bottom Navigation (Mobile) */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.appBar,
          display: { xs: 'block', sm: 'none' },
        }}
        elevation={3}
      >
        <BottomNavigation
          value={currentIndex >= 0 ? currentIndex : 0}
          onChange={handleNavigationChange}
          showLabels
          sx={{
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              padding: '6px 0',
              '&.Mui-selected': {
                color: theme.palette.primary.main,
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.75rem',
              marginTop: '4px',
            },
          }}
        >
          {navigationItems.map((item, index) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={<item.icon />}
              href={item.path}
              component="a"
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
