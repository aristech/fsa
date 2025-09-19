'use client';

import type { Theme, SxProps } from '@mui/material/styles';
import type { ICalendarEvent, ICalendarFilters } from 'src/types/calendar';

import Calendar from '@fullcalendar/react';
import listPlugin from '@fullcalendar/list';
import dayGridPlugin from '@fullcalendar/daygrid';
import { useState, startTransition } from 'react';
import timeGridPlugin from '@fullcalendar/timegrid';
import elLocale from '@fullcalendar/core/locales/el';
import interactionPlugin from '@fullcalendar/interaction';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { fIsAfter, fIsBetween } from 'src/utils/format-time';

import { useGetEvents } from 'src/actions/calendar';
import { useTranslate } from 'src/locales/use-locales';
import { DashboardContent } from 'src/layouts/dashboard';
import { deleteTask, updateTaskDates } from 'src/actions/kanban';

import { TimeTrackingIndicator } from 'src/components/time-tracking/time-tracking-indicator';

import { KanbanDetails } from 'src/sections/kanban/details/kanban-details';
import { CALENDAR_COLOR_OPTIONS } from 'src/sections/calendar/hooks/use-event';
import { KanbanTaskCreateDialog } from 'src/sections/kanban/components/kanban-task-create-dialog';

import { CalendarRoot } from '../styles';
import { useCalendar } from '../hooks/use-calendar';
import { CalendarToolbar } from '../calendar-toolbar';
import { CalendarFilters } from '../calendar-filters';
import { CalendarFiltersResult } from '../calendar-filters-result';

// ----------------------------------------------------------------------

