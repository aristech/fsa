'use client';

import React, { useMemo, useState, useCallback } from 'react';

import { styled } from '@mui/material/styles';
import { Box, Chip, alpha, useTheme, keyframes, Typography, IconButton } from '@mui/material';

import { Iconify } from '../iconify';
import { TimeTrackingIndicator } from '../time-tracking/time-tracking-indicator';

export type CalendarView = 'week' | 'month' | 'day' | 'agenda';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'overdue' | 'cancelled';

export type CalendarTask = {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  priority: TaskPriority;
  status: TaskStatus;
  location?: string;
  assignees?: string[];
  projectId?: string;
  color?: string;
};

export type MobileCalendarProps = {
  tasks: CalendarTask[];
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onTaskSelect: (task: CalendarTask) => void;
  onDateSelect: (date: Date) => void;
  onTaskCreate?: (date: Date) => void;
  selectedDate?: Date;
  loading?: boolean;
};

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
`;

// Styled components
const CalendarContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  backgroundColor: theme.palette.background.default,
  borderRadius: '16px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}));

const CalendarHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2, 2),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 0,
  },
}));

const ViewSelector = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  borderRadius: '8px',
  padding: '4px',
  width: '100%',
  justifyContent: 'center',
  [theme.breakpoints.up('sm')]: {
    width: 'auto',
    justifyContent: 'flex-start',
  },
}));

const ViewButton = styled(IconButton, {
  shouldForwardProp: (prop) => !['active'].includes(prop as string),
})<{ active: boolean }>(({ theme, active }) => ({
  width: '48px',
  height: '56px',
  borderRadius: '8px',
  backgroundColor: active ? theme.palette.primary.main : 'transparent',
  color: active ? theme.palette.primary.contrastText : theme.palette.text.secondary,
  flex: 1,
  [theme.breakpoints.up('sm')]: {
    width: '40px',
    height: '40px',
    flex: 'none',
  },
  '&:hover': {
    backgroundColor: active ? theme.palette.primary.dark : alpha(theme.palette.primary.main, 0.1),
  },
}));

const WeekView = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  animation: `${fadeIn} 0.3s ease-out`,
}));

const WeekHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
}));

const DayHeader = styled(Box, {
  shouldForwardProp: (prop) => !['isToday', 'isSelected'].includes(prop as string),
})<{ isToday: boolean; isSelected: boolean }>(({ theme, isToday, isSelected }) => ({
  flex: 1,
  padding: theme.spacing(1),
  textAlign: 'center',
  borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: isSelected
    ? alpha(theme.palette.primary.main, 0.1)
    : isToday
      ? alpha(theme.palette.primary.main, 0.05)
      : 'transparent',
  '&:last-child': {
    borderRight: 'none',
  },
}));

const WeekGrid = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
}));

const DayColumn = styled(Box, {
  shouldForwardProp: (prop) => !['isToday', 'isSelected'].includes(prop as string),
})<{ isToday: boolean; isSelected: boolean }>(({ theme, isToday, isSelected }) => ({
  flex: 1,
  borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: isSelected
    ? alpha(theme.palette.primary.main, 0.05)
    : isToday
      ? alpha(theme.palette.primary.main, 0.02)
      : 'transparent',
  '&:last-child': {
    borderRight: 'none',
  },
  position: 'relative',
  overflow: 'hidden',
}));

const TaskItem = styled(Box, {
  shouldForwardProp: (prop) => !['priority', 'status'].includes(prop as string),
})<{ priority: TaskPriority; status: TaskStatus }>(({ theme, priority, status }) => {
  const priorityColors = {
    low: theme.palette.success.main,
    medium: theme.palette.warning.main,
    high: theme.palette.error.main,
    urgent: theme.palette.error.dark,
  };

  const statusColors = {
    pending: alpha(theme.palette.grey[400], 0.3),
    'in-progress': alpha(theme.palette.info.main, 0.3),
    completed: alpha(theme.palette.success.main, 0.3),
    overdue: alpha(theme.palette.error.main, 0.3),
    cancelled: alpha(theme.palette.grey[600], 0.3),
  };

  return {
    margin: '2px',
    padding: '4px 8px',
    borderRadius: '6px',
    backgroundColor: statusColors[status],
    borderLeft: `3px solid ${priorityColors[priority]}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: theme.shadows[2],
    },
  };
});

const MonthView = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  animation: `${fadeIn} 0.3s ease-out`,
}));

const MonthGrid = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gridTemplateRows: 'repeat(6, 1fr)',
  gap: '1px',
  backgroundColor: alpha(theme.palette.divider, 0.1),
}));

const MonthDay = styled(Box, {
  shouldForwardProp: (prop) =>
    !['isToday', 'isSelected', 'isCurrentMonth'].includes(prop as string),
})<{ isToday: boolean; isSelected: boolean; isCurrentMonth: boolean }>(
  ({ theme, isToday, isSelected, isCurrentMonth }) => ({
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(1),
    minHeight: '60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    opacity: isCurrentMonth ? 1 : 0.4,
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
    },
    ...(isToday && {
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
      border: `2px solid ${theme.palette.primary.main}`,
    }),
    ...(isSelected && {
      backgroundColor: alpha(theme.palette.primary.main, 0.2),
    }),
  })
);

