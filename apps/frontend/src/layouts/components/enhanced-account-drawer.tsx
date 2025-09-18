'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import { useMemo } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { PERMISSIONS } from 'src/hooks/use-permissions';
import { useRoleLabel } from 'src/hooks/use-role-label';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { AnimateBorder } from 'src/components/animate';

import { useAuthContext } from 'src/auth/hooks';

import { UpgradeBlock } from './nav-upgrade';
import { SignOutButton } from './sign-out-button';

// ----------------------------------------------------------------------

export type EnhancedAccountDrawerProps = IconButtonProps & {
  data?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
  }[];
};

// Role label is resolved dynamically from backend via hook

export function EnhancedAccountDrawer({ data = [], sx, ...other }: EnhancedAccountDrawerProps) {
  const pathname = usePathname();
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();
  const { user } = useAuthContext();
  const { label: roleLabel } = useRoleLabel(user?.role || undefined);

  // Get permissions based on the user we're using
  const permissions = useMemo(() => {
    // If user is tenant owner, grant all permissions
    if (user?.isTenantOwner) {
      return Object.values(PERMISSIONS);
    }

    // If user has permissions, use them
    if (user?.permissions) {
      return user.permissions;
    }

    // For admin role, grant all permissions
    if (user?.role === 'admin') {
      return Object.values(PERMISSIONS);
    }

    // Default to empty array
    return [];
  }, [user]);

  // Handle both real user data and mocked user data
  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || 'User';

  const avatar = user?.avatar || user?.avatar;
  const firstName = user?.firstName || user?.firstName?.split(' ')[0] || 'User';
  const lastName = user?.lastName || user?.firstName?.split(' ')[1] || '';

  const renderUserInfo = () => (
    <Card sx={{ m: 2, mb: 1 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={avatar} alt={firstName} sx={{ width: 56, height: 56 }}>
            {firstName?.[0]}
            {lastName?.[0]}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
              {displayName}
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              {user?.email}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip label={roleLabel} size="small" color="primary" variant="outlined" />

              {user?.isTenantOwner && (
                <Chip
                  label="Owner"
                  size="small"
                  color="success"
                  variant="filled"
                  icon={<Iconify icon="solar:crown-bold" width={12} />}
                />
              )}
            </Stack>
          </Box>
        </Stack>

        {user?.phone && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon="solar:phone-bold" width={16} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {user.phone}
              </Typography>
            </Stack>
          </Box>
        )}

        {user?.lastLoginAt && (
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon="solar:clock-circle-bold" width={16} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
              </Typography>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderPermissionsInfo = () => (
    <Box sx={{ px: 2, pb: 2 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        PERMISSIONS ({permissions?.length || 0})
      </Typography>

      <Box sx={{ mt: 1, maxHeight: 150, overflow: 'auto' }}>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {permissions?.slice(0, 15).map((permission) => (
            <Chip
              key={permission}
              label={permission.split('.').pop()}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          ))}
          {permissions && permissions.length > 15 && (
            <Chip
              label={`+${permissions.length - 15} more`}
              size="small"
              variant="outlined"
              color="secondary"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
        </Stack>
      </Box>
    </Box>
  );

  const renderList = () => (
    <MenuList
      disablePadding
      sx={[
        (theme) => ({
          px: 1,
          py: 0.5,
          '& .MuiMenuItem-root': {
            borderRadius: 1,
            typography: 'body2',
            color: 'text.secondary',
            '&:hover': {
              bgcolor: varAlpha(theme.vars?.palette.grey['500Channel'] || '0 0 0', 0.08),
              color: 'text.primary',
            },
          },
          '& li': { p: 0 },
        }),
      ]}
    >
      {data.map((option) => {
        const rootLabel = pathname.includes('/dashboard') ? 'Home' : 'Dashboard';
        const rootHref = pathname.includes('/dashboard') ? '/' : paths.dashboard.root;

        return (
          <MenuItem key={option.label}>
            <Link
              component={RouterLink}
              href={option.label === 'Home' ? rootHref : option.href}
              color="inherit"
              underline="none"
              onClick={onClose}
              sx={{
                p: 1,
                width: 1,
                display: 'flex',
                typography: 'body2',
                alignItems: 'center',
                color: 'text.secondary',
                '& svg': { width: 24, height: 24 },
                '&:hover': { color: 'text.primary' },
              }}
            >
              {option.icon}

              <Box component="span" sx={{ ml: 2 }}>
                {option.label === 'Home' ? rootLabel : option.label}
              </Box>

              {option.info && (
                <Label color="error" sx={{ ml: 1 }}>
                  {option.info}
                </Label>
              )}
            </Link>
          </MenuItem>
        );
      })}
    </MenuList>
  );

  return (
    <>
      <Tooltip title="Account">
        <IconButton
          onClick={onOpen}
          sx={[
            (theme) => ({
              bgcolor: varAlpha(theme.vars?.palette.grey['500Channel'] || '0 0 0', 0.08),
              '&:hover': {
                bgcolor: varAlpha(theme.vars?.palette.grey['500Channel'] || '0 0 0', 0.12),
              },
            }),
            ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
          ]}
          {...other}
        >
          <AnimateBorder
            sx={{
              width: 1,
              height: 1,
              borderRadius: 1,
              border: (theme) => `solid 1px ${theme.palette.divider}`,
            }}
          >
            <Avatar src={avatar} alt={firstName} sx={{ width: 32, height: 32 }}>
              {firstName?.[0]}
              {lastName?.[0]}
            </Avatar>
          </AnimateBorder>
        </IconButton>
      </Tooltip>

      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        slotProps={{
          backdrop: { invisible: true },
        }}
        PaperProps={{
          sx: {
            width: 360,
            bgcolor: 'background.default',
          },
        }}
      >
        <Scrollbar sx={{ height: 1 }}>
          <Box sx={{ p: 0 }}>
            {renderUserInfo()}

            <Divider sx={{ borderStyle: 'dashed' }} />

            {renderPermissionsInfo()}

            <Divider sx={{ borderStyle: 'dashed' }} />

            {renderList()}

            <Box sx={{ p: 1 }}>
              <SignOutButton
                size="medium"
                variant="text"
                onClose={onClose}
                sx={{ display: 'block', textAlign: 'left' }}
              />
            </Box>

            <UpgradeBlock />
          </Box>
        </Scrollbar>
      </Drawer>
    </>
  );
}
