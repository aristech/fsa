import { useState, useCallback } from 'react';

import axiosInstance from 'src/lib/axios';
import { CONFIG } from 'src/global-config';

import { toast } from 'src/components/snackbar';
import { UploadBox, MultiFilePreview } from 'src/components/upload';

// ----------------------------------------------------------------------

type Props = {
  attachments: string[];
  onChange?: (files: (File | string)[]) => void;
};

export function KanbanDetailsAttachments({ attachments, onChange }: Props) {
  const [files, setFiles] = useState<(File | string)[]>(attachments);

  const validateFiles = useCallback((filesToValidate: File[]) => {
    // Check number of files
    if (filesToValidate.length > CONFIG.upload.maxFilesPerRequest) {
      toast.error(`Maximum ${CONFIG.upload.maxFilesPerRequest} files allowed per upload`);
      return false;
    }

    // Check file sizes
    const maxSizeBytes = CONFIG.upload.maxFileSizeMB * 1024 * 1024;
    const oversizedFiles = filesToValidate.filter(file => file.size > maxSizeBytes);
    
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      toast.error(`File(s) too large: ${fileNames}. Maximum size is ${CONFIG.upload.maxFileSizeMB}MB per file.`);
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
        form.append('scope', 'task');
        acceptedFiles.forEach((file) => form.append('files', file));
        
        try {
          const res = await axiosInstance.post('/api/v1/uploads', form, {
            headers: {
              'Content-Type': undefined, // Let browser set multipart boundary
            },
          });
          const urls = (res.data?.data || []).map((f: any) => f.url);
          const next = [...files, ...urls];
          setFiles(next);
          onChange?.(next);
          toast.success(`${acceptedFiles.length} file(s) uploaded successfully`);
        } catch (error: any) {
          // Show backend error message if available, otherwise fallback
          const errorMessage = error.message || 'Upload failed. Previewing locally only.';
          toast.error(errorMessage);
          
          // Still add files for local preview
          const next = [...files, ...acceptedFiles];
          setFiles(next);
          onChange?.(next);
        }
      };
      void upload();
    },
    [files, onChange, validateFiles]
  );

  const handleRemoveFile = useCallback(
    (inputFile: File | string) => {
      const filtered = files.filter((file) => file !== inputFile);
      setFiles(filtered);
      onChange?.(filtered);
    },
    [files, onChange]
  );

  return (
    <MultiFilePreview
      files={files}
      onRemove={(file) => handleRemoveFile(file)}
      endNode={
        <UploadBox 
          onDrop={handleDrop}
          placeholder={
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '8px' }}>
                Max {CONFIG.upload.maxFileSizeMB}MB per file, {CONFIG.upload.maxFilesPerRequest} files max
              </div>
            </div>
          }
        />
      }
      thumbnail={{ sx: { width: 64, height: 64 } }}
    />
  );
}
