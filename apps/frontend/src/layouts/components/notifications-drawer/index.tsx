'use client';

import type { IconButtonProps } from '@mui/material/IconButton';
import type { NotificationItemProps } from './notification-item';

import { m } from 'framer-motion';
import { useBoolean } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { useNotificationsContext } from 'src/contexts/notifications-context';
import { getNotifications, deleteAllNotifications, markNotificationsAsRead } from 'src/actions/notifications';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { varTap, varHover, transitionTap } from 'src/components/animate';

import { transformNotification } from 'src/types/notification';

import { NotificationItem } from './notification-item';

// ----------------------------------------------------------------------
// TODO fix notifications drawer
export type NotificationsDrawerProps = IconButtonProps;

export function NotificationsDrawer({ sx, ...other }: NotificationsDrawerProps) {
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();
  const confirmDeleteDialog = useBoolean();

  const [currentTab, setCurrentTab] = useState('all');
  const [notifications, setNotifications] = useState<NotificationItemProps['notification'][]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const LIMIT = 20;

  // Use the notifications context
  const { counts, isConnected, refreshCounts, setUnreadCount } = useNotificationsContext();

  const loadNotifications = useCallback(
    async (tab: string = currentTab, reset: boolean = true) => {
      try {
        if (reset) {
          setLoading(true);
          setSkip(0);
        } else {
          setLoadingMore(true);
        }

        let filters: any = {
          limit: LIMIT,
          skip: reset ? 0 : skip,
        };

        if (tab === 'unread') {
          filters = { ...filters, isRead: false, isArchived: false };
        } else {
          // Remove archived tab - only show non-archived
          filters = { ...filters, isArchived: false };
        }

        const response = await getNotifications(filters);
        const transformedNotifications = response.data.map(transformNotification);

        if (reset) {
          setNotifications(transformedNotifications);
        } else {
          setNotifications((prev) => [...prev, ...transformedNotifications]);
        }

        setHasMore(response.pagination.hasMore);
        setSkip(reset ? LIMIT : skip + LIMIT);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [currentTab, skip, LIMIT]
  );

  const handleChangeTab = useCallback(
    (event: React.SyntheticEvent, newValue: string) => {
      setCurrentTab(newValue);
      setSearchQuery(''); // Clear search when changing tabs
      loadNotifications(newValue, true);
    },
    [loadNotifications]
  );

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadNotifications(currentTab, false);
    }
  }, [loadNotifications, loadingMore, hasMore, currentTab]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.target as HTMLDivElement;
      const scrolledToBottom =
        target.scrollHeight - target.scrollTop <= target.clientHeight + 100;

      if (scrolledToBottom && hasMore && !loadingMore) {
        handleLoadMore();
      }
    },
    [hasMore, loadingMore, handleLoadMore]
  );

  useEffect(() => {
    if (open) {
      loadNotifications(currentTab, true);
      refreshCounts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Handle search with debounce
  useEffect(() => {
    if (!open) return undefined;

    const timeoutId = setTimeout(() => {
      // Trigger search by reloading notifications
      loadNotifications(currentTab, true);
    }, 300);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, open]);

  const TABS = [
    { value: 'all', label: 'All', count: counts.total },
    { value: 'unread', label: 'Unread', count: counts.unread },
  ];

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      // Optimistically update the badge to 0 immediately
      setUnreadCount(0);

      // Then make the API call
      await markNotificationsAsRead();

      // Refresh notifications and counts to ensure consistency
      await loadNotifications();
      await refreshCounts();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      // If there's an error, refresh to get the correct count
      await refreshCounts();
    }
  }, [loadNotifications, refreshCounts, setUnreadCount]);

  const handleDeleteAll = useCallback(async () => {
    try {
      await deleteAllNotifications();

      // Clear local state
      setNotifications([]);
      setUnreadCount(0);

      // Refresh counts
      await refreshCounts();

      // Close the confirmation dialog
      confirmDeleteDialog.onFalse();
    } catch (error) {
      console.error('Failed to delete notifications:', error);
    }
  }, [refreshCounts, setUnreadCount, confirmDeleteDialog]);

  const totalUnRead = counts.unread;

  const renderHead = () => (
    <Box
      sx={{
        py: 2,
        pr: 1,
        pl: 2.5,
        minHeight: 68,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
        <Typography variant="h6">Notifications</Typography>
        {isConnected && (
          <Tooltip title="Real-time updates active">
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'success.main',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
          </Tooltip>
        )}
      </Box>

      {!!totalUnRead && (
        <Tooltip title="Mark all as read">
          <IconButton color="primary" onClick={handleMarkAllAsRead}>
            <Iconify icon="eva:done-all-fill" />
          </IconButton>
        </Tooltip>
      )}

      <IconButton onClick={onClose} sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
        <Iconify icon="mingcute:close-line" />
      </IconButton>

      <IconButton>
        <Iconify icon="solar:settings-bold-duotone" />
      </IconButton>
    </Box>
  );

  const renderSearch = () => (
    <Box sx={{ px: 2.5, pb: 2 }}>
      <TextField
        fullWidth
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search notifications..."
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
          ...(searchQuery && {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')} edge="end">
                  <Iconify icon="eva:close-fill" />
                </IconButton>
              </InputAdornment>
            ),
          }),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'divider',
            },
          },
        }}
      />
    </Box>
  );

  const renderTabs = () => (
    <Tabs variant="fullWidth" value={currentTab} onChange={handleChangeTab} indicatorColor="custom">
      {TABS.map((tab) => (
        <Tab
          key={tab.value}
          iconPosition="end"
          value={tab.value}
          label={tab.label}
          icon={
            <Label
              variant={((tab.value === 'all' || tab.value === currentTab) && 'filled') || 'soft'}
              color={(tab.value === 'unread' && 'info') || 'default'}
            >
              {tab.count}
            </Label>
          }
        />
      ))}
    </Tabs>
  );

  // Filter notifications by search query
  const filteredNotifications = searchQuery
    ? notifications.filter(
        (notification) =>
          notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          notification.message?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notifications;

  const renderList = () => (
    <Scrollbar
      sx={{ height: 1 }}
      scrollableNodeProps={{
        onScroll: handleScroll,
      }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : filteredNotifications.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            {searchQuery ? 'No notifications found' : 'No notifications'}
          </Typography>
        </Box>
      ) : (
        <>
          <Box component="ul">
            {filteredNotifications.map((notification) => (
              <Box component="li" key={notification.id} sx={{ display: 'flex' }}>
                <NotificationItem notification={notification} />
              </Box>
            ))}
          </Box>
          {loadingMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}
          {!loadingMore && hasMore && !searchQuery && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
              <Button size="small" onClick={handleLoadMore}>
                Load more
              </Button>
            </Box>
          )}
        </>
      )}
    </Scrollbar>
  );

  return (
    <>
      <IconButton
        component={m.button}
        whileTap={varTap(0.96)}
        whileHover={varHover(1.04)}
        transition={transitionTap()}
        aria-label="Notifications button"
        onClick={onOpen}
        sx={sx}
        {...other}
      >
        <Badge badgeContent={totalUnRead} color="error">
          <Iconify width={24} icon="solar:bell-bing-bold-duotone" />
        </Badge>
      </IconButton>

      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        slotProps={{
          backdrop: { invisible: true },
          paper: { sx: { width: 1, maxWidth: 420, display: 'flex', flexDirection: 'column' } },
        }}
      >
        {renderHead()}
        {renderTabs()}
        {renderSearch()}
        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderList()}
        </Box>

        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
          <Button
            fullWidth
            size="large"
            color="error"
            variant="soft"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={confirmDeleteDialog.onTrue}
            disabled={notifications.length === 0}
          >
            Delete All
          </Button>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={confirmDeleteDialog.value}
        onClose={confirmDeleteDialog.onFalse}
        title="Delete All Notifications"
        content="Are you sure you want to delete all notifications? This action cannot be undone."
        action={
          <Button variant="contained" color="error" onClick={handleDeleteAll}>
            Delete All
          </Button>
        }
      />
    </>
  );
}
