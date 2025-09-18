/**
 * API Helper utilities for seamless integration with existing codebase
 * These utilities help bridge the gap between old and new API handling approaches
 */

import { toast } from 'src/components/snackbar';

import { isApiClientError, extractApiErrorResponse } from '../lib/api-client';
import { useApiError, type ApiErrorResponse, type ApiSuccessResponse } from '../hooks/useApiError';

/**
 * Enhanced wrapper around the existing snackbar system
 * Automatically handles i18n for API responses while maintaining backward compatibility
 */
export class ApiToast {
  /**
   * Show success toast with automatic i18n
   */
  static success(
    response: ApiSuccessResponse | string,
    getSuccessMessage?: (response: ApiSuccessResponse) => string
  ): void {
    if (typeof response === 'string') {
      toast.success(response);
      return;
    }

    if (getSuccessMessage) {
      const message = getSuccessMessage(response);
      toast.success(message);
    } else {
      // Fallback to response message if no translation function provided
      toast.success(response.message || 'Operation completed successfully');
    }
  }

  /**
   * Show error toast with automatic i18n
   */
  static error(
    error: ApiErrorResponse | string | unknown,
    getErrorMessage?: (error: ApiErrorResponse) => string
  ): void {
    if (typeof error === 'string') {
      toast.error(error);
      return;
    }

    const errorResponse = typeof error === 'object' && error && 'success' in error
      ? error as ApiErrorResponse
      : extractApiErrorResponse(error);

    if (getErrorMessage) {
      const message = getErrorMessage(errorResponse);
      toast.error(message);
    } else {
      // Fallback to response message if no translation function provided
      toast.error(errorResponse.message || 'An error occurred');
    }
  }

  /**
   * Show warning toast (no i18n needed for warnings typically)
   */
  static warning(message: string): void {
    toast.warning(message);
  }

  /**
   * Show info toast (no i18n needed for info typically)
   */
  static info(message: string): void {
    toast.info(message);
  }
}

/**
 * Higher-order function to wrap API calls with automatic error handling
 * This can be used to gradually migrate existing API calls
 */
export function withApiErrorHandling<T extends any[], R>(
  apiCall: (...args: T) => Promise<R>,
  options?: {
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
    successMessage?: string;
    onError?: (error: unknown) => void;
    onSuccess?: (result: R) => void;
  }
) {
  return async (...args: T): Promise<R> => {
    try {
      const result = await apiCall(...args);

      // Handle success
      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      if (options?.showSuccessToast) {
        const message = options.successMessage || 'Operation completed successfully';
        toast.success(message);
      }

      return result;

    } catch (error) {
      // Handle error
      if (options?.onError) {
        options.onError(error);
      }

      if (options?.showErrorToast !== false) { // Default to showing error toasts
        ApiToast.error(error);
      }

      throw error; // Re-throw to maintain existing error handling flows
    }
  };
}

/**
 * React hook that provides API helpers with automatic i18n
 * This is the recommended approach for new components
 */
export function useApiHelpers() {
  const { getErrorMessage, getSuccessMessage, extractErrorMessage } = useApiError();

  const showSuccess = (response: ApiSuccessResponse | string) => {
    ApiToast.success(response, getSuccessMessage);
  };

  const showError = (error: unknown) => {
    ApiToast.error(error, getErrorMessage);
  };

  /**
   * Wrapper for API calls that automatically handles responses
   */
  const callApi = async <T>(
    apiCall: () => Promise<{ data: T }>,
    options?: {
      showSuccessToast?: boolean;
      showErrorToast?: boolean;
      onSuccess?: (data: T) => void;
      onError?: (error: unknown) => void;
    }
  ): Promise<T> => {
    try {
      const response = await apiCall();

      if (options?.onSuccess) {
        options.onSuccess(response.data);
      }

      if (options?.showSuccessToast) {
        showSuccess(response.data as any);
      }

      return response.data;

    } catch (error) {
      if (options?.onError) {
        options.onError(error);
      }

      if (options?.showErrorToast !== false) {
        showError(error);
      }

      throw error;
    }
  };

  return {
    showSuccess,
    showError,
    callApi,
    getErrorMessage,
    getSuccessMessage,
    extractErrorMessage,
  };
}

/**
 * Quick migration helper for existing components
 * Replace `toast.error(message)` with `apiToast.error(error)`
 */
export const apiToast = {
  success: (response: ApiSuccessResponse | string) => {
    // For quick migration, we can't access hooks here
    // So we fall back to basic message handling
    if (typeof response === 'string') {
      toast.success(response);
    } else {
      toast.success(response.message || 'Operation completed successfully');
    }
  },

  error: (error: unknown) => {
    const errorResponse = extractApiErrorResponse(error);
    toast.error(errorResponse.message || 'An error occurred');
  },

  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
};

/**
 * Utility to check if a response indicates success
 */
export function isSuccessResponse(response: any): response is ApiSuccessResponse {
  return response && typeof response === 'object' && response.success === true;
}

/**
 * Utility to check if a response indicates an error
 */
export function isErrorResponse(response: any): response is ApiErrorResponse {
  return response && typeof response === 'object' && response.success === false;
}

/**
 * Migration helper: converts old-style error handling to new format
 */
export function migrateErrorHandling(
  oldErrorHandler: (error: any) => void,
  getErrorMessage: (error: ApiErrorResponse) => string
) {
  return (error: unknown) => {
    if (isApiClientError(error)) {
      const errorResponse = error.toApiErrorResponse();
      const message = getErrorMessage(errorResponse);
      toast.error(message);
    } else {
      // Fall back to old error handling for non-API errors
      oldErrorHandler(error);
    }
  };
}

/**
 * Example usage patterns for migration:
 *
 * 1. Quick replacement for existing toast calls:
 *    // OLD: toast.error(error.response?.data?.message || 'Error')
 *    // NEW: apiToast.error(error)
 *
 * 2. Using the hook in components:
 *    const { callApi, showError, showSuccess } = useApiHelpers();
 *
 *    const handleSubmit = async (data) => {
 *      await callApi(
 *        () => ApiClient.post('/api/endpoint', data),
 *        { showSuccessToast: true }
 *      );
 *    };
 *
 * 3. Wrapping existing API functions:
 *    const createWorkOrder = withApiErrorHandling(
 *      (data) => ApiClient.post('/api/work-orders', data),
 *      { showSuccessToast: true, successMessage: 'Work order created!' }
 *    );
 */