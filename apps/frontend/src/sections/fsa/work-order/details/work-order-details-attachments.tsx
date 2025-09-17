import { useState, useEffect, useCallback } from 'react';

import axiosInstance from 'src/lib/axios';
import { CONFIG } from 'src/global-config';
import { useTranslate } from 'src/locales/use-locales';

import { toast } from 'src/components/snackbar';
import { UploadBox, MultiFilePreview } from 'src/components/upload';

// ----------------------------------------------------------------------

type Attachment = {
  name: string;
  url: string;
  type: string;
  size: number;
};

type Props = {
  attachments: Attachment[];
  workOrderId: string;
  onChange?: (attachments: Attachment[]) => void;
};

export function WorkOrderDetailsAttachments({ attachments, workOrderId, onChange }: Props) {
  const [files, setFiles] = useState<(File | string)[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>(attachments);
  const { t } = useTranslate('common');

  // Update uploadedAttachments when props change (e.g., from SWR refresh)
  useEffect(() => {
    setUploadedAttachments(attachments);
  }, [attachments]);

  // Convert attachments to file preview format
  const displayFiles = [...uploadedAttachments.map((att) => att.url), ...files];

  const validateFiles = useCallback((filesToValidate: File[]) => {
    // Check number of files
    if (filesToValidate.length > CONFIG.upload.maxFilesPerRequest) {
      toast.error(t('maxFilesAllowed', { defaultValue: 'Maximum {{count}} files allowed per upload', count: CONFIG.upload.maxFilesPerRequest }));
      return false;
    }

    // Check file sizes
    const maxSizeBytes = CONFIG.upload.maxFileSizeMB * 1024 * 1024;
    const oversizedFiles = filesToValidate.filter((file) => file.size > maxSizeBytes);

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map((f) => f.name).join(', ');
      toast.error(
        t('filesTooLarge', { defaultValue: 'File(s) too large: {{names}}. Maximum size is {{max}}MB per file.', names: fileNames, max: CONFIG.upload.maxFileSizeMB })
      );
      return false;
    }

    return true;
  }, [t]);

  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      console.log('🔧 FRONTEND: handleDrop called with files:', acceptedFiles.map(f => f.name));
      // Validate files before uploading
      if (!validateFiles(acceptedFiles)) {
        console.log('🔧 FRONTEND: File validation failed');
        return;
      }

      const upload = async () => {
        console.log('🔧 FRONTEND: Starting upload with workOrderId:', workOrderId);
        const form = new FormData();
        form.append('scope', 'workOrder');
        form.append('workOrderId', workOrderId);
        acceptedFiles.forEach((file) => form.append('files', file));
        
        // Debug FormData contents
        console.log('🔧 FRONTEND: FormData contents:');
        for (const [key, value] of form.entries()) {
          console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
        }
        console.log('🔧 FRONTEND: Making POST request to /api/v1/uploads');

        try {
          const res = await axiosInstance.post('/api/v1/uploads', form, {
            headers: {
              'Content-Type': undefined, // Let browser set multipart boundary
            },
          });
          console.log('🔧 FRONTEND: Upload response received:', res.data);
          const uploadedFiles = res.data?.data || [];

          // Convert upload response to attachment format
          const newAttachments: Attachment[] = uploadedFiles.map((f: any) => ({
            name: f.name || t('unknown', { defaultValue: 'Unknown' }),
            url: f.url,
            type: f.mime || 'application/octet-stream',
            size: f.size || 0,
          }));

          const allAttachments = [...uploadedAttachments, ...newAttachments];
          setUploadedAttachments(allAttachments);
          onChange?.(allAttachments);
          // Clear local files after successful upload
          setFiles([]);
          toast.success(t('filesUploaded', { defaultValue: '{{count}} file(s) uploaded successfully', count: acceptedFiles.length }));
        } catch (error: any) {
          console.error('🔧 FRONTEND: Upload failed:', error);
          // Show backend error message if available, otherwise fallback
          const errorMessage = error.message || t('uploadFailedPreview', { defaultValue: 'Upload failed. Previewing locally only.' });
          toast.error(errorMessage);

          // Still add files for local preview
          setFiles((prev) => [...prev, ...acceptedFiles]);
        }
      };
      void upload();
    },
    [uploadedAttachments, workOrderId, onChange, validateFiles, t]
  );

  const handleRemoveFile = useCallback(
    (inputFile: File | string) => {
      if (typeof inputFile === 'string') {
        // Remove from uploaded attachments
        const filtered = uploadedAttachments.filter((att) => att.url !== inputFile);
        setUploadedAttachments(filtered);
        onChange?.(filtered);
      } else {
        // Remove from local files
        const filtered = files.filter((file) => file !== inputFile);
        setFiles(filtered);
      }
    },
    [files, uploadedAttachments, onChange]
  );

  return (
    <MultiFilePreview
      files={displayFiles}
      onRemove={handleRemoveFile}
      endNode={
        <UploadBox
          onDrop={handleDrop}
          placeholder={
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '8px' }}>
                {t('uploadLimits', { defaultValue: 'Max {{size}}MB per file, {{count}} files max', size: CONFIG.upload.maxFileSizeMB, count: CONFIG.upload.maxFilesPerRequest })}
              </div>
            </div>
          }
        />
      }
      thumbnail={{ sx: { width: 64, height: 64 } }}
    />
  );
}
