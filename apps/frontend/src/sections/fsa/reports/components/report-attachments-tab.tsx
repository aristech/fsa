'use client';

import type { IReport } from 'src/lib/models/Report';

import dayjs from 'dayjs';

import {
  Box,
  Card,
  List,
  Stack,
  Button,
  Avatar,
  ListItem,
  Typography,
  CardContent,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

// ----------------------------------------------------------------------

interface ReportAttachmentsTabProps {
  report: IReport;
  onUpdate: (report: IReport) => void;
  canEdit: boolean;
}

export function ReportAttachmentsTab({ report, onUpdate, canEdit }: ReportAttachmentsTabProps) {
  const attachments = report.attachments || [];
  const photos = report.photos || [];
  const allFiles = [...attachments, ...photos];

  if (allFiles.length === 0) {
    return (
      <EmptyContent
        title="No attachments"
        description="No files have been attached to this report yet"
      />
    );
  }

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) {
      return 'eva:image-fill';
    } else if (mimetype.includes('pdf')) {
      return 'eva:file-text-fill';
    } else if (mimetype.includes('word')) {
      return 'eva:file-text-fill';
    } else if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) {
      return 'eva:file-fill';
    } else {
      return 'eva:file-fill';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (file: any) => {
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.originalName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Stack spacing={3}>
      {/* Photos Section */}
      {photos.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Photos ({photos.length})
          </Typography>
          <Card>
            <CardContent>
              <List>
                {photos.map((photo, index) => (
                  <ListItem key={index} divider={index < photos.length - 1}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        <Iconify icon="eva:image-fill" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={photo.originalName}
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(photo.size)} • Uploaded{' '}
                            {dayjs(photo.uploadedAt).format('MMM DD, YYYY')}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            by {photo.uploadedByData?.name || 'Unknown User'}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        startIcon={<Iconify icon="eva:download-fill" />}
                        onClick={() => handleDownload(photo)}
                      >
                        Download
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Attachments Section */}
      {attachments.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Attachments ({attachments.length})
          </Typography>
          <Card>
            <CardContent>
              <List>
                {attachments.map((attachment, index) => (
                  <ListItem key={index} divider={index < attachments.length - 1}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.light' }}>
                        <Iconify icon={getFileIcon(attachment.mimetype)} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={attachment.originalName}
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(attachment.size)} • Uploaded{' '}
                            {dayjs(attachment.uploadedAt).format('MMM DD, YYYY')}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            by {attachment.uploadedByData?.name || 'Unknown User'}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        startIcon={<Iconify icon="eva:download-fill" />}
                        onClick={() => handleDownload(attachment)}
                      >
                        Download
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
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
