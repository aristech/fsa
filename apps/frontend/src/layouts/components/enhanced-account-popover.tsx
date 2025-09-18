import type { IconButtonProps } from '@mui/material/IconButton';

import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useRoleLabel } from 'src/hooks/use-role-label';
import { usePermissions } from 'src/hooks/use-permissions';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

import { useAuthContext } from 'src/auth/hooks';

import { AccountButton } from './account-button';
import { SignOutButton } from './sign-out-button';

// ----------------------------------------------------------------------

export type EnhancedAccountPopoverProps = IconButtonProps & {
  data?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
  }[];
};

export function EnhancedAccountPopover({ data = [], sx, ...other }: EnhancedAccountPopoverProps) {
  const pathname = usePathname();
  const { open, anchorEl, onClose, onOpen } = usePopover();
  const { user } = useAuthContext();
  const { label: roleLabel } = useRoleLabel(user?.role || undefined);
  const { permissions } = usePermissions();

  // role label is resolved dynamically from backend via hook

  const renderUserInfo = () => (
    <Card sx={{ m: 2, mb: 1 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={user?.avatar} alt={user?.firstName} sx={{ width: 48, height: 48 }}>
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
              {user?.firstName} {user?.lastName}
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
    <Box sx={{ px: 2, pb: 1 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        PERMISSIONS ({permissions.length})
      </Typography>

      <Box sx={{ mt: 1, maxHeight: 120, overflow: 'auto' }}>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {permissions.slice(0, 10).map((permission) => (
            <Chip
              key={permission}
              label={permission.split('.').pop()}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          ))}
          {permissions.length > 10 && (
            <Chip
              label={`+${permissions.length - 10} more`}
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

  const renderMenuActions = () => (
    <CustomPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      slotProps={{
        paper: { sx: { p: 0, width: 320, maxHeight: 600 } },
        arrow: { offset: 20 },
      }}
    >
      {renderUserInfo()}

      <Divider sx={{ borderStyle: 'dashed' }} />

      {renderPermissionsInfo()}

      <Divider sx={{ borderStyle: 'dashed' }} />

      <MenuList sx={{ p: 1, my: 1, '& li': { p: 0 } }}>
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
                  px: 1,
                  py: 0.75,
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

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box sx={{ p: 1 }}>
        <SignOutButton
          size="medium"
          variant="text"
          onClose={onClose}
          sx={{ display: 'block', textAlign: 'left' }}
        />
      </Box>
    </CustomPopover>
  );

  return (
    <>
      <AccountButton
        onClick={onOpen}
        photoURL={user?.avatar || ''}
        displayName={`${user?.firstName} ${user?.lastName}`}
        sx={sx}
        {...other}
      />

      {renderMenuActions()}
    </>
  );
}
