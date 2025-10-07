import { memo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import {
  useTaskTimeSession,
  useSessionDuration,
  formatDurationHuman,
  type ActiveTimeSession,
} from 'src/hooks/use-time-tracking';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface TimeTrackingIndicatorProps {
  taskId: string;
  variant?: 'compact' | 'full' | 'chip';
  showPersonnel?: boolean;
  showDuration?: boolean;
}

export const TimeTrackingIndicator = memo(function TimeTrackingIndicator({
  taskId,
  variant = 'compact',
  showPersonnel = true,
  showDuration = true,
}: TimeTrackingIndicatorProps) {
  const { session, isActive } = useTaskTimeSession(taskId);
  const { formattedDuration, duration } = useSessionDuration(session);
  const theme = useTheme();

  if (!isActive || !session) {
    return null;
  }

  const personnel = session.personnel;
  const personnelName = personnel?.name || 'Unknown';
  const personnelInitials = personnel?.initials || '?';

  // Compact variant - small indicator with tooltip
  if (variant === 'compact') {
    return (
      <Tooltip
        title={
          <Box sx={{ p: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
              Time Tracking Active
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              {personnelName}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'success.light' }}>
              {formattedDuration}
            </Typography>
          </Box>
        }
        placement="top"
      >
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 52,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'success.main',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 },
              },
            }}
          />
          <Iconify icon="eva:clock-fill" width={12} height={12} sx={{ color: 'success.main' }} />
        </Box>
      </Tooltip>
    );
  }

  // Chip variant - small chip with personnel info
  if (variant === 'chip') {
    return (
      <Chip
        size="small"
        icon={
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'success.main',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 },
              },
            }}
          />
        }
        label={showDuration ? formatDurationHuman(duration) : 'Tracking'}
        sx={{
          bgcolor: alpha(theme.palette.success.main, 0.1),
          color: 'success.dark',
          fontWeight: 600,
          fontSize: '0.75rem',
          '& .MuiChip-icon': {
            ml: 0.5,
          },
        }}
      />
    );
  }

  // Full variant - complete info with avatar
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1,
        py: 0.5,
        borderRadius: 1,
        bgcolor: alpha(theme.palette.success.main, 0.1),
        border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'success.main',
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.5 },
            '100%': { opacity: 1 },
          },
        }}
      />

      <Iconify icon="eva:clock-fill" width={16} height={16} sx={{ color: 'success.main' }} />

      {showPersonnel && personnel && (
        <>
          <Avatar
            sx={{
              width: 20,
              height: 20,
              fontSize: '0.75rem',
              bgcolor: 'success.main',
            }}
            src={personnel.avatar}
          >
            {personnelInitials}
          </Avatar>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: 'success.dark',
              maxWidth: 100,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {personnelName}
          </Typography>
        </>
      )}

      {showDuration && (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: 'success.dark',
            fontFamily: 'monospace',
          }}
        >
          {formattedDuration}
        </Typography>
      )}
    </Box>
  );
});

// ----------------------------------------------------------------------

interface MultipleTrackingIndicatorProps {
  sessions: ActiveTimeSession[];
  maxVisible?: number;
  variant?: 'compact' | 'avatars';
}

export const MultipleTrackingIndicator = memo(function MultipleTrackingIndicator({
  sessions,
  maxVisible = 3,
  variant = 'compact',
}: MultipleTrackingIndicatorProps) {
  const theme = useTheme();

  if (!sessions.length) {
    return null;
  }

  const visibleSessions = sessions.slice(0, maxVisible);
  const hiddenCount = Math.max(0, sessions.length - maxVisible);

  if (variant === 'avatars') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'success.main',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 },
            },
          }}
        />

        {visibleSessions.map((session, index) => (
          <Tooltip
            key={session._id}
            title={`${session.personnel?.name || 'Unknown'} is tracking time`}
          >
            <Avatar
              sx={{
                width: 24,
                height: 24,
                fontSize: '0.75rem',
                bgcolor: 'success.main',
                ml: index > 0 ? -0.5 : 0,
                border: `2px solid ${theme.palette.background.paper}`,
              }}
              src={session.personnel?.avatar}
            >
              {session.personnel?.initials || '?'}
            </Avatar>
          </Tooltip>
        ))}

        {hiddenCount > 0 && (
          <Avatar
            sx={{
              width: 24,
              height: 24,
              fontSize: '0.65rem',
              bgcolor: 'success.light',
              color: 'success.contrastText',
              ml: -0.5,
              border: `2px solid ${theme.palette.background.paper}`,
            }}
          >
            +{hiddenCount}
          </Avatar>
        )}
      </Box>
    );
  }

  // Compact variant
  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
            {sessions.length} {sessions.length === 1 ? 'person' : 'people'} tracking time:
          </Typography>
          {sessions.map((session) => (
            <Typography key={session._id} variant="caption" sx={{ display: 'block' }}>
              • {session.personnel?.name || 'Unknown'}
            </Typography>
          ))}
        </Box>
      }
    >
      <Chip
        size="small"
        icon={
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'success.main',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 },
              },
            }}
          />
        }
        label={`${sessions.length} tracking`}
        sx={{
          bgcolor: alpha(theme.palette.success.main, 0.1),
          color: 'success.dark',
          fontWeight: 600,
          fontSize: '0.75rem',
        }}
      />
    </Tooltip>
  );
});
