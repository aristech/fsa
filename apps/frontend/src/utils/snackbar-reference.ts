/**
 * Snackbar (Sonner) API Reference for the project
 *
 * This file documents the correct usage of the snackbar component
 * which is based on Sonner (https://sonner.emilkowal.ski/)
 */

import { toast } from 'src/components/snackbar';

// Basic Usage Examples:

// 1. Success Messages
toast.success('Operation completed successfully');
toast.success('Data saved', { duration: 3000 });

// 2. Error Messages
toast.error('Something went wrong');
toast.error('Failed to save', { duration: 5000 });

// 3. Warning Messages
toast.warning('Please check your input');

// 4. Info Messages
toast.info('New update available');

// 5. Loading States
const toastId = toast.loading('Saving...');
// Later:
toast.success('Saved successfully', { id: toastId });
// or:
toast.error('Failed to save', { id: toastId });

// 6. Custom Duration
toast.success('Message', { duration: 2000 }); // 2 seconds
toast.error('Error', { duration: Infinity }); // Stays until dismissed

// 7. Dismissing Toasts
toast.dismiss(); // Dismiss all
toast.dismiss(toastId); // Dismiss specific

// 8. Promise-based toasts
toast.promise(fetch('/api/data'), {
  loading: 'Loading data...',
  success: 'Data loaded successfully',
  error: 'Failed to load data',
});

// Available Options for toast methods:
interface ToastOptions {
  id?: string | number;
  duration?: number;
  dismissible?: boolean;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  onDismiss?: () => void;
  onAutoClose?: () => void;
}

// Example with action button:
toast.error('Failed to save', {
  action: {
    label: 'Retry',
    onClick: () => console.log('Retry clicked'),
  },
});

// Example with description:
toast.success('File uploaded', {
  description: 'Your file has been uploaded successfully',
});

/**
 * For our API integration, we primarily use:
 * - toast.success(message) for success responses
 * - toast.error(message) for error responses
 * - toast.warning(message) for warnings (like file upload failures)
 * - Custom duration when needed
 */

export const TOAST_DURATIONS = {
  SHORT: 2000, // 2 seconds
  MEDIUM: 4000, // 4 seconds (default for errors)
  LONG: 6000, // 6 seconds
  SUCCESS: 3000, // 3 seconds (default for success)
} as const;
