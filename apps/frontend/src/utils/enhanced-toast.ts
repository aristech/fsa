import type { TFunction } from 'i18next';
import type { ApiErrorResponse, ApiSuccessResponse } from '../hooks/useApiError';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

// Enhanced server response interface with messageKey support
export interface ServerResponse {
  success: boolean;
  message?: string;
  messageKey?: string;
  error?: string;
  data?: any;
  details?: any;
}

export interface EnhancedToastOptions {
  duration?: number;
  position?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top-center'
    | 'bottom-center';
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ----------------------------------------------------------------------

/**
 * Enhanced toast utility that prioritizes server messages and supports translations
 */
export class EnhancedToast {
  private static t: TFunction | null = null;

  /**
   * Initialize the toast utility with translation function
   */
  static initialize(translateFunction: TFunction) {
    EnhancedToast.t = translateFunction;
  }

  /**
   * Get translation for a key, with fallback to the key itself
   */
  private static getTranslation(key: string, fallback?: string): string {
    if (!EnhancedToast.t) {
      console.warn('EnhancedToast not initialized with translation function');
      return fallback || key;
    }

    try {
      const translation = EnhancedToast.t(key);
      // If translation returns the key itself, it means translation is missing
      if (translation === key) {
        return fallback || key;
      }
      return translation;
    } catch (error) {
      console.warn(`Translation failed for key: ${key}`, error);
      return fallback || key;
    }
  }

  /**
   * Extract message from server response with priority:
   * 1. Server response.message (if exists)
   * 2. Translation of response.messageKey (if exists)
   * 3. Fallback message
   * 4. Default message
   */
  private static extractMessage(
    response: ServerResponse | ApiErrorResponse | ApiSuccessResponse | string,
    fallbackMessage?: string,
    defaultMessage?: string
  ): string {
    // If it's a string, return it directly
    if (typeof response === 'string') {
      return response;
    }

    // Priority 1: Use server message if provided
    if (response.message) {
      return response.message;
    }

    // Handle error field for legacy API responses
    if ('error' in response && response.error) {
      return response.error;
    }

    // Priority 2: Try to translate messageKey if provided
    if (response.messageKey) {
      const translated = EnhancedToast.getTranslation(response.messageKey, fallbackMessage);
      if (translated !== response.messageKey) {
        return translated;
      }
    }

    // Priority 3: Use fallback message
    if (fallbackMessage) {
      return fallbackMessage;
    }

    // Priority 4: Default message
    return defaultMessage || 'An unknown error occurred';
  }

  /**
   * Show error toast with enhanced message extraction
   */
  static error(
    response: ServerResponse | ApiErrorResponse | string,
    fallbackMessage?: string,
    options?: EnhancedToastOptions
  ): void {
    const message = EnhancedToast.extractMessage(
      response,
      fallbackMessage,
      EnhancedToast.getTranslation('common.error.generic', 'An error occurred')
    );

    toast.error(message, {
      duration: options?.duration || 4000,
      position: options?.position,
      dismissible: options?.dismissible,
      action: options?.action,
    });

    // Log detailed error information for debugging
    if (typeof response === 'object') {
      console.error('Enhanced Toast Error:', {
        originalResponse: response,
        displayedMessage: message,
        messageKey: response.messageKey,
        serverMessage: response.message,
        fallback: fallbackMessage,
      });
    }
  }

  /**
   * Show success toast with enhanced message extraction
   */
  static success(
    response: ServerResponse | ApiSuccessResponse | string,
    fallbackMessage?: string,
    options?: EnhancedToastOptions
  ): void {
    const message = EnhancedToast.extractMessage(
      response,
      fallbackMessage,
      EnhancedToast.getTranslation('common.success.generic', 'Operation completed successfully')
    );

    toast.success(message, {
      duration: options?.duration || 3000,
      position: options?.position,
      dismissible: options?.dismissible,
      action: options?.action,
    });

    // Log success information for debugging
    if (typeof response === 'object') {
      console.log('Enhanced Toast Success:', {
        originalResponse: response,
        displayedMessage: message,
        messageKey: response.messageKey,
        serverMessage: response.message,
        fallback: fallbackMessage,
      });
    }
  }

  /**
   * Show warning toast with enhanced message extraction
   */
  static warning(
    response: ServerResponse | string,
    fallbackMessage?: string,
    options?: EnhancedToastOptions
  ): void {
    const message = EnhancedToast.extractMessage(
      response,
      fallbackMessage,
      EnhancedToast.getTranslation('common.warning.generic', 'Warning')
    );

    toast.warning(message, {
      duration: options?.duration || 3500,
      position: options?.position,
      dismissible: options?.dismissible,
      action: options?.action,
    });
  }

  /**
   * Show info toast with enhanced message extraction
   */
  static info(
    response: ServerResponse | string,
    fallbackMessage?: string,
    options?: EnhancedToastOptions
  ): void {
    const message = EnhancedToast.extractMessage(
      response,
      fallbackMessage,
      EnhancedToast.getTranslation('common.info.generic', 'Information')
    );

    toast.info(message, {
      duration: options?.duration || 3000,
      position: options?.position,
      dismissible: options?.dismissible,
      action: options?.action,
    });
  }

