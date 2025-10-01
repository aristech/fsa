'use client';

import type { LinkProps } from '@mui/material/Link';

import { mergeClasses } from 'minimal-shared/utils';

import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import { styled } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { safeDisplayText } from 'src/utils/html-utils';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

import { Logo } from './logo';
import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export type TenantLogoProps = LinkProps & {
  isSingle?: boolean;
  disabled?: boolean;
};

export function TenantLogo({
  sx,
  disabled,
  className,
  href = '/',
  isSingle = true,
  ...other
}: TenantLogoProps) {
  const { tenant } = useAuthContext();
  const hasCustomLogo = tenant?.branding?.logoUrl;

  // If tenant has custom logo, use it
  if (hasCustomLogo) {
    return (
      <TenantLogoRoot
        component={RouterLink}
        href={href}
        aria-label="Company Logo"
        underline="none"
        className={mergeClasses([logoClasses.root, className])}
        sx={[
          {
            width: 40,
            height: 40,
            ...(!isSingle && { width: 102, height: 36 }),
            ...(disabled && { pointerEvents: 'none' }),
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        <Avatar
          src={tenant.branding?.logoUrl}
          alt={`${safeDisplayText(tenant?.name) || 'Company'} Logo`}
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: isSingle ? '8px' : '4px',
            '& img': {
              objectFit: 'contain',
            },
          }}
          variant="rounded"
        />
      </TenantLogoRoot>
    );
  }

  // Fall back to default logo
  return <Logo sx={sx} disabled={disabled} className={className} href={href} isSingle={isSingle} {...other} />;
}

// ----------------------------------------------------------------------

const TenantLogoRoot = styled(Link)(() => ({
  flexShrink: 0,
  color: 'transparent',
  display: 'inline-flex',
  verticalAlign: 'middle',
}));