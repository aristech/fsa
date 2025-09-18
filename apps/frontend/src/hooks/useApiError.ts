import { useTranslate } from 'src/locales/use-locales';

export interface ApiErrorResponse {
  success: false;
  message?: string;
  messageKey?: string;
  errors?: any;
  meta?: any;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  message?: string;
  messageKey?: string;
  data?: T;
  meta?: any;
}

export type ApiResponse<T = any> = ApiErrorResponse | ApiSuccessResponse<T>;

/**
 * Hook for handling API errors with internationalization support
 * Uses the project's existing useTranslate hook for consistency
 */
export function useApiError() {
  const { t } = useTranslate('api');

  /**
   * Get internationalized message from API response
   * Falls back to provided message if key not found
   */
  const getErrorMessage = (error: ApiErrorResponse): string => {
    if (error.messageKey) {
      // Try to get translated message, using the backend message as fallback
      const translatedMessage = t(error.messageKey, {
        defaultValue: error.message || 'An error occurred'
      });
      return translatedMessage;
    }

    // Fallback to provided message or generic error
    return error.message || t('server.internal_error', {
      defaultValue: 'Something went wrong. Please try again later'
    });
  };

  /**
   * Get internationalized success message from API response
   */
  const getSuccessMessage = (response: ApiSuccessResponse): string => {
    if (response.messageKey) {
      // Try to get translated message, using the backend message as fallback
      const translatedMessage = t(response.messageKey, {
        defaultValue: response.message || 'Operation completed successfully'
      });
      return translatedMessage;
    }

    // Fallback to provided message or generic success
    return response.message || t('success.fetched', {
      defaultValue: 'Operation completed successfully'
    });
  };

  /**
   * Handle API response and return appropriate message
   */
  const handleApiResponse = (response: ApiResponse): {
    isSuccess: boolean;
    message: string;
    data?: any;
  } => {
    if (response.success) {
      return {
        isSuccess: true,
        message: getSuccessMessage(response),
        data: response.data,
      };
    } else {
      return {
        isSuccess: false,
        message: getErrorMessage(response),
      };
    }
  };

  /**
   * Extract error message from various error types
   */
  const extractErrorMessage = (error: unknown): string => {
    // Handle Axios error response
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { data: ApiErrorResponse } };
      if (axiosError.response?.data) {
        return getErrorMessage(axiosError.response.data);
      }
    }

    // Handle direct API error response
    if (error && typeof error === 'object' && 'success' in error) {
      const apiError = error as ApiErrorResponse;
      if (!apiError.success) {
        return getErrorMessage(apiError);
      }
    }

    // Handle standard Error object
    if (error instanceof Error) {
      return error.message;
    }

    // Handle string error
    if (typeof error === 'string') {
      return error;
    }

    // Generic fallback
    return t('server.internal_error', 'Something went wrong. Please try again later');
  };

  return {
    getErrorMessage,
    getSuccessMessage,
    handleApiResponse,
    extractErrorMessage,
  };
}