  /**
   * Handle API response automatically and show appropriate toast
   */
  static handleApiResponse(
    response: ServerResponse | ApiErrorResponse | ApiSuccessResponse,
    options?: {
      successFallback?: string;
      errorFallback?: string;
      toastOptions?: EnhancedToastOptions;
    }
  ): void {
    if (response.success) {
      EnhancedToast.success(response, options?.successFallback, options?.toastOptions);
    } else {
      EnhancedToast.error(response, options?.errorFallback, options?.toastOptions);
    }
  }

  /**
   * Handle subscription limit errors with special formatting
   */
  static subscriptionLimit(
    response: ServerResponse,
    upgradeAction?: () => void,
    options?: EnhancedToastOptions
  ): void {
    const message = EnhancedToast.extractMessage(
      response,
      EnhancedToast.getTranslation(
        'business.subscription_limit_exceeded',
        'Subscription limit exceeded'
      ),
      'Subscription limit exceeded'
    );

    const toastOptions: EnhancedToastOptions = {
      duration: 6000, // Longer duration for subscription errors
      dismissible: true,
      ...options,
    };

    // Add upgrade action if provided
    if (upgradeAction) {
      toastOptions.action = {
        label: EnhancedToast.getTranslation('subscription.upgrade', 'Upgrade'),
        onClick: upgradeAction,
      };
    }

    toast.error(message, toastOptions);
  }

  /**
   * Handle validation errors with structured display
   */
  static validationError(
    response: ServerResponse & { details?: Array<{ field: string; message: string }> },
    options?: EnhancedToastOptions
  ): void {
    let message = EnhancedToast.extractMessage(
      response,
      EnhancedToast.getTranslation('validation.error.generic', 'Validation failed')
    );

    // If we have detailed validation errors, show the first one or a summary
    if (response.details && Array.isArray(response.details) && response.details.length > 0) {
      if (response.details.length === 1) {
        message = response.details[0].message;
      } else {
        const fieldNames = response.details.map((error) => error.field).join(', ');
        message = EnhancedToast.getTranslation(
          'validation.error.multiple',
          `Validation failed for: ${fieldNames}`
        );
      }
    }

    toast.error(message, {
      duration: options?.duration || 5000,
      position: options?.position,
      dismissible: options?.dismissible,
      action: options?.action,
    });
  }

  /**
   * Handle network/connection errors
   */
  static networkError(
    error: unknown,
    fallbackMessage?: string,
    options?: EnhancedToastOptions
  ): void {
    let message =
      fallbackMessage || EnhancedToast.getTranslation('errors.network', 'Network error occurred');

    // Try to extract message from error object
    if (error && typeof error === 'object') {
      if ('message' in error && typeof error.message === 'string') {
        message = error.message;
      } else if ('error' in error && typeof error.error === 'string') {
        message = error.error;
      }
    }

    toast.error(message, {
      duration: options?.duration || 4000,
      position: options?.position,
      dismissible: options?.dismissible,
      action: options?.action,
    });

    console.error('Enhanced Toast Network Error:', error);
  }

  /**
   * Test the toast system with sample messages
   */
  static test(): void {
    console.log('Testing Enhanced Toast System...');

    // Test with messageKey
    EnhancedToast.success({
      success: true,
      messageKey: 'test.success',
      message: 'Server provided success message',
    });

    // Test with server message only
    EnhancedToast.error({
      success: false,
      message: 'User limit exceeded. Current: 2, Limit: 2',
      messageKey: 'business.subscription_limit_exceeded',
    });

    // Test fallback
    EnhancedToast.warning(
      {
        success: false,
        messageKey: 'non.existent.key',
      },
      'Fallback warning message'
    );
  }
}

// ----------------------------------------------------------------------

/**
 * Hook to initialize and use enhanced toast in components
 */
export function useEnhancedToast(translateFunction: TFunction) {
  // Initialize the toast utility
  EnhancedToast.initialize(translateFunction);

  return {
    error: EnhancedToast.error,
    success: EnhancedToast.success,
    warning: EnhancedToast.warning,
    info: EnhancedToast.info,
    handleApiResponse: EnhancedToast.handleApiResponse,
    subscriptionLimit: EnhancedToast.subscriptionLimit,
    validationError: EnhancedToast.validationError,
    networkError: EnhancedToast.networkError,
    test: EnhancedToast.test,
  };
}

// ----------------------------------------------------------------------

/**
 * Legacy compatibility - enhanced versions of existing toast functions
 */

/**
 * Enhanced version of showApiErrorToast
 */
export const showEnhancedApiErrorToast = (
  error: ApiErrorResponse | ServerResponse | string,
  fallbackMessage?: string,
  options?: EnhancedToastOptions
): void => {
  EnhancedToast.error(error, fallbackMessage, options);
};

/**
 * Enhanced version of showApiSuccessToast
 */
export const showEnhancedApiSuccessToast = (
  response: ApiSuccessResponse | ServerResponse | string,
  fallbackMessage?: string,
  options?: EnhancedToastOptions
): void => {
  EnhancedToast.success(response, fallbackMessage, options);
};

/**
 * Enhanced version of handleApiResponseToast
 */
export const handleEnhancedApiResponseToast = (
  response: ServerResponse | ApiErrorResponse | ApiSuccessResponse,
  options?: {
    successFallback?: string;
    errorFallback?: string;
    toastOptions?: EnhancedToastOptions;
  }
): void => {
  EnhancedToast.handleApiResponse(response, options);
};
