/*
 * Enhanced Toast Migration Example
 *
 * This file demonstrates how to migrate from the old toast system
 * to the new enhanced toast system with server message support.
 *
 * Key changes:
 * 1. Replace `toast` import with `useEnhancedToast` hook
 * 2. Use `handleApiResponse` for server responses
 * 3. Use specialized functions for specific cases
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

// ============== BEFORE (Old Way) ==============

import { useCallback } from 'react';

import { useTranslate } from 'src/locales/use-locales';

import { toast } from 'src/components/snackbar'; // ❌ Old import

// Mock service for example purposes
const ReportService = {
  deleteReport: async (id: string) => ({ success: true, message: 'Report deleted' }),
  createReport: async (data: any) => ({ success: true, message: 'Report created' }),
  checkLimits: async () => ({ success: true, message: 'Limits checked' }),
  validateReport: async (data: any) => ({ success: true, message: 'Report validated' }),
};

export function ReportsViewOld() {
  const { t } = useTranslate('dashboard');

  const _handleDeleteReport = useCallback(
    async (reportId: string) => {
      try {
        const response = await ReportService.deleteReport(reportId);

        // ❌ Old way - manually checking success and using fallback
        if (response.success) {
          toast.success(t('reports.reportDeleted'));
        } else {
          // ❌ Manual server message handling with fallback
          toast.error(response.message || t('reports.failedToDelete'));
        }
      } catch (error) {
        console.error('Error deleting report:', error);
        // ❌ Generic error handling without server response context
        toast.error(t('reports.failedToDelete'));
      }
    },
    [t]
  );

  // Other examples of old patterns:

  const _handleCreateReport = useCallback(
    async (data: any) => {
      try {
        const response = await ReportService.createReport(data);

        // ❌ Old way - no messageKey support
        if (response.success) {
          toast.success(response.message || t('reports.reportCreated'));
        } else {
          toast.error(response.message || t('reports.failedToCreate'));
        }
      } catch (error) {
        toast.error(t('reports.failedToCreate'));
      }
    },
    [t]
  );

  const handleSubscriptionLimit = useCallback(async () => {
    try {
      const response = await ReportService.checkLimits();

      if (!response.success) {
        // ❌ No special handling for subscription limits
        toast.error(response.message || 'Limit exceeded');
      }
    } catch (_error) {
      toast.error('Error checking limits');
    }
  }, []);

  return null; // Component JSX...
}

// ============== AFTER (New Enhanced Way) ==============

// ✅ Replace old import with enhanced hook
import { useEnhancedToast } from 'src/hooks/useEnhancedToast';

export function ReportsViewNew() {
  const { t } = useTranslate('dashboard');
  // ✅ Use the enhanced toast hook
  const {
    handleApiResponse,
    handleNetworkError,
    success: _success,
    error: _error,
  } = useEnhancedToast();

  const _handleDeleteReport = useCallback(
    async (reportId: string) => {
      try {
        const response = await ReportService.deleteReport(reportId);

        // ✅ Enhanced way - automatic handling with messageKey support
        handleApiResponse(response, {
          successFallback: t('reports.reportDeleted'),
          errorFallback: t('reports.failedToDelete'),
        });

        /*
         * Server response examples that will be handled automatically:
         *
         * Success with messageKey:
         * {
         *   success: true,
         *   message: "Report deleted successfully",
         *   messageKey: "reports.deleted"
         * }
         *
         * Error with messageKey:
         * {
         *   success: false,
         *   message: "Report not found",
         *   messageKey: "errors.notFound"
         * }
         *
         * Error with only message:
         * {
         *   success: false,
         *   message: "Report is associated with active work orders"
         * }
         *
         * The system will:
         * 1. Use server message if provided
         * 2. Fall back to translated messageKey if message is not provided
         * 3. Use the fallback parameter as last resort
         */
      } catch (err) {
        console.error('Error deleting report:', err);
        // ✅ Enhanced network error handling
        handleNetworkError(err, t('reports.failedToDelete'));
      }
    },
    [handleApiResponse, handleNetworkError, t]
  );

  const _handleCreateReport = useCallback(
    async (data: any) => {
      try {
        const response = await ReportService.createReport(data);

        // ✅ Simple one-liner with automatic translation support
        handleApiResponse(response, {
          successFallback: t('reports.reportCreated'),
          errorFallback: t('reports.failedToCreate'),
        });
      } catch (err) {
        handleNetworkError(err, t('reports.failedToCreate'));
      }
    },
    [handleApiResponse, handleNetworkError, t]
  );

  const _handleSubscriptionLimit = useCallback(async () => {
    try {
      const response = await ReportService.checkLimits();

      // ✅ Automatic subscription limit handling with upgrade prompts
      handleApiResponse(response, {
        upgradeAction: () => window.open('/subscription', '_blank'),
      });

      /*
       * If server returns:
       * {
       *   success: false,
       *   message: "Report limit exceeded. Current: 50, Limit: 50",
       *   messageKey: "business.subscription_limit_exceeded"
       * }
       *
       * The system will automatically:
       * 1. Show specialized subscription limit toast
       * 2. Add upgrade button to the toast
       * 3. Use longer duration for visibility
       * 4. Handle the translation properly
       */
    } catch (err) {
      handleNetworkError(err, 'Error checking limits');
    }
  }, [handleApiResponse, handleNetworkError]);

  // ✅ Other enhanced patterns:

  const _handleValidationError = useCallback(
    async (data: any) => {
      try {
        const response = await ReportService.validateReport(data);

        // Validation errors with details are automatically handled
        handleApiResponse(response);

        /*
         * Server response with validation details:
         * {
         *   success: false,
         *   message: "Validation failed",
         *   messageKey: "validation.error.generic",
         *   details: [
         *     { field: "title", message: "Title is required" },
         *     { field: "date", message: "Invalid date format" }
         *   ]
         * }
         *
         * Will automatically show structured validation error toast
         */
      } catch (err) {
        handleNetworkError(err);
      }
    },
    [handleApiResponse, handleNetworkError]
  );

  return null; // Component JSX...
}

// ============== Quick Reference Guide ==============

/*
 * MIGRATION CHECKLIST:
 *
 * ✅ Replace: import { toast } from 'src/components/snackbar';
 *    With:    import { useEnhancedToast } from 'src/hooks/useEnhancedToast';
 *
 * ✅ Replace: const { t } = useTranslate();
 *    With:    const { t } = useTranslate();
 *             const { handleApiResponse, handleNetworkError, success, error } = useEnhancedToast();
 *
 * ✅ Replace: toast.error(response.message || 'fallback');
 *    With:    handleApiResponse(response, { errorFallback: 'fallback' });
 *
 * ✅ Replace: toast.success(response.message || 'fallback');
 *    With:    handleApiResponse(response, { successFallback: 'fallback' });
 *
 * ✅ Replace: toast.error(error.message);
 *    With:    handleNetworkError(error, 'fallback');
 *
 * ✅ Replace: Simple messages like toast.success('Done');
 *    With:    success('Done'); (no change needed for simple strings)
 *
 * BENEFITS:
 *
 * ✅ Automatic messageKey translation support
 * ✅ Server message priority over fallbacks
 * ✅ Specialized subscription limit handling with upgrade buttons
 * ✅ Automatic validation error formatting
 * ✅ Better network error handling
 * ✅ Consistent error message formatting
 * ✅ Debug logging for development
 * ✅ Support for multiple languages without code changes
 */
