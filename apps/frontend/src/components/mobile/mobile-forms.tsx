'use client';

import dayjs, { type Dayjs } from 'dayjs';
import React, { useRef, useState } from 'react';

import { styled } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Box,
  Paper,
  alpha,
  Button,
  Select,
  MenuItem,
  TextField,
  Typography,
  IconButton,
  InputLabel,
  FormControl,
  InputAdornment,
} from '@mui/material';

import { Iconify } from '../iconify';

export type MobileFormStep = {
  id: string;
  title: string;
  description?: string;
  component: React.ReactNode;
  validation?: () => boolean;
  optional?: boolean;
};

export type MobileFormWizardProps = {
  steps: MobileFormStep[];
  onComplete: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
  showProgress?: boolean;
  allowSkip?: boolean;
  orientation?: 'horizontal' | 'vertical';
};

// Styled components
const WizardContainer = styled(Paper)(({ theme }) => ({
  width: '100%',
  maxWidth: '100%',
  padding: theme.spacing(3),
  borderRadius: '16px',
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[8],
}));

const StepContentContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3, 0),
  minHeight: '200px',
}));

const NavigationContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(2, 0),
  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  marginTop: theme.spacing(3),
}));

const ProgressIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
}));

const ProgressStep = styled(Box, {
  shouldForwardProp: (prop) => !['active', 'completed'].includes(prop as string),
})<{
  active: boolean;
  completed: boolean;
}>(({ theme, active, completed }) => ({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  backgroundColor: completed
    ? theme.palette.success.main
    : active
      ? theme.palette.primary.main
      : alpha(theme.palette.grey[400], 0.3),
  transition: 'all 0.3s ease',
}));

// Mobile Form Wizard Component
export function MobileFormWizard({
  steps,
  onComplete,
  onCancel,
  initialData = {},
  showProgress = true,
  allowSkip = false,
  orientation = 'vertical',
}: MobileFormWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState(initialData);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const currentStep = steps[activeStep];
  const isLastStep = activeStep === steps.length - 1;
  const isFirstStep = activeStep === 0;

  const handleNext = () => {
    // Validate current step
    if (currentStep.validation && !currentStep.validation()) {
      return;
    }

    // Mark step as completed
    setCompletedSteps((prev) => new Set([...prev, activeStep]));

    if (isLastStep) {
      onComplete(formData);
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (allowSkip && !isLastStep) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const updateFormData = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <WizardContainer>
        {/* Progress Indicator */}
        {showProgress && (
          <ProgressIndicator>
            {steps.map((_, index) => (
              <ProgressStep
                key={index}
                active={index === activeStep}
                completed={completedSteps.has(index)}
              />
            ))}
          </ProgressIndicator>
        )}

        {/* Step Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            {currentStep.title}
          </Typography>
          {currentStep.description && (
            <Typography variant="body2" color="text.secondary">
              {currentStep.description}
            </Typography>
          )}
        </Box>

        {/* Step Content */}
        <StepContentContainer>
          {React.cloneElement(currentStep.component as React.ReactElement<any>, {
            data: formData,
            updateData: updateFormData,
          })}
        </StepContentContainer>

        {/* Navigation */}
        <NavigationContainer>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isFirstStep && (
              <Button
                variant="outlined"
                onClick={handleBack}
                startIcon={<Iconify icon="eva:arrow-back-fill" width={20} />}
              >
                Back
              </Button>
            )}
            {allowSkip && !isLastStep && (
              <Button variant="text" onClick={handleSkip} color="secondary">
                Skip
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {onCancel && (
              <Button variant="text" onClick={onCancel} color="error">
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={
                isLastStep ? (
                  <Iconify icon="eva:checkmark-fill" width={20} />
                ) : (
                  <Iconify icon="eva:arrow-forward-fill" width={20} />
                )
              }
            >
              {isLastStep ? 'Complete' : 'Next'}
            </Button>
          </Box>
        </NavigationContainer>
      </WizardContainer>
    </LocalizationProvider>
  );
}

// Mobile Date Picker Component
export function MobileDatePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  required,
  error,
  helperText,
}: {
  label: string;
  value: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label={label}
        value={value}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        slotProps={{
          textField: {
            fullWidth: true,
            required,
            error,
            helperText,
            InputProps: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton edge="end" disabled={disabled}>
                    <Iconify icon="eva:calendar-fill" width={20} />
                  </IconButton>
                </InputAdornment>
              ),
            },
            sx: {
              '& .MuiInputBase-input': {
                fontSize: '16px', // Prevent zoom on iOS
                padding: '16px 14px',
              },
            },
          },
          actionBar: {
            actions: ['clear', 'today', 'cancel', 'accept'],
          },
        }}
      />
    </LocalizationProvider>
  );
}

