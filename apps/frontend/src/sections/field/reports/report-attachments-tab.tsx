'use client';

import type { IReport } from 'src/lib/models/Report';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

import { Box, Avatar, Typography } from '@mui/material';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { MobileButton } from 'src/components/mobile';

// ----------------------------------------------------------------------

interface ReportAttachmentsTabProps {
  report: IReport;
  onUpdate: (updatedReport: IReport) => void;
  canEdit: boolean;
}

export function ReportAttachmentsTab({ report, onUpdate, canEdit }: ReportAttachmentsTabProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      try {
        // In a real implementation, upload files to the server
        // await ReportService.uploadAttachment(report._id, files[0]);
        toast.success('File uploaded successfully');
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error('Failed to upload file');
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const handlePhotoCapture = useCallback(() => {
    // In a real implementation, open camera for photo capture
    toast.info('Camera functionality would open here');
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'eva:image-fill';
    if (mimeType.startsWith('video/')) return 'eva:video-fill';
    if (mimeType.includes('pdf')) return 'eva:file-text-fill';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'eva:file-text-fill';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'eva:file-text-fill';
    return 'eva:attach-fill';
  };

  const allAttachments = [...(report.attachments || []), ...(report.photos || [])];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Attachments ({allAttachments.length})
        </Typography>

        {canEdit && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <MobileButton
              variant="outline"
              size="small"
              startIcon={<Iconify icon="eva:camera-fill" width={16} />}
              onClick={handlePhotoCapture}
            >
              Photo
            </MobileButton>

            <MobileButton
              variant="outline"
              size="small"
              startIcon={<Iconify icon="eva:attach-fill" width={16} />}
              component="label"
              loading={uploading}
            >
              Upload
              <input type="file" hidden multiple accept="*/*" onChange={handleFileUpload} />
            </MobileButton>
          </Box>
        )}
      </Box>

      {allAttachments.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {allAttachments.map((attachment) => (
            <Box
              key={attachment._id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: 'background.paper',
              }}
            >
              <Avatar
                sx={{
                  bgcolor: attachment.mimetype.startsWith('image/')
                    ? 'primary.light'
                    : 'secondary.light',
                  width: 40,
                  height: 40,
                }}
              >
                <Iconify icon={getFileIcon(attachment.mimetype)} width={20} />
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {attachment.originalName}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {formatFileSize(attachment.size)} • Uploaded{' '}
                  {dayjs(attachment.uploadedAt).format('MMM DD, YYYY')}
                </Typography>

                {attachment.uploadedByData && (
                  <Typography variant="caption" color="text.secondary">
                    by {attachment.uploadedByData.name}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <MobileButton
                  variant="outline"
                  size="small"
                  onClick={() => window.open(attachment.url, '_blank')}
                  startIcon={<Iconify icon="eva:external-link-fill" width={14} />}
                >
                  View
                </MobileButton>

                <MobileButton
                  variant="outline"
                  size="small"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = attachment.url;
                    link.download = attachment.originalName;
                    link.click();
                  }}
                  startIcon={<Iconify icon="eva:download-fill" width={14} />}
                >
                  Download
                </MobileButton>
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'background.neutral',
          }}
        >
          <Iconify icon="eva:image-outline" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Attachments
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {canEdit
              ? 'Add photos and files to document your work'
              : 'No files or photos were attached to this report'}
          </Typography>

          {canEdit && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <MobileButton
                variant="outline"
                onClick={handlePhotoCapture}
                startIcon={<Iconify icon="eva:camera-fill" width={16} />}
              >
                Take Photo
              </MobileButton>

              <MobileButton
                variant="outline"
                component="label"
                loading={uploading}
                startIcon={<Iconify icon="eva:attach-fill" width={16} />}
              >
                Upload File
                <input type="file" hidden multiple accept="*/*" onChange={handleFileUpload} />
              </MobileButton>
            </Box>
          )}
        </Box>
      )}

      {/* Signatures Section */}
      {report.signatures && report.signatures.length > 0 && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 600, mt: 2 }}>
            Digital Signatures ({report.signatures.length})
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {report.signatures.map((signature) => (
              <Box
                key={signature._id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  border: '1px solid',
                  borderColor: 'success.light',
                  borderRadius: 1,
                  backgroundColor: 'success.lighter',
                }}
              >
                <Avatar sx={{ bgcolor: 'success.main', color: 'white' }}>
                  <Iconify icon="eva:edit-fill" width={20} />
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {signature.signerName}
                    {signature.signerTitle && ` (${signature.signerTitle})`}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {signature.type.charAt(0).toUpperCase() + signature.type.slice(1)} Signature
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    Signed: {dayjs(signature.signedAt).format('MMM DD, YYYY HH:mm')}
                  </Typography>
                </Box>

                <MobileButton
                  variant="outline"
                  size="small"
                  onClick={() => {
                    // In a real implementation, show signature image
                    toast.info('Signature view would open here');
                  }}
                  startIcon={<Iconify icon="eva:eye-fill" width={14} />}
                >
                  View
                </MobileButton>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
