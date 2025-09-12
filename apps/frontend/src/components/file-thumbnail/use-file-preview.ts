'use client';

import { useRef, useState, useEffect } from 'react';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export type UseFilePreviewReturn = {
  previewUrl: string;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string>>;
};

export function useFilePreview(file?: File | string | null): UseFilePreviewReturn {
  const objectUrlRef = useRef<string>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    // Cleanup old object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (file instanceof File) {
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
    } else if (typeof file === 'string') {
      const isAbsolute = /^https?:\/\//i.test(file);
      let url = isAbsolute ? file : `${CONFIG.serverUrl}${file}`;
      // If it's an uploads route without token, append JWT token for image requests
      try {
        const isUploads = /\/api\/v1\/uploads\//.test(url);
        const hasToken = /[?&]token=/.test(url);
        if (isUploads && !hasToken && typeof window !== 'undefined') {
          const token = window.sessionStorage.getItem('jwt_access_token');
          if (token) {
            url += (url.includes('?') ? '&' : '?') + `token=${token}`;
          }
        }
      } catch {
        // Ignore errors when creating preview URL
      }
      setPreviewUrl(url);
    } else {
      setPreviewUrl('');
    }

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [file]);

  return {
    previewUrl,
    setPreviewUrl,
  };
}

// ----------------------------------------------------------------------

export type FilePreviewItem = {
  previewUrl: string;
  file: File | string;
};

export type UseFilesPreviewReturn = {
  filesPreview: FilePreviewItem[];
  setFilesPreview: React.Dispatch<React.SetStateAction<FilePreviewItem[]>>;
};

export function revokeObjectUrls(urls: string[]) {
  urls.forEach((url) => URL.revokeObjectURL(url));
}

export function useFilesPreview(files: (File | string)[]): UseFilesPreviewReturn {
  const objectUrlsRef = useRef<string[]>([]);
  const [filesPreview, setFilesPreview] = useState<FilePreviewItem[]>([]);

  useEffect(() => {
    // Cleanup old object URLs
    revokeObjectUrls(objectUrlsRef.current);
    objectUrlsRef.current = [];

    const previews: FilePreviewItem[] = files.map((file) => {
      const isFile = file instanceof File;
      const previewUrl = isFile
        ? URL.createObjectURL(file)
        : /^https?:\/\//i.test(file as string)
          ? (file as string)
          : `${CONFIG.serverUrl}${file as string}`;

      if (isFile) objectUrlsRef.current.push(previewUrl);

      return {
        file,
        previewUrl,
      };
    });

    setFilesPreview(previews);

    return () => {
      revokeObjectUrls(objectUrlsRef.current);
      objectUrlsRef.current = [];
    };
  }, [files]);

  return {
    filesPreview,
    setFilesPreview,
  };
}
