'use client';

import { toast } from 'sonner';

// ----------------------------------------------------------------------

export type TaskShareUrl = {
  baseUrl: string;
  taskId: string;
  pattern: 'path' | 'query';
};

export type ShareTaskParams = {
  taskId: string;
  baseUrl?: string;
};

// ----------------------------------------------------------------------

/**
 * Generate a shareable URL for a task
 * Supports both URL patterns:
 * - /dashboard/kanban/{id} (path parameter)
 * - /dashboard/kanban/?task={id} (query parameter)
 */
export function generateTaskShareUrl({ taskId, baseUrl }: ShareTaskParams): TaskShareUrl {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const pathUrl = `${base}/dashboard/kanban/${taskId}`;

  // Default to path pattern for cleaner URLs
  return {
    baseUrl: pathUrl,
    taskId,
    pattern: 'path',
  };
}

/**
 * Copy task share URL to clipboard
 */
export async function copyTaskShareUrl(params: ShareTaskParams): Promise<boolean> {
  try {
    const shareUrl = generateTaskShareUrl(params);

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl.baseUrl);
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl.baseUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    toast.success('Task link copied to clipboard');
    return true;
  } catch (error) {
    console.error('Failed to copy task URL:', error);
    toast.error('Failed to copy link');
    return false;
  }
}

/**
 * Extract task ID from URL parameters
 * Handles both path and query parameter patterns
 */
export function extractTaskIdFromUrl(
  searchParams: URLSearchParams,
  pathname: string
): string | null {
  // Check query parameter first: ?task={id}
  const taskFromQuery = searchParams.get('task');
  if (taskFromQuery) {
    return taskFromQuery;
  }

  // Check path parameter: /dashboard/kanban/{id}
  const pathMatch = pathname.match(/^\/dashboard\/kanban\/([^/?]+)/);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  return null;
}