// Simple time input component using HTML time input
function SimpleTimeInput({
  label,
  value,
  onChange,
  disabled,
  required,
  error,
  helperText,
}: {
  label: string;
  value: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}) {
  const timeValue = value ? value.format('HH:mm') : '';

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = event.target.value;
    if (timeString) {
      const [hours, minutes] = timeString.split(':').map(Number);
      const newTime = dayjs().hour(hours).minute(minutes).second(0);
      onChange(newTime);
    } else {
      onChange(null);
    }
  };

  return (
    <TextField
      label={label}
      type="time"
      value={timeValue}
      onChange={handleTimeChange}
      disabled={disabled}
      required={required}
      error={error}
      helperText={helperText}
      fullWidth
      InputLabelProps={{
        shrink: true,
      }}
      inputProps={{
        step: 300, // 5 minute intervals
      }}
      sx={{
        mt: 2,
        '& .MuiInputBase-input': {
          fontSize: '16px', // Prevent zoom on iOS
          padding: '16px 14px',
        },
      }}
    />
  );
}

// Mobile Time Picker Component
export function MobileTimePicker({
  label,
  value,
  onChange,
  disabled,
  required,
  error,
  helperText,
}: {
  label: string;
  value: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}) {
  return (
    <SimpleTimeInput
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      error={error}
      helperText={helperText}
    />
  );
}

// Mobile Select Component
export function MobileSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  required,
  error,
  helperText,
  multiple,
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  options: { value: any; label: string; disabled?: boolean }[];
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  multiple?: boolean;
}) {
  return (
    <FormControl fullWidth error={error} required={required} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label={label}
        multiple={multiple}
        sx={{
          '& .MuiSelect-select': {
            fontSize: '16px', // Prevent zoom on iOS
            padding: '16px 14px',
          },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {helperText && (
        <Typography
          variant="caption"
          color={error ? 'error' : 'text.secondary'}
          sx={{ mt: 0.5, ml: 2 }}
        >
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
}

// Mobile Image Picker Component
export function MobileImagePicker({
  label,
  value,
  onChange,
  accept = 'image/*',
  multiple = false,
  disabled,
  error,
  helperText,
}: {
  label: string;
  value: File[] | null;
  onChange: (files: File[] | null) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      onChange(multiple ? fileArray : fileArray.slice(0, 1));
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      <Button
        variant="outlined"
        fullWidth
        onClick={handleClick}
        disabled={disabled}
        startIcon={<Iconify icon="eva:camera-fill" width={20} />}
        sx={{
          height: '56px',
          fontSize: '16px',
          borderColor: error ? 'error.main' : undefined,
          color: error ? 'error.main' : undefined,
        }}
      >
        {value && value.length > 0
          ? `${value.length} file${value.length > 1 ? 's' : ''} selected`
          : label}
      </Button>

      {helperText && (
        <Typography
          variant="caption"
          color={error ? 'error' : 'text.secondary'}
          sx={{ mt: 0.5, ml: 2 }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
