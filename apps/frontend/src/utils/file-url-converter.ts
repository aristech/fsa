import React from 'react';

import { generateSignedUrlOnce } from 'src/hooks/use-signed-url';

import { CONFIG } from 'src/global-config';

/**
 * Detects if a URL is using the old JWT token format
 */
export function isOldTokenUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('?token=') || url.includes('&token=');
}

/**
 * Extracts file metadata from old token-based URLs
 * Example: /api/v1/uploads/tenantId/scope/ownerId/filename.jpg?token=xxx
 */
export function extractFileMetadataFromUrl(url: string): {
  filename: string;
  scope: string;
  ownerId: string;
  tenantId: string;
} | null {
  try {
    // Remove query parameters
    const urlWithoutQuery = url.split('?')[0];

    // Extract path parts: /api/v1/uploads/{tenantId}/{scope}/{ownerId}/{filename}
    const pathParts = urlWithoutQuery.split('/');

    // Find the uploads index
    const uploadsIndex = pathParts.indexOf('uploads');
    if (uploadsIndex === -1 || pathParts.length < uploadsIndex + 5) {
      return null;
    }

    const tenantId = pathParts[uploadsIndex + 1];
    const scope = pathParts[uploadsIndex + 2];
    const ownerId = pathParts[uploadsIndex + 3];
    const filename = decodeURIComponent(pathParts[uploadsIndex + 4]);

    return {
      filename,
      scope,
      ownerId,
      tenantId,
    };
  } catch (error) {
    console.error('Failed to extract metadata from URL:', error);
    return null;
  }
}

/**
 * Converts old token-based URL to new signed URL
 * Returns original URL if already a signed URL or conversion fails
 */
export async function convertToSignedUrl(
  url?: string,
  options?: { action?: 'view' | 'download'; expiresInMinutes?: number }
): Promise<string> {
  if (!url) return '';

  // If already a signed URL or not an old token URL, return as-is
  if (!isOldTokenUrl(url)) {
    return url;
  }

  try {
    // Extract metadata from old URL
    const metadata = extractFileMetadataFromUrl(url);
    if (!metadata) {
      console.warn('Could not extract metadata from URL, returning original:', url);
      return url;
    }

    // Generate signed URL
    const signedUrl = await generateSignedUrlOnce(metadata, options);

    // Return full URL with protocol and host
    if (signedUrl.startsWith('http')) {
      return signedUrl;
    }

    // Construct full URL using backend server URL
    return `${CONFIG.serverUrl}${signedUrl}`;
  } catch (error) {
    console.error('Failed to convert to signed URL, returning original:', error);
    return url;
  }
}

/**
 * Hook to automatically convert old URLs to signed URLs
 */
export function useConvertedUrl(url?: string): string | null {
  const [convertedUrl, setConvertedUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!url) {
      setConvertedUrl(null);
      return;
    }

    if (!isOldTokenUrl(url)) {
      setConvertedUrl(url);
      return;
    }

    // Convert old URL to signed URL
    convertToSignedUrl(url).then(setConvertedUrl);
  }, [url]);

  return convertedUrl;
}