const AgendaView = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  animation: `${slideIn} 0.3s ease-out`,
}));

const AgendaItem = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
  },
  '&:last-child': {
    borderBottom: 'none',
  },
}));

// Helper functions
const getWeekDates = (date: Date): Date[] => {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day;
  startOfWeek.setDate(diff);

  return Array.from({ length: 7 }, (_, i) => {
    const weekDate = new Date(startOfWeek);
    weekDate.setDate(startOfWeek.getDate() + i);
    return weekDate;
  });
};

const getMonthDates = (date: Date): Date[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  // const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const dates: Date[] = [];
  const current = new Date(startDate);

  for (let i = 0; i < 42; i++) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const formatTime = (date: Date): string =>
  date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const getPriorityColor = (priority: TaskPriority, theme: any): string => {
  const colors = {
    low: theme.palette.success.main,
    medium: theme.palette.warning.main,
    high: theme.palette.error.main,
    urgent: theme.palette.error.dark,
  };
  return colors[priority];
};

const getStatusColor = (status: TaskStatus, theme: any): string => {
  const colors = {
    pending: theme.palette.grey[400],
    'in-progress': theme.palette.info.main,
    completed: theme.palette.success.main,
    overdue: theme.palette.error.main,
    cancelled: theme.palette.grey[600],
  };
  return colors[status];
};

// Main Calendar Component
export function MobileCalendar({
  tasks,
  view,
  onViewChange,
  onTaskSelect,
  onDateSelect,
  onTaskCreate,
  selectedDate = new Date(),
  loading = false,
}: MobileCalendarProps) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(selectedDate);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const monthDates = useMemo(() => getMonthDates(currentDate), [currentDate]);

  const handlePrevious = useCallback(() => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, view]);

  const handleNext = useCallback(() => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, view]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const getTasksForDate = useCallback(
    (date: Date) =>
      tasks.filter((task) => {
        const taskDate = new Date(task.startTime);
        return taskDate.toDateString() === date.toDateString();
      }),
    [tasks]
  );

  const getTasksForWeek = useCallback(
    (dates: Date[]) => dates.map((date) => getTasksForDate(date)),
    [getTasksForDate]
  );

  const renderWeekView = () => {
    const weekTasks = getTasksForWeek(weekDates);

    return (
      <WeekView>
        <WeekHeader>
          {weekDates.map((date, index) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const dayTasks = weekTasks[index];

            return (
              <DayHeader key={index} isToday={isToday} isSelected={isSelected}>
                <Typography variant="caption" color="text.secondary">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: isToday ? 'bold' : 'normal',
                    color: isToday ? 'primary.main' : 'text.primary',
                  }}
                >
                  {date.getDate()}
                </Typography>
                {dayTasks.length > 0 && (
                  <Chip
                    size="small"
                    label={dayTasks.length}
                    sx={{
                      height: '16px',
                      fontSize: '10px',
                      backgroundColor: 'primary.main',
                      color: 'white',
                    }}
                  />
                )}
              </DayHeader>
            );
          })}
        </WeekHeader>

        <WeekGrid>
          {weekDates.map((date, index) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const dayTasks = weekTasks[index];

            return (
              <DayColumn
                key={index}
                isToday={isToday}
                isSelected={isSelected}
                onClick={() => onDateSelect(date)}
              >
                {dayTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    priority={task.priority}
                    status={task.status}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskSelect(task);
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {formatTime(task.startTime)}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '12px' }}>
                      {task.title}
                    </Typography>
                  </TaskItem>
                ))}
              </DayColumn>
            );
          })}
        </WeekGrid>
      </WeekView>
    );
  };

  const renderMonthView = () => (
    <MonthView>
      <MonthGrid>
        {monthDates.map((date, index) => {
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const dayTasks = getTasksForDate(date);

          return (
            <MonthDay
              key={index}
              isToday={isToday}
              isSelected={isSelected}
              isCurrentMonth={isCurrentMonth}
              onClick={() => onDateSelect(date)}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isToday ? 'bold' : 'normal',
                  color: isToday ? 'primary.main' : 'text.primary',
                }}
              >
                {date.getDate()}
              </Typography>
              {dayTasks.slice(0, 3).map((task) => (
                <Box
                  key={task.id}
                  sx={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: getPriorityColor(task.priority, theme),
                    borderRadius: '2px',
                    margin: '1px 0',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskSelect(task);
                  }}
                />
              ))}
              {dayTasks.length > 3 && (
                <Typography variant="caption" color="text.secondary">
                  +{dayTasks.length - 3} more
                </Typography>
              )}
            </MonthDay>
          );
        })}
      </MonthGrid>
    </MonthView>
  );

  const renderAgendaView = () => {
    const sortedTasks = [...tasks].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return (
      <AgendaView>
        {sortedTasks.map((task) => (
          <AgendaItem key={task.id} onClick={() => onTaskSelect(task)}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box
                sx={{
                  width: '4px',
                  height: '100%',
                  backgroundColor: getPriorityColor(task.priority, theme),
                  borderRadius: '2px',
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {task.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatTime(task.startTime)} - {formatTime(task.endTime)}
                </Typography>
                {task.location && (
                  <Typography variant="caption" color="text.secondary">
                    📍 {task.location}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeTrackingIndicator
                  taskId={task.id}
                  variant="compact"
                  showPersonnel={false}
                  showDuration={false}
                />
                <Chip
                  size="small"
                  label={task.status}
                  sx={{
                    backgroundColor: getStatusColor(task.status, theme),
                    color: 'white',
                    fontSize: '10px',
                  }}
                />
              </Box>
            </Box>
          </AgendaItem>
        ))}
      </AgendaView>
    );
  };

  const renderDayView = () => {
    const dayTasks = getTasksForDate(currentDate);
    const isToday = currentDate.toDateString() === new Date().toDateString();

    return (
      <WeekView>
        <WeekHeader>
          <DayHeader isToday={isToday} isSelected>
            <Typography variant="caption" color="text.secondary">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: isToday ? 'bold' : 'normal',
                color: isToday ? 'primary.main' : 'text.primary',
              }}
            >
              {currentDate.getDate()}
            </Typography>
            {dayTasks.length > 0 && (
              <Chip
                size="small"
                label={dayTasks.length}
                sx={{
                  height: '16px',
                  fontSize: '10px',
                  backgroundColor: 'primary.main',
                  color: 'white',
                }}
              />
            )}
          </DayHeader>
        </WeekHeader>

        <WeekGrid>
          <DayColumn
            isToday={isToday}
            isSelected
            onClick={() => onDateSelect(currentDate)}
            sx={{ flex: 1 }}
          >
            {dayTasks.map((task) => (
              <TaskItem
                key={task.id}
                priority={task.priority}
                status={task.status}
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskSelect(task);
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {formatTime(task.startTime)}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '12px' }}>
                  {task.title}
                </Typography>
              </TaskItem>
            ))}
          </DayColumn>
        </WeekGrid>
      </WeekView>
    );
  };

  const renderCurrentView = () => {
    switch (view) {
      case 'day':
        return renderDayView();
      case 'week':
        return renderWeekView();
      case 'month':
        return renderMonthView();
      case 'agenda':
        return renderAgendaView();
      default:
        return renderWeekView();
    }
  };

  return (
    <CalendarContainer>
      <CalendarHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handlePrevious} size="small">
            <Iconify icon="eva:arrow-back-fill" width={20} />
          </IconButton>

          <Typography variant="h6" sx={{ minWidth: '120px', textAlign: 'center' }}>
            {currentDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
              ...(view === 'week' && { day: 'numeric' }),
              ...(view === 'day' && {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
            })}
          </Typography>

          <IconButton onClick={handleNext} size="small">
            <Iconify icon="eva:arrow-forward-fill" width={20} />
          </IconButton>

          <IconButton onClick={handleToday} size="small">
            <Typography variant="caption">Today</Typography>
          </IconButton>
        </Box>

        <ViewSelector>
          <ViewButton active={view === 'day'} onClick={() => onViewChange('day')} title="Day View">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <Iconify icon="eva:clock-fill" width={20} />
              <Typography variant="caption" sx={{ fontSize: '10px', lineHeight: 1 }}>
                Day
              </Typography>
            </Box>
          </ViewButton>
          <ViewButton
            active={view === 'week'}
            onClick={() => onViewChange('week')}
            title="Week View"
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <Iconify icon="eva:calendar-fill" width={20} />
              <Typography variant="caption" sx={{ fontSize: '10px', lineHeight: 1 }}>
                Week
              </Typography>
            </Box>
          </ViewButton>
          <ViewButton
            active={view === 'month'}
            onClick={() => onViewChange('month')}
            title="Month View"
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <Iconify icon="eva:grid-fill" width={20} />
              <Typography variant="caption" sx={{ fontSize: '10px', lineHeight: 1 }}>
                Month
              </Typography>
            </Box>
          </ViewButton>
          <ViewButton
            active={view === 'agenda'}
            onClick={() => onViewChange('agenda')}
            title="Agenda View"
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <Iconify icon="eva:list-fill" width={20} />
              <Typography variant="caption" sx={{ fontSize: '10px', lineHeight: 1 }}>
                Agenda
              </Typography>
            </Box>
          </ViewButton>
        </ViewSelector>
      </CalendarHeader>

      <Box sx={{ flex: 1, overflow: 'hidden' }}>{renderCurrentView()}</Box>
    </CalendarContainer>
  );
}
