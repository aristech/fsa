import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import SvgIcon from '@mui/material/SvgIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';

import { fToNow } from 'src/utils/format-time';

import { markNotificationsAsRead } from 'src/actions/notifications';

import { Label } from 'src/components/label';
import { FileThumbnail } from 'src/components/file-thumbnail';

import { notificationIcons } from './icons';

// ----------------------------------------------------------------------

export type NotificationItemProps = {
  notification: {
    id: string;
    type: string;
    title: string;
    category: string;
    isUnRead: boolean;
    avatarUrl: string | null;
    createdAt: string | number | null;
    message?: string;
    relatedEntity?: {
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
  };
};

const readerContent = (data: string) => {
  if (!data) {
    return <span>No title</span>;
  }
  
  // Check if data contains HTML tags, if not, render as plain text
  const hasHtmlTags = /<[^>]*>/.test(data);
  
  if (hasHtmlTags) {
    return (
      <Box
        dangerouslySetInnerHTML={{ __html: data }}
        sx={{
          '& p': { m: 0, typography: 'body2' },
          '& a': { color: 'inherit', textDecoration: 'none' },
          '& strong': { typography: 'subtitle2' },
        }}
      />
    );
  }
  
  return <span>{data}</span>;
};

const renderIcon = (type: string) =>
  ({
    task_created: notificationIcons.delivery,
    task_updated: notificationIcons.order,
    task_assigned: notificationIcons.order,
    task_completed: notificationIcons.delivery,
    task_deleted: notificationIcons.mail,
    time_logged: notificationIcons.chat,
    time_updated: notificationIcons.chat,
    order: notificationIcons.order,
    chat: notificationIcons.chat,
    mail: notificationIcons.mail,
    delivery: notificationIcons.delivery,
  })[type] || notificationIcons.order;

const getCategoryLabel = (category: string, type: string) => {
  if (type.startsWith('task_')) {
    switch (type) {
      case 'task_created': return 'Task Created';
      case 'task_updated': return 'Task Updated';
      case 'task_assigned': return 'Task Assigned';
      case 'task_completed': return 'Task Completed';
      case 'task_deleted': return 'Task Deleted';
      default: return 'Task';
    }
  }
  if (type.startsWith('time_')) {
    switch (type) {
      case 'time_logged': return 'Time Logged';
      case 'time_updated': return 'Time Updated';
      default: return 'Time Entry';
    }
  }
  return category.charAt(0).toUpperCase() + category.slice(1);
};

export function NotificationItem({ notification }: NotificationItemProps) {

  const handleNotificationClick = async () => {
    try {
      // Mark this notification as read if it's unread
      if (notification.isUnRead) {
        await markNotificationsAsRead([notification.id]);
      }
      
      // TODO: Add navigation to the related entity (task, work order, etc.)
      // For now, we'll just mark it as read
      console.log('Notification clicked:', notification);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };
  const renderAvatar = () => (
    <ListItemAvatar>
      {notification.avatarUrl ? (
        <Avatar src={notification.avatarUrl} sx={{ bgcolor: 'background.neutral' }} />
      ) : (
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'flex',
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.neutral',
          }}
        >
          <SvgIcon sx={{ width: 24, height: 24 }}>{renderIcon(notification.type)}</SvgIcon>
        </Box>
      )}
    </ListItemAvatar>
  );

  const renderText = () => (
    <ListItemText
      primary={readerContent(notification.title || 'Notification')}
      secondary={
        <>
          {notification.message && (
            <Box component="p" sx={{ mt: 0.5, mb: 1, typography: 'body2', color: 'text.secondary' }}>
              {notification.message}
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, typography: 'caption', color: 'text.disabled' }}>
            {notification.createdAt ? fToNow(notification.createdAt) : 'Unknown time'}
            <Box
              component="span"
              sx={{ width: 2, height: 2, borderRadius: '50%', bgcolor: 'currentColor' }}
            />
            {getCategoryLabel(notification.category || 'system', notification.type || 'unknown')}
            {notification.relatedEntity?.entityTitle && (
              <>
                <Box
                  component="span"
                  sx={{ width: 2, height: 2, borderRadius: '50%', bgcolor: 'currentColor' }}
                />
                {notification.relatedEntity.entityTitle}
              </>
            )}
          </Box>
        </>
      }
      slotProps={{
        primary: {
          sx: { mb: 0.5 },
        },
        secondary: {
          sx: {
            '& p': { m: 0 },
          },
        },
      }}
    />
  );

  const renderUnReadBadge = () =>
    notification.isUnRead && (
      <Box
        sx={{
          top: 26,
          width: 8,
          height: 8,
          right: 20,
          borderRadius: '50%',
          bgcolor: 'info.main',
          position: 'absolute',
        }}
      />
    );

  const renderFriendAction = () => (
    <Box sx={{ gap: 1, mt: 1.5, display: 'flex' }}>
      <Button size="small" variant="contained">
        Accept
      </Button>
      <Button size="small" variant="outlined">
        Decline
      </Button>
    </Box>
  );

  const renderProjectAction = () => (
    <>
      <Box
        sx={{
          p: 1.5,
          my: 1.5,
          borderRadius: 1.5,
          color: 'text.secondary',
          bgcolor: 'background.neutral',
        }}
      >
        {readerContent(
          `<p><strong>@Jaydon Frankie</strong> feedback by asking questions or just leave a note of appreciation.</p>`
        )}
      </Box>

      <Button size="small" variant="contained" sx={{ alignSelf: 'flex-start' }}>
        Reply
      </Button>
    </>
  );

  const renderFileAction = () => (
    <Box
      sx={(theme) => ({
        p: theme.spacing(1.5, 1.5, 1.5, 1),
        gap: 1,
        mt: 1.5,
        display: 'flex',
        borderRadius: 1.5,
        bgcolor: 'background.neutral',
      })}
    >
      <FileThumbnail file="http://localhost:8080/httpsdesign-suriname-2015.mp3" />

      <ListItemText
        primary="design-suriname-2015.mp3 design-suriname-2015.mp3"
        secondary="2.3 Mb"
        slotProps={{
          primary: {
            noWrap: true,
            sx: (theme) => ({
              color: 'text.secondary',
              fontSize: theme.typography.pxToRem(13),
            }),
          },
          secondary: {
            sx: {
              mt: 0.25,
              typography: 'caption',
              color: 'text.disabled',
            },
          },
        }}
      />

      <Button size="small" variant="outlined" sx={{ flexShrink: 0 }}>
        Download
      </Button>
    </Box>
  );

  const renderTagsAction = () => (
    <Box
      sx={{
        mt: 1.5,
        gap: 0.75,
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      <Label variant="outlined" color="info">
        Design
      </Label>
      <Label variant="outlined" color="warning">
        Dashboard
      </Label>
      <Label variant="outlined">Design system</Label>
    </Box>
  );

  const renderPaymentAction = () => (
    <Box sx={{ gap: 1, mt: 1.5, display: 'flex' }}>
      <Button size="small" variant="contained">
        Pay
      </Button>
      <Button size="small" variant="outlined">
        Decline
      </Button>
    </Box>
  );

  return (
    <ListItemButton
      disableRipple
      onClick={handleNotificationClick}
      sx={[
        (theme) => ({
          p: 2.5,
          alignItems: 'flex-start',
          borderBottom: `dashed 1px ${theme.vars.palette.divider}`,
          ...(notification.isUnRead && {
            bgcolor: 'action.selected',
          }),
        }),
      ]}
    >
      {renderUnReadBadge()}
      {renderAvatar()}

      <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
        {renderText()}
        {/* Task-related notifications don't need special actions - clicking navigates to the task */}
        {notification.type === 'friend' && renderFriendAction()}
        {notification.type === 'project' && renderProjectAction()}
        {notification.type === 'file' && renderFileAction()}
        {notification.type === 'tags' && renderTagsAction()}
        {notification.type === 'payment' && renderPaymentAction()}
      </Box>
    </ListItemButton>
  );
}
