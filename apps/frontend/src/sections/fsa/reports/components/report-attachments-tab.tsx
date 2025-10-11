'use client';

import type { IReport } from 'src/lib/models/Report';
import type { FileMetadata } from 'src/components/upload';

import { Box, Stack, Typography } from '@mui/material';

import { extractFileMetadataFromUrl } from 'src/utils/file-url-converter';

import { MultiFilePreview } from 'src/components/upload';
import { EmptyContent } from 'src/components/empty-content';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

// ----------------------------------------------------------------------

interface ReportAttachmentsTabProps {
  report: IReport;
  onUpdate: (report: IReport) => void;
  canEdit: boolean;
}

/**
 * Helper function to convert report attachments to FileMetadata format
 */
const convertToFileMetadata = (
  files: any[],
  reportId: string,
  tenantId: string
): FileMetadata[] =>
  files.map((file) => {
    // Try to extract metadata from URL if available
    const extracted = file.url ? extractFileMetadataFromUrl(file.url) : null;

    return {
      filename: extracted?.filename || file.filename,
      originalName: file.originalName,
      url: file.url,
      size: file.size,
      mimetype: file.mimetype,
      scope: extracted?.scope || 'reports',
      ownerId: extracted?.ownerId || reportId,
      tenantId: extracted?.tenantId || tenantId,
    };
  });

export function ReportAttachmentsTab({ report, onUpdate, canEdit }: ReportAttachmentsTabProps) {
  const { tenant } = useAuthContext();
  const tenantId = report.tenantId || tenant?._id || '';

  const attachments = report.attachments || [];
  const photos = report.photos || [];
  const allFiles = [...attachments, ...photos];

  // Separate signature files from regular attachments
  const signatureFiles = allFiles.filter(
    (attachment) =>
      attachment.signatureType || (attachment.filename && attachment.filename.includes('signature'))
  );

  const regularFiles = allFiles.filter(
    (attachment) =>
      !attachment.signatureType &&
      !(attachment.filename && attachment.filename.includes('signature'))
  );

  if (allFiles.length === 0) {
    return (
      <EmptyContent
        title="No attachments"
        description="No files have been attached to this report yet"
      />
    );
  }

  // Convert files to FileMetadata format for MultiFilePreview
  const photoFiles = convertToFileMetadata(photos, report._id, tenantId);
  const regularFileMetadata = convertToFileMetadata(regularFiles, report._id, tenantId);
  const signatureFileMetadata = convertToFileMetadata(signatureFiles, report._id, tenantId);

  return (
    <Stack spacing={3}>
      {/* Photos Section */}
      {photoFiles.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Photos ({photoFiles.length})
          </Typography>
          <MultiFilePreview
            files={photoFiles}
            orientation="horizontal"
            thumbnail={{ sx: { width: 80, height: 80 } }}
            onRemove={undefined}
          />
        </Box>
      )}

      {/* Regular Attachments Section */}
      {regularFileMetadata.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Attachments ({regularFileMetadata.length})
          </Typography>
          <MultiFilePreview
            files={regularFileMetadata}
            orientation="horizontal"
            thumbnail={{ sx: { width: 80, height: 80 } }}
            onRemove={undefined}
          />
        </Box>
      )}

      {/* Signature Files Section */}
      {signatureFileMetadata.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Signature Files ({signatureFileMetadata.length})
          </Typography>
          <MultiFilePreview
            files={signatureFileMetadata}
            orientation="horizontal"
            thumbnail={{ sx: { width: 80, height: 80 } }}
            onRemove={undefined}
          />
        </Box>
      )}

      {/* Summary */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 1,
          border: 1,
          borderColor: 'grey.200',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Total Files:</Typography>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
            {allFiles.length}
          </Typography>
        </Box>
      </Box>
    </Stack>
  );
}
