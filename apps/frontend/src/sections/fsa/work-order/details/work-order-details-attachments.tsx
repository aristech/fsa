import { useState, useEffect, useCallback } from 'react';

import axiosInstance from 'src/lib/axios';
import { CONFIG } from 'src/global-config';

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

  // Update uploadedAttachments when props change (e.g., from SWR refresh)
  useEffect(() => {
    setUploadedAttachments(attachments);
  }, [attachments]);

  // Convert attachments to file preview format
  const displayFiles = [...uploadedAttachments.map((att) => att.url), ...files];

  const validateFiles = useCallback((filesToValidate: File[]) => {
    // Check number of files
    if (filesToValidate.length > CONFIG.upload.maxFilesPerRequest) {
      toast.error(`Maximum ${CONFIG.upload.maxFilesPerRequest} files allowed per upload`);
      return false;
    }

    // Check file sizes
    const maxSizeBytes = CONFIG.upload.maxFileSizeMB * 1024 * 1024;
    const oversizedFiles = filesToValidate.filter((file) => file.size > maxSizeBytes);

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map((f) => f.name).join(', ');
      toast.error(
        `File(s) too large: ${fileNames}. Maximum size is ${CONFIG.upload.maxFileSizeMB}MB per file.`
      );
      return false;
    }

    return true;
  }, []);

  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Validate files before uploading
      if (!validateFiles(acceptedFiles)) {
        return;
      }

      const upload = async () => {
        const form = new FormData();
        form.append('scope', 'workOrder');
        form.append('workOrderId', workOrderId);
        acceptedFiles.forEach((file) => form.append('files', file));

        try {
          const res = await axiosInstance.post('/api/v1/uploads', form, {
            headers: {
              'Content-Type': undefined, // Let browser set multipart boundary
            },
          });
          const uploadedFiles = res.data?.data || [];

          // Convert upload response to attachment format
          const newAttachments: Attachment[] = uploadedFiles.map((f: any) => ({
            name: f.name || 'Unknown',
            url: f.url,
            type: f.mime || 'application/octet-stream',
            size: f.size || 0,
          }));

          const allAttachments = [...uploadedAttachments, ...newAttachments];
          setUploadedAttachments(allAttachments);
          onChange?.(allAttachments);
          // Clear local files after successful upload
          setFiles([]);
          toast.success(`${acceptedFiles.length} file(s) uploaded successfully`);
        } catch (error: any) {
          // Show backend error message if available, otherwise fallback
          const errorMessage = error.message || 'Upload failed. Previewing locally only.';
          toast.error(errorMessage);

          // Still add files for local preview
          setFiles((prev) => [...prev, ...acceptedFiles]);
        }
      };
      void upload();
    },
    [uploadedAttachments, workOrderId, onChange, validateFiles]
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
      onRemove={(file) => handleRemoveFile(file)}
      endNode={
        <UploadBox
          onDrop={handleDrop}
          placeholder={
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '8px' }}>
                Max {CONFIG.upload.maxFileSizeMB}MB per file, {CONFIG.upload.maxFilesPerRequest}{' '}
                files max
              </div>
            </div>
          }
        />
      }
      thumbnail={{ sx: { width: 64, height: 64 } }}
    />
  );
}
