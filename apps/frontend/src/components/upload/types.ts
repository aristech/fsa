import type { DropzoneOptions } from 'react-dropzone';
import type { Theme, SxProps } from '@mui/material/styles';
import type { UploadWrapper } from './default/styles';
import type { RejectedFiles } from './components/rejected-files';
import type { PreviewOrientation, MultiFilePreviewProps } from './components/multi-file-preview';

// ----------------------------------------------------------------------

export interface FileMetadata {
  filename: string;
  originalName?: string;
  url?: string;
  signedUrl?: string;
  size?: number;
  mimetype?: string;
  scope?: string;
  ownerId?: string;
  tenantId?: string;
  uploadedAt?: string;
  uploadedBy?: any;
}

export type FileUploadType = File | string | FileMetadata | null;
export type FilesUploadType = (File | string | FileMetadata)[];

export type UploadProps = DropzoneOptions & {
  error?: boolean;
  loading?: boolean;
  className?: string;
  sx?: SxProps<Theme>;
  hideFilesRejected?: boolean;
  helperText?: React.ReactNode;
  placeholder?: React.ReactNode;
  previewOrientation?: PreviewOrientation;
  value?: FileUploadType | FilesUploadType;
  onDelete?: () => void;
  onUpload?: () => void;
  onRemoveAll?: () => void;
  onRemove?: (file: File | string | FileMetadata) => void;
  slotProps?: {
    wrapper?: React.ComponentProps<typeof UploadWrapper>;
    multiPreview?: Partial<MultiFilePreviewProps>;
    rejectedFiles?: React.ComponentProps<typeof RejectedFiles>;
  };
};
