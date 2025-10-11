import type { FileMetadata } from 'src/components/upload/types';

import { useCallback } from 'react';

import { CONFIG } from 'src/global-config';

import { UploadBox, MultiFilePreview } from 'src/components/upload';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

// ----------------------------------------------------------------------

interface SubtaskAttachment {
  _id: string;
  filename: string;
  originalName: string;
  url?: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
  uploadedBy: {
    _id: string;
    name: string;
    email?: string;
  };
}

interface SubtaskAttachmentsProps {
  attachments?: SubtaskAttachment[];
  subtaskId?: string;
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (attachmentId: string) => Promise<void>;
  isUploading?: boolean;
}

export function SubtaskAttachments({
  attachments = [],
  subtaskId,
  onUpload,
  onDelete,
  isUploading = false,
}: SubtaskAttachmentsProps) {
  const { tenant } = useAuthContext();
  const tenantId = tenant?._id;

  // Convert subtask attachments to FileMetadata format
  // MultiFilePreview will handle signed URL generation automatically
  const fileMetadata: FileMetadata[] = attachments.map((att) => ({
    filename: att.filename,
    originalName: att.originalName,
    url: att.url, // Can be undefined - MultiFilePreview will generate signed URL
    size: att.size,
    mimetype: att.mimetype,
    scope: 'subtasks',
    ownerId: subtaskId || 'unknown',
    tenantId,
    uploadedAt: att.uploadedAt,
    uploadedBy: att.uploadedBy,
  }));

  const handleRemove = useCallback(
    (file: File | string | FileMetadata) => {
      // Find the attachment ID from the file
      if (typeof file === 'object' && !(file instanceof File)) {
        const fileMeta = file as FileMetadata;
        const attachment = attachments.find((att) => att.filename === fileMeta.filename);
        if (attachment) {
          onDelete(attachment._id);
        }
      }
    },
    [attachments, onDelete]
  );

  return (
    <MultiFilePreview
      files={fileMetadata}
      onRemove={handleRemove}
      endNode={
        <UploadBox
          onDrop={onUpload}
          disabled={isUploading}
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
