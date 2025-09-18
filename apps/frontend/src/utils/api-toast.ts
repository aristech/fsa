import type { ApiResponse, ApiErrorResponse, ApiSuccessResponse } from '../hooks/useApiError';

import { toast } from 'src/components/snackbar';

/**
 * Toast notification utilities for API responses
 * These can be used independently or with the useApiError hook
 */

interface ToastOptions {
  duration?: number;
}

/**
 * Show error toast with internationalized message
 */
export const showApiErrorToast = (
  error: ApiErrorResponse | string,
  getErrorMessage: (error: ApiErrorResponse) => string,
  options?: ToastOptions
): void => {
  let message: string;

  if (typeof error === 'string') {
    message = error;
  } else {
    message = getErrorMessage(error);
  }

  toast.error(message, {
    duration: options?.duration || 4000,
  });
};

/**
 * Show success toast with internationalized message
 */
export const showApiSuccessToast = (
  response: ApiSuccessResponse | string,
  getSuccessMessage: (response: ApiSuccessResponse) => string,
  options?: ToastOptions
): void => {
  let message: string;

  if (typeof response === 'string') {
    message = response;
  } else {
    message = getSuccessMessage(response);
  }

  toast.success(message, {
    duration: options?.duration || 3000,
  });
};

/**
 * Automatically handle API response and show appropriate toast
 */
export const handleApiResponseToast = (
  response: ApiResponse,
  getErrorMessage: (error: ApiErrorResponse) => string,
  getSuccessMessage: (response: ApiSuccessResponse) => string,
  options?: ToastOptions
): void => {
  if (response.success) {
    showApiSuccessToast(response, getSuccessMessage, options);
  } else {
    showApiErrorToast(response, getErrorMessage, options);
  }
};

/**
 * Handle unknown errors (e.g., network errors, unexpected errors)
 */
export const handleUnknownErrorToast = (
  error: unknown,
  extractErrorMessage: (error: unknown) => string,
  options?: ToastOptions
): void => {
  const message = extractErrorMessage(error);
  toast.error(message, {
    duration: options?.duration || 4000,
  });
};