export function CalendarView() {
  // const theme = useTheme();
  const { t, currentLang } = useTranslate('common');

  const openFilters = useBoolean();

  // State for task details drawer
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [openTaskDetails, setOpenTaskDetails] = useState(false);

  // State for create task dialog
  const [openCreateTask, setOpenCreateTask] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<any>(null);

  const { events, eventsLoading } = useGetEvents();

  const filters = useSetState<ICalendarFilters>({ colors: [], startDate: null, endDate: null });
  const { state: currentFilters } = filters;

  const dateError = fIsAfter(currentFilters.startDate, currentFilters.endDate);

  const {
    calendarRef,
    /********/
    view,
    title,
    /********/
    onDropEvent,
    onChangeView,
    onClickEvent: originalOnClickEvent,
    onResizeEvent,
    onDateNavigation,
    /********/
    onClickEventInFilters,
  } = useCalendar();

  // Custom handlers for tasks
  const handleSelectRange = (arg: any) => {
    // When user clicks on empty day, open create task dialog
    setSelectedDateRange(arg);
    setOpenCreateTask(true);
  };

  const handleClickEvent = (arg: any) => {
    const { event } = arg;

    if (event.extendedProps?.type === 'task' || event._def?.extendedProps?.type === 'task') {
      // Open task details drawer for task events
      const taskData = event.extendedProps?.task || event._def?.extendedProps?.task;
      if (taskData) {
        setSelectedTask(taskData);
        setOpenTaskDetails(true);
      }
    } else {
      // Use original handler for regular calendar events
      originalOnClickEvent(arg);
    }
  };

  const handleCloseTaskDetails = () => {
    setOpenTaskDetails(false);
    setSelectedTask(null);
  };

  const handleUpdateTask = (updatedTask: any) => {
    // Refresh task events data
    // The SWR will automatically revalidate
    setSelectedTask(updatedTask);
  };

  const handleDeleteTask = async () => {
    if (selectedTask) {
      try {
        await deleteTask(
          selectedTask.columnId || selectedTask.status,
          selectedTask.id,
          selectedTask
        );
        handleCloseTaskDetails();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleCloseCreateTask = () => {
    setOpenCreateTask(false);
    setSelectedDateRange(null);
  };

  const handleCreateTaskSuccess = (task: any) => {
    handleCloseCreateTask();
    // Task events will be refreshed automatically through SWR
  };

  // Custom event content renderer to add tracking indicators
  const renderEventContent = (eventInfo: any) => {
    const event = eventInfo.event;
    const isTask = event.extendedProps?.type === 'task';
    const taskId = event.extendedProps?.task?.id || event.id;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          height: '100%',
          minHeight: 'inherit',
          px: 0.5,
        }}
      >
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            {event.title}
          </Typography>
          {eventInfo.timeText && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                opacity: 0.8,
                display: 'block',
                lineHeight: 1,
              }}
            >
              {eventInfo.timeText}
            </Typography>
          )}
        </Box>
        {isTask && (
          <TimeTrackingIndicator
            taskId={taskId}
            variant="compact"
            showPersonnel={false}
            showDuration={false}
          />
        )}
      </Box>
    );
  };

  // Custom update function for task dates (used in drag/drop)
  const updateTaskFromCalendar = async (eventData: Partial<ICalendarEvent>) => {
    try {
      // Check if this is a task event and has required data
      if (eventData.id && eventData.start && eventData.end) {
        const event = events.find((e) => e.id === eventData.id);
        if (event && event.extendedProps?.type === 'task') {
          const startDate =
            typeof eventData.start === 'string'
              ? eventData.start
              : new Date(eventData.start).toISOString();
          const endDate =
            typeof eventData.end === 'string'
              ? eventData.end
              : new Date(eventData.end).toISOString();
          await updateTaskDates(eventData.id, startDate, endDate);
        }
      }
    } catch (error) {
      console.error('Failed to update task dates:', error);
    }
  };

  const canReset =
    currentFilters.colors.length > 0 || (!!currentFilters.startDate && !!currentFilters.endDate);

  const dataFiltered = applyFilter({
    inputData: events,
    filters: currentFilters,
    dateError,
  });

  const flexStyles: SxProps<Theme> = {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
  };

  const renderFiltersDrawer = () => (
    <CalendarFilters
      events={events}
      filters={filters}
      canReset={canReset}
      dateError={dateError}
      open={openFilters.value}
      onClose={openFilters.onFalse}
      onClickEvent={onClickEventInFilters}
      colorOptions={CALENDAR_COLOR_OPTIONS}
    />
  );

  const renderResults = () => (
    <CalendarFiltersResult
      filters={filters}
      totalResults={dataFiltered.length}
      sx={{ mb: { xs: 3, md: 5 } }}
    />
  );

  return (
    <>
      <DashboardContent maxWidth="xl" sx={{ ...flexStyles }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: { xs: 3, md: 5 },
          }}
        >
          <Typography variant="h4">{t('calendar.title', { defaultValue: 'Calendar' })}</Typography>
        </Box>

        {canReset && renderResults()}

        <Card sx={{ ...flexStyles, minHeight: '50vh' }}>
          <CalendarRoot sx={{ ...flexStyles }}>
            <CalendarToolbar
              view={view}
              title={title}
              canReset={canReset}
              loading={eventsLoading}
              onChangeView={onChangeView}
              onDateNavigation={onDateNavigation}
              onOpenFilters={openFilters.onTrue}
              viewOptions={[
                {
                  value: 'dayGridMonth',
                  label: t('calendar.month', { defaultValue: 'Month' }),
                  icon: 'mingcute:calendar-month-line',
                },
                {
                  value: 'timeGridWeek',
                  label: t('calendar.week', { defaultValue: 'Week' }),
                  icon: 'mingcute:calendar-week-line',
                },
                {
                  value: 'timeGridDay',
                  label: t('calendar.day', { defaultValue: 'Day' }),
                  icon: 'mingcute:calendar-day-line',
                },
                {
                  value: 'listWeek',
                  label: t('calendar.agenda', { defaultValue: 'Agenda' }),
                  icon: 'custom:calendar-agenda-outline',
                },
              ]}
            />

            <Calendar
              weekends
              editable
              droppable
              selectable
              allDayMaintainDuration
              eventResizableFromStart
              firstDay={1}
              aspectRatio={3}
              dayMaxEvents={3}
              eventMaxStack={2}
              rerenderDelay={10}
              headerToolbar={false}
              eventDisplay="block"
              ref={calendarRef}
              locales={[elLocale]}
              locale={currentLang.value}
              initialView={view}
              events={dataFiltered}
              select={handleSelectRange}
              eventClick={handleClickEvent}
              eventContent={renderEventContent}
              businessHours={{
                daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
              }}
              // Enhanced time handling and display
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              slotDuration="00:30:00"
              slotLabelInterval="01:00:00"
              slotLabelFormat={{
                hour: 'numeric',
                minute: '2-digit',
                hour12: false,
              }}
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                hour12: false,
              }}
              // Enable resizing for all event types
              eventStartEditable
              eventDurationEditable
              eventDrop={(arg) => {
                startTransition(() => {
                  onDropEvent(arg, updateTaskFromCalendar);
                });
              }}
              eventResize={(arg) => {
                startTransition(() => {
                  onResizeEvent(arg, updateTaskFromCalendar);
                });
              }}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            />
          </CalendarRoot>
        </Card>
      </DashboardContent>

      {renderFiltersDrawer()}

      {/* Task Details Drawer */}
      {selectedTask && (
        <KanbanDetails
          task={selectedTask}
          open={openTaskDetails}
          onClose={handleCloseTaskDetails}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* Create Task Dialog */}
      <KanbanTaskCreateDialog
        open={openCreateTask}
        onClose={handleCloseCreateTask}
        onSuccess={handleCreateTaskSuccess}
        status="todo"
        initialStartDate={selectedDateRange?.startStr}
        initialEndDate={selectedDateRange?.endStr}
      />
    </>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  dateError: boolean;
  filters: ICalendarFilters;
  inputData: ICalendarEvent[];
};

function applyFilter({ inputData, filters, dateError }: ApplyFilterProps) {
  const { colors, startDate, endDate } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  inputData = stabilizedThis.map((el) => el[0]);

  if (colors.length) {
    inputData = inputData.filter((event) => colors.includes(event.color as string));
  }

  if (!dateError) {
    if (startDate && endDate) {
      inputData = inputData.filter((event) => fIsBetween(event.start, startDate, endDate));
    }
  }

  return inputData;
}
