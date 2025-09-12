import { Box, Chip, Tooltip } from '@mui/material';

import { useRealtimeConnection } from 'src/hooks/use-realtime';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export interface RealtimeIndicatorProps {
  sx?: object;
  showText?: boolean;
  variant?: 'chip' | 'icon';
}

export function RealtimeIndicator({
  sx,
  showText = true,
  variant = 'chip',
}: RealtimeIndicatorProps) {
  const { isConnected, connectionState, stats } = useRealtimeConnection();

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'disconnected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Real-time Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return 'material-symbols:wifi';
      case 'connecting':
        return 'material-symbols:wifi-off';
      case 'disconnected':
        return 'material-symbols:wifi-off';
      default:
        return 'material-symbols:help';
    }
  };

  const tooltipContent = (
    <Box>
      <Box sx={{ fontWeight: 'bold', mb: 1 }}>{getStatusText()}</Box>
      <Box sx={{ fontSize: '0.8em' }}>
        Active Rooms: {stats.activeRooms}
        <br />
        Event Listeners: {stats.eventListeners}
        <br />
        {stats.reconnectAttempts > 0 && `Reconnect Attempts: ${stats.reconnectAttempts}`}
      </Box>
    </Box>
  );

  if (variant === 'icon') {
    return (
      <Tooltip title={tooltipContent}>
        <Box sx={{ display: 'flex', alignItems: 'center', ...sx }}>
          <Iconify
            icon={getStatusIcon()}
            sx={{
              color:
                getStatusColor() === 'success'
                  ? 'success.main'
                  : getStatusColor() === 'warning'
                    ? 'warning.main'
                    : getStatusColor() === 'error'
                      ? 'error.main'
                      : 'text.disabled',
              fontSize: 20,
            }}
          />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltipContent}>
      <Chip
        size="small"
        color={getStatusColor() as any}
        variant={isConnected ? 'filled' : 'outlined'}
        icon={<Iconify icon={getStatusIcon()} />}
        label={showText ? getStatusText() : undefined}
        sx={{
          '& .MuiChip-icon': {
            fontSize: '1rem !important',
          },
          ...sx,
        }}
      />
    </Tooltip>
  );
}
