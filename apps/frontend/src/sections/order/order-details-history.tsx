import type { IWorkOrderTimeline, IWorkOrderTimelineEntry } from 'src/types/work-order';

import useSWR from 'swr';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Timeline from '@mui/lab/Timeline';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TimelineDot from '@mui/lab/TimelineDot';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';

import { fToNow, fDateTime } from 'src/utils/format-time';

import { fetcher } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  workOrderId: string;
};

export function OrderDetailsHistory({ workOrderId }: Props) {
  const [filter, setFilter] = useState<'all' | 'work_order' | 'task'>('all');
  const [hasMore, setHasMore] = useState(true);
  const [allEntries, setAllEntries] = useState<IWorkOrderTimelineEntry[]>([]);

  const apiUrl = `/api/v1/work-orders/${workOrderId}/timeline${
    filter !== 'all' ? `?entityType=${filter}` : ''
  }`;

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    data: IWorkOrderTimeline;
  }>(workOrderId ? apiUrl : null, fetcher);

  useEffect(() => {
    if (data?.data?.timeline) {
      setAllEntries(data.data.timeline);
      setHasMore(data.data.pagination.hasMore);
    }
  }, [data]);

  const timeline = allEntries || [];

  const handleFilterChange = (
    event: React.MouseEvent<HTMLElement>,
    newFilter: 'all' | 'work_order' | 'task'
  ) => {
    if (newFilter !== null) {
      setFilter(newFilter);
    }
  };

  const getEventIcon = (eventType: string, entityType: string) => {
    const isTask = entityType === 'task';

    switch (eventType) {
      case 'created':
        return isTask ? 'eva:file-add-fill' : 'eva:plus-circle-fill';
      case 'status_changed':
        return 'eva:swap-fill';
      case 'assigned':
        return 'eva:person-add-fill';
      case 'priority_changed':
        return 'eva:flag-fill';
      case 'progress_updated':
        return 'eva:trending-up-fill';
      case 'completed':
        return 'eva:checkmark-circle-fill';
      case 'cancelled':
        return 'eva:close-circle-fill';
      default:
        return 'eva:edit-fill';
    }
  };

  const getEventColor = (eventType: string): 'primary' | 'success' | 'warning' | 'error' | 'grey' => {
    switch (eventType) {
      case 'created':
        return 'primary';
      case 'completed':
        return 'success';
      case 'assigned':
        return 'primary';
      case 'priority_changed':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'grey';
    }
  };

  const renderFilterButtons = () => (
    <ToggleButtonGroup
      value={filter}
      exclusive
      onChange={handleFilterChange}
      size="small"
      sx={{ mb: 2 }}
    >
      <ToggleButton value="all">All</ToggleButton>
      <ToggleButton value="work_order">Work Order</ToggleButton>
      <ToggleButton value="task">Tasks</ToggleButton>
    </ToggleButtonGroup>
  );

  const renderSummary = () => {
    const workOrderEvents = timeline.filter(item => item.entityType === 'work_order');
    const taskEvents = timeline.filter(item => item.entityType === 'task');
    const completedTasks = taskEvents.filter(item => item.eventType === 'completed');

    const summaryItems = [
      { label: 'Total Events', value: timeline.length },
      { label: 'Work Order Updates', value: workOrderEvents.length },
      { label: 'Task Updates', value: taskEvents.length },
      { label: 'Completed Tasks', value: completedTasks.length },
    ];

    return (
      <Box
        sx={{
          p: 2.5,
          gap: 2,
          minWidth: 260,
          flexShrink: 0,
          borderRadius: 2,
          display: 'flex',
          typography: 'body2',
          flexDirection: 'column',
          bgcolor: 'background.neutral',
        }}
      >
        {summaryItems.map((item) => (
          <Box key={item.label} sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
            <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              {item.label}
            </Box>
            <Typography variant="h6">{item.value}</Typography>
          </Box>
        ))}
      </Box>
    );
  };

  const renderTimeline = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error">Failed to load timeline</Typography>
        </Box>
      );
    }

    if (timeline.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No activity yet</Typography>
        </Box>
      );
    }

    return (
      <Timeline
        sx={{
          p: 0,
          [`& .${timelineItemClasses.root}:before`]: { p: 0, flex: 0 },
        }}
      >
        {timeline.map((item, index) => {
          const isLast = index === timeline.length - 1;

          return (
            <TimelineItem key={item._id}>
              <TimelineSeparator>
                <TimelineDot color={getEventColor(item.eventType)}>
                  <Iconify icon={getEventIcon(item.eventType, item.entityType)} width={16} />
                </TimelineDot>
                {!isLast && <TimelineConnector />}
              </TimelineSeparator>

              <TimelineContent sx={{ pb: isLast ? 0 : 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  {item.userAvatar && (
                    <Avatar src={item.userAvatar} sx={{ width: 24, height: 24 }}>
                      {item.userName?.charAt(0)}
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      {item.title}
                    </Typography>

                    {item.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {item.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {item.userName && (
                        <Typography variant="caption" color="text.secondary">
                          by {item.userName}
                        </Typography>
                      )}
                      <Chip
                        label={item.entityType === 'work_order' ? 'Work Order' : 'Task'}
                        size="small"
                        variant="outlined"
                        color={item.entityType === 'work_order' ? 'primary' : 'default'}
                      />
                    </Box>

                    <Typography variant="caption" color="text.disabled">
                      {fToNow(item.timestamp)} • {fDateTime(item.timestamp)}
                    </Typography>

                    {item.metadata && (
                      <Box sx={{ mt: 1 }}>
                        {item.metadata.assigneeNames && (
                          <Typography variant="caption" color="text.secondary">
                            Assignees: {item.metadata.assigneeNames.join(', ')}
                          </Typography>
                        )}
                        {item.metadata.oldValue && item.metadata.newValue && (
                          <Typography variant="caption" color="text.secondary">
                            Changed from &quot;{item.metadata.oldValue}&quot; to &quot;{item.metadata.newValue}&quot;
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    );
  };

  return (
    <Card>
      <CardHeader
        title="Timeline"
        subheader="Track all changes to this work order and related tasks"
      />
      <Box sx={{ p: 3 }}>
        {renderFilterButtons()}
        <Box
          sx={{
            gap: 3,
            display: 'flex',
            alignItems: { md: 'flex-start' },
            flexDirection: { xs: 'column-reverse', md: 'row' },
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            {renderTimeline()}
            {hasMore && !isLoading && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Button
                  size="small"
                  color="inherit"
                  endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} />}
                >
                  Load more
                </Button>
              </Box>
            )}
          </Box>
          {renderSummary()}
        </Box>
      </Box>
    </Card>
  );
}
