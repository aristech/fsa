'use client';

import type { Theme, SxProps } from '@mui/material/styles';
import type { ButtonBaseProps } from '@mui/material/ButtonBase';

import { usePopover } from 'minimal-shared/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Button, { buttonClasses } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import axios from 'src/lib/axios';
import { useClient, type Client } from 'src/contexts/client-context';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export type ClientsPopoverProps = ButtonBaseProps & {
  sx?: SxProps<Theme>;
};

// ----------------------------------------------------------------------

export function ClientsPopover({ sx, ...other }: ClientsPopoverProps) {
  const mediaQuery = 'sm';
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedClient, setSelectedClient } = useClient();
  const { open, anchorEl, onClose, onOpen } = usePopover();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch clients from API
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/v1/clients?limit=50');
      if (response.data.success) {
        const clientData = response.data.data.clients.map((client: any) => ({
          _id: client._id,
          name: client.name,
          email: client.email,
          company: client.company,
          logo:
            client.logo ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=random`,
        }));
        setClients(clientData);
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch clients when popover opens
  useEffect(() => {
    if (open && clients.length === 0) {
      fetchClients();
    }
  }, [open, clients.length, fetchClients]);

  // Clear search when popover closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  // Focus search input when popover opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      // Small delay to ensure the popover is fully rendered
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  // Filter clients based on search query with locale-aware comparison
  const filteredClients = clients
    .filter((client) => {
      if (!searchQuery.trim()) return true;

      // Use locale-aware string comparison for Greek characters
      const normalizeString = (str: string) =>
        str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

      const query = normalizeString(searchQuery);
      return (
        normalizeString(client.name).includes(query) ||
        (client.company && normalizeString(client.company).includes(query)) ||
        (client.email && normalizeString(client.email).includes(query))
      );
    })
    .sort((a, b) =>
      // Sort alphabetically by name, case-insensitive
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

  // Synchronize client context with URL parameters
  useEffect(() => {
    const clientIdFromUrl = searchParams.get('clientId');

    if (clientIdFromUrl && clients.length > 0) {
      // Find the client from the fetched clients list
      const clientFromUrl = clients.find((client) => client._id === clientIdFromUrl);
      if (clientFromUrl && (!selectedClient || selectedClient._id !== clientIdFromUrl)) {
        setSelectedClient(clientFromUrl);
      }
    } else if (!clientIdFromUrl && selectedClient) {
      // Clear selection if no clientId in URL
      setSelectedClient(null);
    }
  }, [searchParams, clients, selectedClient, setSelectedClient]);

  const handleChangeClient = useCallback(
    (client: Client) => {
      setSelectedClient(client);
      // Update URL with clientId parameter
      const url = new URL(window.location.href);
      url.searchParams.set('clientId', client._id);
      router.push(url.pathname + url.search);
      onClose();
    },
    [setSelectedClient, router, onClose]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedClient(null);
    // Remove clientId parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('clientId');
    router.push(url.pathname + url.search);
    onClose();
  }, [setSelectedClient, router, onClose]);

  const buttonBg: SxProps<Theme> = {
    height: 1,
    zIndex: -1,
    opacity: 0,
    content: "''",
    borderRadius: 1,
    position: 'absolute',
    visibility: 'hidden',
    bgcolor: 'action.hover',
    width: 'calc(100% + 8px)',
    transition: (theme) =>
      theme.transitions.create(['opacity', 'visibility'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.shorter,
      }),
    ...(open && {
      opacity: 1,
      visibility: 'visible',
    }),
  };

  const renderButton = () => (
    <ButtonBase
      disableRipple
      onClick={onOpen}
      sx={[
        {
          py: 0.5,
          gap: { xs: 0.5, [mediaQuery]: 1 },
          '&::before': buttonBg,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        component="img"
        alt={selectedClient?.name || 'All Clients'}
        src={selectedClient?.logo || 'https://ui-avatars.com/api/?name=All&background=random'}
        sx={{ width: 24, height: 24, borderRadius: '50%' }}
      />

      <Box
        component="span"
        sx={{ typography: 'subtitle2', display: { xs: 'none', [mediaQuery]: 'inline-flex' } }}
      >
        {selectedClient?.name || 'All Clients'}
      </Box>

      <Label
        color={selectedClient ? 'info' : 'default'}
        sx={{
          height: 22,
          cursor: 'inherit',
          display: { xs: 'none', [mediaQuery]: 'inline-flex' },
        }}
      >
        {selectedClient ? 'Filtered' : 'All'}
      </Label>

      <Iconify width={16} icon="carbon:chevron-sort" sx={{ color: 'text.disabled' }} />
    </ButtonBase>
  );

  const renderMenuList = () => (
    <CustomPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      slotProps={{
        arrow: { placement: 'top-left' },
        paper: { sx: { mt: 0.5, ml: -1.55, width: 280 } },
      }}
    >
      {/* Search Input */}
      <Box sx={{ p: 2, pb: 1 }}>
        <TextField
          ref={searchInputRef}
          fullWidth
          size="small"
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" width={20} sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'divider',
              },
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        />
      </Box>

      <Divider />

      <Scrollbar sx={{ maxHeight: 320 }}>
        <MenuList>
          {/* All Clients Option */}
          <MenuItem selected={!selectedClient} onClick={handleClearSelection} sx={{ height: 48 }}>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <Iconify icon="solar:users-group-rounded-bold" width={16} />
            </Avatar>

            <Typography
              noWrap
              component="span"
              variant="body2"
              sx={{ flexGrow: 1, fontWeight: 'fontWeightMedium' }}
            >
              All Clients
            </Typography>

            <Label color="default">All</Label>
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          {/* Loading State */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}

          {/* Error State */}
          {error && (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="error">
                {error}
              </Typography>
            </Box>
          )}

          {/* Client List */}
          {!loading &&
            !error &&
            filteredClients.map((client) => (
              <MenuItem
                key={client._id}
                selected={client._id === selectedClient?._id}
                onClick={() => handleChangeClient(client)}
                sx={{ height: 48 }}
              >
                <Avatar alt={client.name} src={client.logo} sx={{ width: 24, height: 24 }} />

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    noWrap
                    component="span"
                    variant="body2"
                    sx={{ fontWeight: 'fontWeightMedium', display: 'block' }}
                  >
                    {client.name}
                  </Typography>
                  {client.company && (
                    <Typography
                      noWrap
                      component="span"
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block' }}
                    >
                      {client.company}
                    </Typography>
                  )}
                </Box>

                <Label color="info">Client</Label>
              </MenuItem>
            ))}

          {/* Empty State */}
          {!loading && !error && clients.length === 0 && (
            <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No clients found
              </Typography>
            </Box>
          )}

          {/* No Search Results */}
          {!loading &&
            !error &&
            clients.length > 0 &&
            filteredClients.length === 0 &&
            searchQuery.trim() && (
              <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No clients match &ldquo;{searchQuery}&rdquo;
                </Typography>
              </Box>
            )}
        </MenuList>
      </Scrollbar>

      <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />

      <Button
        fullWidth
        startIcon={<Iconify width={18} icon="mingcute:add-line" />}
        onClick={() => {
          onClose();
          router.push('/dashboard/clients/new/');
        }}
        sx={{
          gap: 2,
          justifyContent: 'flex-start',
          fontWeight: 'fontWeightMedium',
          [`& .${buttonClasses.startIcon}`]: {
            m: 0,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        }}
      >
        Add Client
      </Button>
    </CustomPopover>
  );

  return (
    <>
      {renderButton()}
      {renderMenuList()}
    </>
  );
}
