'use client';

import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';

import {
  Box,
  Fab,
  Tab,
  Card,
  Chip,
  List,
  Tabs,
  Alert,
  Badge,
  Stack,
  Avatar,
  Button,
  ListItem,
  IconButton,
  Typography,
  CardContent,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
} from '@mui/material';

import axiosInstance from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface Notification {
  _id: string;
  type: string;
  title: string;
  message?: string;
  category: 'task' | 'system' | 'reminder';
  relatedEntity: {
    entityType: 'task' | 'workorder' | 'project';
    entityId: string;
    entityTitle?: string;
  };
  metadata?: {
    taskId?: string;
    workOrderId?: string;
    projectId?: string;
    changes?: string[];
    assignerId?: string;
    reporterId?: string;
  };
  isRead: boolean;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface NotificationCounts {
  total: number;
  unread: number;
  task: number;
  system: number;
  reminder: number;
}

export default function FieldNotificationsPage() {
  // const _theme = useTheme();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({
    total: 0,
    unread: 0,
    task: 0,
    system: 0,
    reminder: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  // Fetch notifications based on selected tab
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);

      const params: any = {
        limit: 50,
        skip: 0,
        isArchived: false, // Don't show archived notifications
      };

      // Add filter based on selected tab
      if (selectedTab === 'unread') {
        params.isRead = false;
      }

      const [notificationsResponse, countsResponse] = await Promise.all([
        axiosInstance.get('/api/v1/notifications', { params }),
        axiosInstance.get('/api/v1/notifications/counts'),
      ]);

      if (notificationsResponse.data.success) {
        setNotifications(notificationsResponse.data.data);
      }

      if (countsResponse.data.success) {
        setCounts(countsResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [selectedTab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter notifications based on selected tab (for category filters only)
  // Note: 'all' and 'unread' are handled by the API query
  const filteredNotifications = notifications.filter((notification) => {
    if (selectedTab === 'all' || selectedTab === 'unread') return true;
    return notification.category === selectedTab;
  });

  // Mark notifications as read
  const markAsRead = async (notificationIds: string[]) => {
    try {
      await axiosInstance.put('/api/v1/notifications/mark-read', {
        notificationIds,
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notificationIds.includes(notification._id)
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // Update counts
      const readCount = notificationIds.filter((id) =>
        notifications.find((n) => n._id === id && !n.isRead)
      ).length;

      setCounts((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - readCount),
      }));

      toast.success(`${notificationIds.length} notification(s) marked as read`);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  // Archive notifications
  const archiveNotifications = async (notificationIds: string[]) => {
    try {
      await axiosInstance.put('/api/v1/notifications/archive', {
        notificationIds,
      });

      // Remove from local state
      setNotifications((prev) =>
        prev.filter((notification) => !notificationIds.includes(notification._id))
      );

      // Update counts
      const unreadArchivedCount = notificationIds.filter((id) =>
        notifications.find((n) => n._id === id && !n.isRead)
      ).length;

      setCounts((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - notificationIds.length),
        unread: Math.max(0, prev.unread - unreadArchivedCount),
      }));

      setSelectedNotifications([]);
      toast.success(`${notificationIds.length} notification(s) archived`);
    } catch (error) {
      console.error('Error archiving notifications:', error);
      toast.error('Failed to archive notifications');
    }
  };

  // Mark all as read (marks ALL notifications, not just loaded ones)
  const markAllAsRead = async () => {
    if (counts.unread === 0) {
      toast.info('All notifications are already read');
      return;
    }

    try {
      // Call API without notificationIds to mark ALL unread notifications as read
      await axiosInstance.put('/api/v1/notifications/mark-read', {});

      // Refresh notifications and counts
      await fetchNotifications();

      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Get notification icon
  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'task_created':
        return 'solar:add-circle-bold';
      case 'task_assigned':
        return 'solar:user-plus-bold';
      case 'task_updated':
        return 'solar:pen-bold';
      case 'task_completed':
        return 'solar:check-circle-bold';
      case 'task_deleted':
        return 'solar:trash-bin-minimalistic-bold';
      case 'time_logged':
        return 'solar:clock-circle-bold';
      case 'time_updated':
        return 'solar:history-bold';
      default:
        return 'solar:bell-bold';
    }
  };

  // Get notification color
  const getNotificationColor = (notification: Notification) => {
    switch (notification.type) {
      case 'task_created':
      case 'task_assigned':
        return 'success';
      case 'task_updated':
      case 'time_updated':
        return 'warning';
      case 'task_completed':
        return 'primary';
      case 'task_deleted':
        return 'error';
      case 'time_logged':
        return 'info';
      default:
        return 'default';
    }
  };

  // Handle notification selection
  const handleNotificationToggle = (notificationId: string) => {
    setSelectedNotifications((prev) =>
      prev.includes(notificationId)
        ? prev.filter((id) => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      await markAsRead([notification._id]);
    }

    // Show info about the notification
    toast.info(
      `Notification: ${notification.title}`
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Loading notifications...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 2 }}>
      {/* Header */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Notifications
            {counts.unread > 0 && (
              <Badge badgeContent={counts.unread} color="error" sx={{ ml: 2 }} />
            )}
          </Typography>
          {counts.unread > 0 && (
            <Button
              size="small"
              onClick={markAllAsRead}
              startIcon={<Iconify icon="solar:check-circle-bold" />}
            >
              Mark All Read
            </Button>
          )}
        </Box>

        {/* Stats Cards */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto' }}>
          <Card sx={{ minWidth: 120 }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="h4" color="primary">
                {counts.total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ minWidth: 120 }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="h4" color="error">
                {counts.unread}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Unread
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ minWidth: 120 }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="h4" color="success.main">
                {counts.task}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tasks
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        {/* Filter Tabs */}
        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All" value="all" />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Unread
                {counts.unread > 0 && <Chip size="small" label={counts.unread} color="error" />}
              </Box>
            }
            value="unread"
          />
          <Tab label="Tasks" value="task" />
          <Tab label="System" value="system" />
          <Tab label="Reminders" value="reminder" />
        </Tabs>
      </Box>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Alert severity="info">
            {selectedTab === 'unread' ? 'No unread notifications' : 'No notifications found'}
          </Alert>
        </Box>
      ) : (
        <List sx={{ pt: 0 }}>
          {filteredNotifications.map((notification) => (
            <ListItem
              key={notification._id}
              disablePadding
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: notification.isRead ? 'transparent' : 'action.hover',
              }}
            >
              <ListItemButton onClick={() => handleNotificationClick(notification)} sx={{ px: 2 }}>
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: `${getNotificationColor(notification)}.main`,
                      width: 40,
                      height: 40,
                    }}
                  >
                    <Iconify icon={getNotificationIcon(notification)} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: notification.isRead ? 'normal' : 'bold',
                          flex: 1,
                        }}
                      >
                        {notification.title}
                      </Typography>
                      {!notification.isRead && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      {notification.message && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {notification.message}
                        </Typography>
                      )}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Chip
                          label={
                            notification.relatedEntity.entityTitle ||
                            notification.relatedEntity.entityId
                          }
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNotificationToggle(notification._id);
                  }}
                  size="small"
                >
                  <Iconify
                    icon={
                      selectedNotifications.includes(notification._id)
                        ? 'solar:check-square-bold'
                        : 'solar:square-outline'
                    }
                  />
                </IconButton>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      {/* Floating Action Button for selected actions */}
      {selectedNotifications.length > 0 && (
        <Fab
          sx={{
            position: 'fixed',
            bottom: '100px', // Account for bottom navigation on all screen sizes
            right: '24px',
            bgcolor: 'primary.main',
          }}
          onClick={() => archiveNotifications(selectedNotifications)}
        >
          <Badge badgeContent={selectedNotifications.length} color="error">
            <Iconify icon="solar:archive-bold" />
          </Badge>
        </Fab>
      )}
    </Box>
  );
}
