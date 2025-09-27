import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface SubtaskAttachment {
  _id: string;
  filename: string;
  originalName: string;
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
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (attachmentId: string) => Promise<void>;
  isUploading?: boolean;
}

export function SubtaskAttachments({
  attachments = [],
  onUpload,
  onDelete,
  isUploading = false,
}: SubtaskAttachmentsProps) {
  const [dragOver, setDragOver] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB limit
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
    onDropAccepted: () => setDragOver(false),
    onDropRejected: () => setDragOver(false),
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const getFileIcon = (mimetype: string): string => {
    if (mimetype.startsWith('image/')) return 'eva:image-fill';
    if (mimetype === 'application/pdf') return 'eva:file-text-fill';
    if (mimetype.includes('word') || mimetype.includes('document')) return 'eva:file-text-fill';
    if (mimetype.includes('sheet') || mimetype.includes('excel')) return 'eva:grid-fill';
    if (mimetype.includes('text')) return 'eva:edit-fill';
    return 'eva:file-fill';
  };

  const getFileIconColor = (mimetype: string): string => {
    if (mimetype.startsWith('image/')) return 'success.main';
    if (mimetype === 'application/pdf') return 'error.main';
    if (mimetype.includes('word') || mimetype.includes('document')) return 'info.main';
    if (mimetype.includes('sheet') || mimetype.includes('excel')) return 'warning.main';
    if (mimetype.includes('text')) return 'text.secondary';
    return 'text.secondary';
  };

  const isImage = (mimetype: string): boolean => mimetype.startsWith('image/');

  const getImagePreviewUrl = (filename: string): string => `${CONFIG.serverUrl}/uploads/subtask-attachments/${filename}`;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFileClick = (attachment: SubtaskAttachment) => {
    const fileUrl = getImagePreviewUrl(attachment.filename);
    // Open all files in new tab
    window.open(fileUrl, '_blank');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {/* Upload Area */}
      <Box
        {...getRootProps()}
        sx={{
          p: 1.5,
          border: '2px dashed',
          borderColor: isDragActive || dragOver ? 'primary.main' : 'divider',
          borderRadius: 1,
          bgcolor: isDragActive || dragOver ? 'primary.lighter' : 'background.neutral',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          width: '100%',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.lighter',
          },
        }}
      >
        <input {...getInputProps()} />
        <Box sx={{ textAlign: 'center' }}>
          {isUploading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="caption" color="text.secondary">
                Uploading...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <Iconify icon="eva:cloud-upload-fill" width={24} color="text.secondary" />
              <Typography variant="caption" color="text.secondary">
                Drop files or click to browse
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <Box sx={{ mt: 2, width: '100%' }}>
          <Typography variant="caption" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
            {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
          </Typography>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            width: '100%',
            maxWidth: '100%'
          }}>
            {attachments.map((attachment) => (
              <Box
                key={attachment._id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  width: '100%',
                  minWidth: 0,
                }}
              >
                {/* File Preview/Icon */}
                <Tooltip title="Click to open in new tab">
                  <Box
                    sx={{ flexShrink: 0, position: 'relative' }}
                    onClick={() => handleFileClick(attachment)}
                  >
                    {isImage(attachment.mimetype) ? (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'background.neutral',
                          position: 'relative',
                          '&:hover': {
                            borderColor: 'primary.main',
                            transform: 'scale(1.05)',
                            '&::after': {
                              opacity: 1,
                            }
                          },
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                            pointerEvents: 'none',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Box
                          component="img"
                          src={getImagePreviewUrl(attachment.filename)}
                          alt={attachment.originalName}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            // If image fails to load, show a placeholder background
                            const target = e.currentTarget as HTMLImageElement;
                            const parent = target.parentElement;
                            if (parent) {
                              parent.style.backgroundImage = 'none';
                              parent.style.backgroundColor = '#f5f5f5';
                              parent.innerHTML = `
                                <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                                  </svg>
                                </div>
                              `;
                            }
                          }}
                        />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'background.neutral',
                          cursor: 'pointer',
                          '&:hover': {
                            borderColor: 'primary.main',
                            transform: 'scale(1.05)',
                            bgcolor: 'primary.lighter',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Iconify
                          icon={getFileIcon(attachment.mimetype)}
                          width={20}
                          color={getFileIconColor(attachment.mimetype)}
                        />
                      </Box>
                    )}
                  </Box>
                </Tooltip>

                {/* File Info */}
                <Box
                  sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    mr: 1,
                    cursor: 'pointer',
                    borderRadius: 1,
                    p: 0.5,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                    transition: 'background-color 0.2s ease',
                  }}
                  onClick={() => handleFileClick(attachment)}
                  title="Click to open in new tab"
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'medium',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      '&:hover': {
                        color: 'primary.main',
                      },
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {attachment.originalName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {formatFileSize(attachment.size)}
                    <Box component="span" sx={{ ml: 1, fontWeight: 'medium', color: 'primary.main', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      • Click to open
                      <Iconify icon="eva:external-link-fill" width={10} />
                    </Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {attachment.uploadedBy.name} • {formatDate(attachment.uploadedAt)}
                  </Typography>
                </Box>

                {/* Action Buttons */}
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  flexShrink: 0
                }}>
                  <Tooltip title="Download">
                    <IconButton
                      size="small"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = `${CONFIG.serverUrl}/uploads/subtask-attachments/${attachment.filename}`;
                        link.download = attachment.originalName;
                        link.click();
                      }}
                      sx={{ minWidth: 24, height: 24 }}
                    >
                      <Iconify icon="eva:download-fill" width={14} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onDelete(attachment._id)}
                      sx={{ minWidth: 24, height: 24 }}
                    >
                      <Iconify icon="eva:trash-2-fill" width={14} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

    </Box>
  );
}