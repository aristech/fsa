'use client';

import type { Dayjs } from 'dayjs';
import type { PaperProps } from '@mui/material/Paper';
import type { DialogProps } from '@mui/material/Dialog';
import type { UseDateRangePickerReturn } from './use-date-range-picker';

import dayjs from 'dayjs';
import { useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import FormHelperText from '@mui/material/FormHelperText';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DateCalendar, dateCalendarClasses } from '@mui/x-date-pickers/DateCalendar';

// ----------------------------------------------------------------------

export type CustomDateRangePickerProps = DialogProps &
  UseDateRangePickerReturn & {
    onSubmit?: () => void;
    enableTime?: boolean;
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
  ...other
}: CustomDateRangePickerProps) {
  const mdUp = useMediaQuery((theme) => theme.breakpoints.up('md'));

  const isCalendarView = mdUp && variant === 'calendar';

  const handleSubmit = useCallback(() => {
    onClose();
    onSubmit?.();
  }, [onClose, onSubmit]);

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

  const getTimeString = useCallback((date: Dayjs | null) => {
    if (!date) {
      // Default to current hour with 00 minutes
      const currentHour = dayjs().format('HH:00');
      return currentHour;
    }
    return date.format('HH:mm');
  }, []);

  // Generate time options in 15-minute intervals
  const timeOptions = useCallback(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
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
        SelectProps={{
          native: true,
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
              <DateCalendar value={startDate} onChange={onChangeStartDate} />
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
              <DateCalendar value={endDate} onChange={onChangeEndDate} />
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
                  minutesStep={15}
                  ampm={false}
                />
                <DateTimePicker
                  label="End date & time"
                  value={endDate}
                  onChange={onChangeEndDate}
                  minutesStep={15}
                  ampm={false}
                />
              </>
            ) : (
              <>
                <DatePicker label="Start date" value={startDate} onChange={onChangeStartDate} />
                <DatePicker label="End date" value={endDate} onChange={onChangeEndDate} />
              </>
            )}
          </>
        )}

        {error && (
          <FormHelperText error sx={{ px: 2 }}>
            End date must be later than start date
          </FormHelperText>
        )}
      </DialogContent>

      <DialogActions>
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
