'use client';

import type {
  TextFieldProps} from '@mui/material';

import React, { useRef, useState } from 'react';

import { styled } from '@mui/material/styles';
import {
  Box,
  alpha,
  TextField,
  IconButton,
  Typography,
  InputAdornment,
} from '@mui/material';

import { Iconify } from '../iconify';

export type MobileInputSize = 'small' | 'medium' | 'large';
export type MobileInputVariant = 'outlined' | 'filled' | 'floating';

interface MobileInputProps extends Omit<TextFieldProps, 'size' | 'variant'> {
  size?: MobileInputSize;
  variant?: MobileInputVariant;
  showClearButton?: boolean;
  showPasswordToggle?: boolean;
  searchIcon?: boolean;
  errorMessage?: string;
  helperText?: string;
  label?: string;
  placeholder?: string;
}

// Mobile-optimized input sizes
const inputSizes = {
  small: {
    height: '40px',
    fontSize: '14px',
    padding: '8px 12px',
  },
  medium: {
    height: '48px',
    fontSize: '16px',
    padding: '12px 16px',
  },
  large: {
    height: '56px',
    fontSize: '18px',
    padding: '16px 20px',
  },
};

// Styled TextField with mobile optimizations
const StyledMobileInput = styled(TextField, {
  shouldForwardProp: (prop) =>
    !['mobileSize', 'mobileVariant', 'showClearButton', 'showPasswordToggle'].includes(
      prop as string
    ),
})<{
  mobileSize: MobileInputSize;
  mobileVariant: MobileInputVariant;
  showClearButton: boolean;
  showPasswordToggle: boolean;
}>(({ theme, mobileSize, mobileVariant, showClearButton, showPasswordToggle }) => {
  const sizeConfig = inputSizes[mobileSize];

  const baseStyles = {
    '& .MuiOutlinedInput-root': {
      height: sizeConfig.height,
      fontSize: sizeConfig.fontSize,
      borderRadius: '12px', // More rounded for mobile
      backgroundColor: theme.palette.background.paper,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',

      '& fieldset': {
        borderColor: alpha(theme.palette.divider, 0.3),
        borderWidth: '2px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },

      '&:hover fieldset': {
        borderColor: alpha(theme.palette.primary.main, 0.5),
      },

      '&.Mui-focused fieldset': {
        borderColor: theme.palette.primary.main,
        borderWidth: '2px',
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
      },

      '&.Mui-error fieldset': {
        borderColor: theme.palette.error.main,
      },
    },

    '& .MuiInputLabel-root': {
      fontSize: sizeConfig.fontSize,
      fontWeight: 500,
      color: theme.palette.text.secondary,

      '&.Mui-focused': {
        color: theme.palette.primary.main,
      },

      '&.Mui-error': {
        color: theme.palette.error.main,
      },
    },

    '& .MuiInputBase-input': {
      padding: sizeConfig.padding,
      fontSize: sizeConfig.fontSize,
      '&::placeholder': {
        opacity: 0.6,
        fontSize: sizeConfig.fontSize,
      },
    },

    '& .MuiFormHelperText-root': {
      fontSize: '12px',
      marginTop: '4px',
      marginLeft: '0',
    },
  };

  // Floating label variant
  const floatingStyles =
    mobileVariant === 'floating'
      ? {
          '& .MuiInputLabel-root': {
            transform: 'translate(14px, 16px) scale(1)',
            '&.Mui-focused, &.MuiFormLabel-filled': {
              transform: 'translate(14px, -9px) scale(0.75)',
              backgroundColor: theme.palette.background.paper,
              padding: '0 4px',
            },
          },
        }
      : {};

  // Filled variant
  const filledStyles =
    mobileVariant === 'filled'
      ? {
          '& .MuiOutlinedInput-root': {
            backgroundColor: alpha(theme.palette.action.hover, 0.5),
            '&:hover': {
              backgroundColor: alpha(theme.palette.action.hover, 0.7),
            },
            '&.Mui-focused': {
              backgroundColor: theme.palette.background.paper,
            },
          },
        }
      : {};

  return {
    ...baseStyles,
    ...floatingStyles,
    ...filledStyles,
  };
});

// Floating label container
const FloatingLabelContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'inline-block',
  width: '100%',
}));

const FloatingLabel = styled(Typography)<{ active: boolean; error: boolean }>(
  ({ theme, active, error }) => ({
    position: 'absolute',
    left: '16px',
    top: active ? '-8px' : '16px',
    fontSize: active ? '12px' : '16px',
    fontWeight: 500,
    color: error
      ? theme.palette.error.main
      : active
        ? theme.palette.primary.main
        : theme.palette.text.secondary,
    backgroundColor: theme.palette.background.paper,
    padding: '0 4px',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: 'none',
    zIndex: 1,
  })
);

export function MobileInput({
  size = 'medium',
  variant = 'outlined',
  showClearButton = false,
  showPasswordToggle = false,
  searchIcon = false,
  errorMessage,
  helperText,
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  ...props
}: MobileInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = Boolean(value && value.toString().length > 0);
  const isFloatingActive = isFocused || hasValue;
  const inputType = type === 'password' && showPassword ? 'text' : type;

  const handleClear = () => {
    if (onChange) {
      const event = {
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
    inputRef.current?.focus();
  };

  const handlePasswordToggle = () => {
    setShowPassword(!showPassword);
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    props.onFocus?.(event);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    props.onBlur?.(event);
  };

  // Build input props
  const inputProps = {
    ...props,
    size: 'medium' as const, // Use MUI's medium size
    variant: variant === 'floating' ? 'outlined' : variant,
    value,
    onChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    type: inputType,
    placeholder: variant === 'floating' ? '' : placeholder,
    inputRef,
    InputProps: {
      ...props.InputProps,
      startAdornment: searchIcon ? (
        <InputAdornment position="start">
          <Iconify icon="eva:search-fill" width={20} sx={{ color: 'action.main' }} />
        </InputAdornment>
      ) : (
        props.InputProps?.startAdornment
      ),
      endAdornment: (
        <InputAdornment position="end">
          {showClearButton && hasValue && (
            <IconButton size="small" onClick={handleClear} edge="end" sx={{ mr: 1 }}>
              <Iconify icon="eva:close-fill" width={20} />
            </IconButton>
          )}
          {showPasswordToggle && type === 'password' && (
            <IconButton size="small" onClick={handlePasswordToggle} edge="end">
              {showPassword ? (
                <Iconify icon="eva:eye-off-fill" width={20} />
              ) : (
                <Iconify icon="eva:eye-fill" width={20} />
              )}
            </IconButton>
          )}
          {props.InputProps?.endAdornment}
        </InputAdornment>
      ),
    },
    helperText: errorMessage || helperText,
    error: Boolean(errorMessage),
  };

  if (variant === 'floating') {
    return (
      <FloatingLabelContainer>
        <FloatingLabel
          active={isFloatingActive}
          error={Boolean(errorMessage)}
          onClick={() => inputRef.current?.focus()}
        >
          {label}
        </FloatingLabel>
        <StyledMobileInput
          mobileSize={size}
          mobileVariant={variant}
          showClearButton={showClearButton}
          showPasswordToggle={showPasswordToggle}
          {...inputProps}
        />
      </FloatingLabelContainer>
    );
  }

  return (
    <StyledMobileInput
      mobileSize={size}
      mobileVariant={variant}
      showClearButton={showClearButton}
      showPasswordToggle={showPasswordToggle}
      label={label}
      placeholder={placeholder}
      {...inputProps}
    />
  );
}

// Export types for use in other components
