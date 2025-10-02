'use client';

import { useCallback } from 'react';

import { EnhancedToast, useEnhancedToast as useEnhancedToastUtil } from 'src/utils/enhanced-toast';

import { useTranslate } from 'src/locales/use-locales';

// ----------------------------------------------------------------------

/**
 * Hook that provides enhanced toast functionality with translation support
 * This hook automatically initializes the EnhancedToast utility with the current translation function
 */
export function useEnhancedToast() {
  const { t } = useTranslate('common');

  // Initialize the enhanced toast utility with the translation function
  const enhancedToast = useEnhancedToastUtil(t);

  /**
   * Handle API responses with automatic success/error detection
   */
  const handleApiResponse = useCallback(
    (
      response: any,
      options?: {
        successFallback?: string;
        errorFallback?: string;
        upgradeAction?: () => void;
      }
    ) => {
      // Check if it's a subscription limit error
      if (!response.success && response.messageKey?.includes('subscription_limit_exceeded')) {
        return EnhancedToast.subscriptionLimit(response, options?.upgradeAction);
      }

      // Check if it's a validation error with details
      if (!response.success && response.details && Array.isArray(response.details)) {
        return EnhancedToast.validationError(response);
      }

      // Default API response handling
      return enhancedToast.handleApiResponse(response, {
        successFallback: options?.successFallback,
        errorFallback: options?.errorFallback,
      });
    },
    [enhancedToast]
  );

  /**
   * Handle network/connection errors
   */
  const handleNetworkError = useCallback(
    (error: unknown, fallbackMessage?: string) => {
      enhancedToast.networkError(error, fallbackMessage);
    },
    [enhancedToast]
  );

  /**
   * Quick success toast with translation support
   */
  const showSuccess = useCallback(
    (messageOrResponse: string | any, fallback?: string) => {
      enhancedToast.success(messageOrResponse, fallback);
    },
    [enhancedToast]
  );

  /**
   * Quick error toast with translation support
   */
  const showError = useCallback(
    (messageOrResponse: string | any, fallback?: string) => {
      enhancedToast.error(messageOrResponse, fallback);
    },
    [enhancedToast]
  );

  /**
   * Quick warning toast with translation support
   */
  const showWarning = useCallback(
    (messageOrResponse: string | any, fallback?: string) => {
      enhancedToast.warning(messageOrResponse, fallback);
    },
    [enhancedToast]
  );

  /**
   * Quick info toast with translation support
   */
  const showInfo = useCallback(
    (messageOrResponse: string | any, fallback?: string) => {
      enhancedToast.info(messageOrResponse, fallback);
    },
    [enhancedToast]
  );

  return {
    // Main functions
    handleApiResponse,
    handleNetworkError,

    // Quick access functions
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,

    // Specialized functions
    subscriptionLimit: enhancedToast.subscriptionLimit,
    validationError: enhancedToast.validationError,

    // Test function
    test: enhancedToast.test,
  };
}
