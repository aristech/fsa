import { useState, useEffect, useCallback } from 'react';

import axiosInstance from 'src/lib/axios';

/**
 * Hook to generate and manage signed URLs for secure file access
 *
 * @param fileData - File metadata (filename, scope, ownerId, tenantId)
 * @param action - 'view' or 'download'
 * @param enabled - Whether to fetch the signed URL immediately
 * @returns Signed URL, loading state, error, and refresh function
 */

export interface FileData {
  filename: string;
  scope: string;
  ownerId: string;
  tenantId?: string;
}

export interface UseSignedUrlOptions {
  action?: 'view' | 'download';
  expiresInMinutes?: number;
  enabled?: boolean;
}

export interface UseSignedUrlResult {
  signedUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  expiresAt: number | null;
  isExpired: boolean;
}

export function useSignedUrl(
  fileData: FileData | null,
  options: UseSignedUrlOptions = {}
): UseSignedUrlResult {
  const { action = 'view', expiresInMinutes, enabled = true } = options;

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const generateSignedUrl = useCallback(async () => {
    if (!fileData || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post('/api/v1/files/signed-url', {
        filename: fileData.filename,
        scope: fileData.scope,
        ownerId: fileData.ownerId,
        tenantId: fileData.tenantId,
        action,
        expiresInMinutes,
      });

      if (response.data.success) {
        setSignedUrl(response.data.data.url);
        setExpiresAt(response.data.data.expiresAt);
      } else {
        throw new Error(response.data.error || 'Failed to generate signed URL');
      }
    } catch (err) {
      console.error('Error generating signed URL:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setSignedUrl(null);
      setExpiresAt(null);
    } finally {
      setIsLoading(false);
    }
  }, [fileData, action, expiresInMinutes, enabled]);

  // Generate signed URL on mount and when dependencies change
  useEffect(() => {
    if (enabled && fileData) {
      generateSignedUrl();
    }
  }, [generateSignedUrl, enabled, fileData]);

  // Check if URL is expired
  const isExpired = expiresAt ? Date.now() > expiresAt : false;

  // Auto-refresh before expiry (5 minutes before)
  useEffect(() => {
    if (!expiresAt || !enabled) return undefined;

    const timeUntilExpiry = expiresAt - Date.now();
    const refreshTime = timeUntilExpiry - 5 * 60 * 1000; // 5 minutes before expiry

    if (refreshTime > 0) {
      const timer = setTimeout(() => {
        generateSignedUrl();
      }, refreshTime);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [expiresAt, generateSignedUrl, enabled]);

  return {
    signedUrl,
    isLoading,
    error,
    refresh: generateSignedUrl,
    expiresAt,
    isExpired,
  };
}

/**
 * Hook to generate signed URLs for multiple files at once
 */
export function useSignedUrls(
  files: FileData[],
  options: UseSignedUrlOptions = {}
): {
  signedUrls: Map<string, string>;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const { action = 'view', expiresInMinutes, enabled = true } = options;

  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateSignedUrls = useCallback(async () => {
    if (!files.length || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post('/api/v1/files/signed-urls/batch', {
        files: files.map((f) => ({
          filename: f.filename,
          scope: f.scope,
          ownerId: f.ownerId,
          tenantId: f.tenantId,
        })),
        action,
        expiresInMinutes,
      });

      if (response.data.success) {
        const urlMap = new Map<string, string>();
        response.data.data.forEach((item: any) => {
          urlMap.set(item.filename, item.url);
        });
        setSignedUrls(urlMap);
      } else {
        throw new Error(response.data.error || 'Failed to generate signed URLs');
      }
    } catch (err) {
      console.error('Error generating signed URLs:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [files, action, expiresInMinutes, enabled]);

  useEffect(() => {
    if (enabled && files.length > 0) {
      generateSignedUrls();
    }
  }, [generateSignedUrls, enabled, files.length]);

  return {
    signedUrls,
    isLoading,
    error,
    refresh: generateSignedUrls,
  };
}

/**
 * Utility function to generate a signed URL on-demand (non-hook)
 */
export async function generateSignedUrlOnce(
  fileData: FileData,
  options: { action?: 'view' | 'download'; expiresInMinutes?: number } = {}
): Promise<string> {
  const { action = 'view', expiresInMinutes } = options;

  const response = await axiosInstance.post('/api/v1/files/signed-url', {
    filename: fileData.filename,
    scope: fileData.scope,
    ownerId: fileData.ownerId,
    tenantId: fileData.tenantId,
    action,
    expiresInMinutes,
  });

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to generate signed URL');
  }

  return response.data.data.url;
}
