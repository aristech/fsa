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
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { getNotifications, getNotificationCounts, markNotificationsAsRead } from 'src/actions/notifications';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { varTap, varHover, transitionTap } from 'src/components/animate';

import { transformNotification } from 'src/types/notification';

import { NotificationItem } from './notification-item';

// ----------------------------------------------------------------------

export type NotificationsDrawerProps = IconButtonProps;

export function NotificationsDrawer({ sx, ...other }: NotificationsDrawerProps) {
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const [currentTab, setCurrentTab] = useState('all');
  const [notifications, setNotifications] = useState<NotificationItemProps['notification'][]>([]);
  const [counts, setCounts] = useState({ total: 0, unread: 0, archived: 0 });
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async (tab: string = currentTab) => {
    try {
      setLoading(true);
      let filters = {};

      if (tab === 'unread') {
        filters = { isRead: false, isArchived: false };
      } else if (tab === 'archived') {
        filters = { isArchived: true };
      } else {
        filters = { isArchived: false };
      }

      const response = await getNotifications(filters);
      const transformedNotifications = response.data.map(transformNotification);
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [currentTab]);

  const loadCounts = useCallback(async () => {
    try {
      const response = await getNotificationCounts();
      setCounts(response.data);
    } catch (error) {
      console.error('Failed to load notification counts:', error);
    }
  }, []);

  const handleChangeTab = useCallback((event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
    loadNotifications(newValue);
  }, [loadNotifications]);

  useEffect(() => {
    if (open) {
      loadNotifications();
      loadCounts();
    }
  }, [open, loadNotifications, loadCounts]);

  const TABS = [
    { value: 'all', label: 'All', count: counts.total },
    { value: 'unread', label: 'Unread', count: counts.unread },
    { value: 'archived', label: 'Archived', count: counts.archived },
  ];

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markNotificationsAsRead();
      // Refresh notifications and counts
      await loadNotifications();
      await loadCounts();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  }, [loadNotifications, loadCounts]);

  // Auto-refresh notifications every 30 seconds when drawer is open
  useEffect(() => {
    if (!open) return undefined;

    const interval = setInterval(() => {
      loadCounts(); // Refresh badge count
      if (currentTab === 'unread') {
        loadNotifications(); // Only refresh list if viewing unread
      }
    }, 30000); // 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [open, currentTab, loadCounts, loadNotifications]);

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
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Notifications
      </Typography>

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
              color={
                (tab.value === 'unread' && 'info') ||
                (tab.value === 'archived' && 'success') ||
                'default'
              }
            >
              {tab.count}
            </Label>
          }
        />
      ))}
    </Tabs>
  );

  const renderList = () => (
    <Scrollbar>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No notifications
          </Typography>
        </Box>
      ) : (
        <Box component="ul">
          {notifications.map((notification) => (
            <Box component="li" key={notification.id} sx={{ display: 'flex' }}>
              <NotificationItem notification={notification} />
            </Box>
          ))}
        </Box>
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
          paper: { sx: { width: 1, maxWidth: 420 } },
        }}
      >
        {renderHead()}
        {renderTabs()}
        {renderList()}

        <Box sx={{ p: 1 }}>
          <Button fullWidth size="large">
            View all
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
