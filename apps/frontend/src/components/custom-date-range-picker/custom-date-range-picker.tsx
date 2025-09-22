'use client';

import type { Dayjs } from 'dayjs';
import type { PaperProps } from '@mui/material/Paper';
import type { DialogProps } from '@mui/material/Dialog';
import type { UseDateRangePickerReturn } from './use-date-range-picker';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import FormHelperText from '@mui/material/FormHelperText';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DateCalendar, dateCalendarClasses } from '@mui/x-date-pickers/DateCalendar';

// ----------------------------------------------------------------------

export type RepeatSettings = {
  enabled: boolean;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customType?: 'weeks' | 'months';
  frequency?: number;
};

export type ReminderSettings = {
  enabled: boolean;
  type: '1hour' | '1day' | '1week' | '1month';
};

export type CustomDateRangePickerProps = DialogProps &
  UseDateRangePickerReturn & {
    onSubmit?: (data?: { repeat?: RepeatSettings; reminder?: ReminderSettings }) => void;
    enableTime?: boolean;
    enableRepeat?: boolean;
    enableReminder?: boolean;
  };

export function CustomDateRangePicker({
  open,
  error,
  onClose,
  onSubmit,
  /********/
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
  /********/
  slotProps,
  variant = 'input',
  title = 'Select date range',
  enableTime = false,
  enableRepeat = false,
  enableReminder = false,
  ...other
}: CustomDateRangePickerProps) {
  const mdUp = useMediaQuery((theme) => theme.breakpoints.up('md'));

  const isCalendarView = mdUp && variant === 'calendar';

  // State for repeat and reminder settings
  const [repeatSettings, setRepeatSettings] = useState<RepeatSettings>({
    enabled: false,
    type: 'daily',
    customType: 'weeks',
    frequency: 1,
  });

  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    enabled: false,
    type: '1hour',
  });

  const handleSubmit = useCallback(() => {
    const data = {
      ...(enableRepeat && { repeat: repeatSettings }),
      ...(enableReminder && { reminder: reminderSettings }),
    };
    onClose();
    onSubmit?.(Object.keys(data).length > 0 ? data : undefined);
  }, [onClose, onSubmit, enableRepeat, enableReminder, repeatSettings, reminderSettings]);

  // Helper functions for time handling
  const handleStartTimeChange = useCallback(
    (newTime: string) => {
      if (startDate && newTime) {
        const [hours, minutes] = newTime.split(':').map(Number);
        const newStartDate = startDate.hour(hours).minute(minutes);
        onChangeStartDate(newStartDate);
      }
    },
    [startDate, onChangeStartDate]
  );

  const handleEndTimeChange = useCallback(
    (newTime: string) => {
      if (endDate && newTime) {
        const [hours, minutes] = newTime.split(':').map(Number);
        const newEndDate = endDate.hour(hours).minute(minutes);
        onChangeEndDate(newEndDate);
      }
    },
    [endDate, onChangeEndDate]
  );

  // Preserve time when date changes
  const handleStartDateChange = useCallback(
    (newDate: Dayjs | null) => {
      if (newDate && startDate) {
        // Preserve the existing time
        const preservedStartDate = newDate.hour(startDate.hour()).minute(startDate.minute());
        onChangeStartDate(preservedStartDate);
      } else {
        onChangeStartDate(newDate);
      }
    },
    [startDate, onChangeStartDate]
  );

  const handleEndDateChange = useCallback(
    (newDate: Dayjs | null) => {
      if (newDate && endDate) {
        // Preserve the existing time
        const preservedEndDate = newDate.hour(endDate.hour()).minute(endDate.minute());
        onChangeEndDate(preservedEndDate);
      } else {
        onChangeEndDate(newDate);
      }
    },
    [endDate, onChangeEndDate]
  );

  const getTimeString = useCallback((date: Dayjs | null) => {
    if (!date) {
      // Default to current hour with 00 minutes
      const currentHour = dayjs().format('HH:00');
      return currentHour;
    }
    return date.format('HH:mm');
  }, []);

  // Generate time options in 30-minute intervals
  const timeOptions = useCallback(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  }, []);

  const TimeSelector = useCallback(
    ({
      label,
      value,
      onChange,
    }: {
      label: string;
      value: string;
      onChange: (value: string) => void;
    }) => (
      <TextField
        select
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        slotProps={{
          select: {
            native: true,
          },
        }}
        sx={{ minWidth: 100 }}
      >
        {timeOptions().map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </TextField>
    ),
    [timeOptions]
  );

  const dialogPaperSx = (slotProps?.paper as PaperProps)?.sx;

  return (
    <Dialog
      fullWidth
      open={open}
      onClose={onClose}
      maxWidth={isCalendarView ? false : 'xs'}
      slotProps={{
        ...slotProps,
        paper: {
          ...slotProps?.paper,
          sx: [
            { ...(isCalendarView && { maxWidth: 720 }) },
            ...(Array.isArray(dialogPaperSx) ? dialogPaperSx : [dialogPaperSx]),
          ],
        },
      }}
      {...other}
    >
      <DialogTitle>{title}</DialogTitle>

      <DialogContent
        sx={[
          (theme) => ({
            gap: 3,
            display: 'flex',
            overflow: 'unset',
            flexDirection: isCalendarView ? 'row' : 'column',
            [`& .${dateCalendarClasses.root}`]: {
              borderRadius: 2,
              border: `dashed 1px ${theme.vars?.palette.divider}`,
            },
          }),
        ]}
      >
        {isCalendarView ? (
          <>
            <div>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Start day
              </Typography>
              <DateCalendar value={startDate} onChange={handleStartDateChange} />
              {enableTime && (
                <Stack direction="row" spacing={1} sx={{ mt: 2, px: 1 }}>
                  <TimeSelector
                    label="Start time"
                    value={getTimeString(startDate)}
                    onChange={handleStartTimeChange}
                  />
                </Stack>
              )}
            </div>

            <div>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                End day
              </Typography>
              <DateCalendar value={endDate} onChange={handleEndDateChange} />
              {enableTime && (
                <Stack direction="row" spacing={1} sx={{ mt: 2, px: 1 }}>
                  <TimeSelector
                    label="End time"
                    value={getTimeString(endDate)}
                    onChange={handleEndTimeChange}
                  />
                </Stack>
              )}
            </div>
          </>
        ) : (
          <>
            {enableTime ? (
              <>
                <DateTimePicker
                  label="Start date & time"
                  value={startDate}
                  onChange={onChangeStartDate}
                  minutesStep={30}
                  ampm={false}
                />
                <DateTimePicker
                  label="End date & time"
                  value={endDate}
                  onChange={onChangeEndDate}
                  minutesStep={30}
                  ampm={false}
                />
              </>
            ) : (
              <Stack direction="column" spacing={1}>

                <Stack direction="row" spacing={1}>
                  <DatePicker label="Start date" value={startDate} onChange={onChangeStartDate} />
                  <DatePicker label="End date" value={endDate} onChange={onChangeEndDate} />
                </Stack>
              </Stack>
            )}
          </>
        )}
      </DialogContent>
      <Stack direction="row" spacing={1}>
        {/* Repeat Options */}
        {enableRepeat && (
          <>
            <Divider sx={{ my: 3 }} />
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  🔄 Repeat Settings
                </Typography>
              </Stack>

              <FormControlLabel
                control={
                  <Switch
                    checked={repeatSettings.enabled}
                    onChange={(e) =>
                      setRepeatSettings((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                  />
                }
                label="Repeat Task"
              />

              {repeatSettings.enabled && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                  Create recurring tasks automatically based on the schedule below
                </Typography>
              )}

              {repeatSettings.enabled && (
                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Repeat Type</InputLabel>
                    <Select
                      value={repeatSettings.type}
                      label="Repeat Type"
                      onChange={(e) =>
                        setRepeatSettings((prev) => ({
                          ...prev,
                          type: e.target.value as RepeatSettings['type'],
                        }))
                      }
                    >
                      <MenuItem value="daily">📆 Daily</MenuItem>
                      <MenuItem value="weekly">📅 Weekly</MenuItem>
                      <MenuItem value="monthly">🗓️ Monthly</MenuItem>
                      <MenuItem value="yearly">📆 Yearly</MenuItem>
                      <MenuItem value="custom">⚙️ Custom</MenuItem>
                    </Select>
                  </FormControl>

                  {repeatSettings.type === 'custom' && (
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="body2">Every</Typography>
                        <TextField
                          type="number"
                          size="small"
                          sx={{ width: 80 }}
                          value={repeatSettings.frequency || 1}
                          slotProps={{
                            htmlInput: { min: 1, max: 26 },
                          }}
                          onChange={(e) =>
                            setRepeatSettings((prev) => ({
                              ...prev,
                              frequency: parseInt(e.target.value, 10),
                            }))
                          }
                        />
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={repeatSettings.customType || 'weeks'}
                            onChange={(e) =>
                              setRepeatSettings((prev) => ({
                                ...prev,
                                customType: e.target
                                  .value as RepeatSettings['customType'],
                              }))
                            }
                          >
                            <MenuItem value="weeks">Week(s)</MenuItem>
                            <MenuItem value="months">Month(s)</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Frequency can be set from 1 to 26{' '}
                        {repeatSettings.customType || 'weeks'}
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              )}
            </Stack>
          </>
        )}

        {/* Reminder Options */}
        {enableReminder && (
          <>
            <Divider sx={{ my: 3 }} />
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  🔔 Reminder Settings
                </Typography>
              </Stack>

              <FormControlLabel
                control={
                  <Switch
                    checked={reminderSettings.enabled}
                    onChange={(e) =>
                      setReminderSettings((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                  />
                }
                label="Set Reminder"
              />

              {reminderSettings.enabled && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                  Send email reminders to assignees and reporter before task is due
                </Typography>
              )}

              {reminderSettings.enabled && (
                <FormControl fullWidth size="small">
                  <InputLabel>Reminder Time</InputLabel>
                  <Select
                    value={reminderSettings.type}
                    label="Reminder Time"
                    onChange={(e) =>
                      setReminderSettings((prev) => ({
                        ...prev,
                        type: e.target.value as ReminderSettings['type'],
                      }))
                    }
                  >
                    <MenuItem value="1hour">🕐 1 Hour Before</MenuItem>
                    <MenuItem value="1day">📅 1 Day Before</MenuItem>
                    <MenuItem value="1week">📆 1 Week Before</MenuItem>
                    <MenuItem value="1month">🗓️ 1 Month Before</MenuItem>
                  </Select>
                </FormControl>
              )}

              {/* Summary of reminder settings */}
              {reminderSettings.enabled && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    📧 Email reminder will be sent{' '}
                    {reminderSettings.type === '1hour' && '1 hour'}
                    {reminderSettings.type === '1day' && '1 day'}
                    {reminderSettings.type === '1week' && '1 week'}
                    {reminderSettings.type === '1month' && '1 month'} before the task is
                    due
                  </Typography>
                </Stack>
              )}
            </Stack>
          </>
        )}

        {/* Summary of repeat settings */}
        {enableRepeat && repeatSettings.enabled && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 1,
              alignItems: 'center',
              mt: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              🔄 Task will repeat {repeatSettings.type === 'daily' && 'every day'}
              {repeatSettings.type === 'weekly' && 'every week'}
              {repeatSettings.type === 'monthly' && 'every month'}
              {repeatSettings.type === 'yearly' && 'every year'}
              {repeatSettings.type === 'custom' &&
                `every ${repeatSettings.frequency} ${repeatSettings.customType}`}
            </Typography>
          </Stack>
        )}
      </Stack>
      <DialogActions>
        {error && (
          <FormHelperText error sx={{ px: 2 }}>
            End date must be later than start date
          </FormHelperText>
        )}
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={error} variant="contained" onClick={handleSubmit}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
