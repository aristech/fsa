'use client';

import useSWR from 'swr';
import { useState, useEffect, useCallback } from 'react';

import {
  Box,
  Card,
  Chip,
  Stack,
  Avatar,
  Collapse,
  Typography,
  IconButton,
} from '@mui/material';

import { CONFIG } from 'src/global-config';
import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { UploadBox, MultiFilePreview } from 'src/components/upload';

// ----------------------------------------------------------------------

type Attachment = {
  name: string;
  url: string;
  type: string;
  size: number;
};

type GroupedAttachment = {
  source: 'workOrder' | 'task' | 'subtask';
  sourceName: string;
  sourceId: string;
  taskTitle?: string;
  subtaskTitle?: string;
  attachment: Attachment;
};

type Props = {
  attachments: Attachment[];
  workOrderId: string;
  onChange?: (attachments: Attachment[]) => void;
};

export function WorkOrderDetailsAttachments({ attachments, workOrderId, onChange }: Props) {
  const [files, setFiles] = useState<(File | string)[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>(attachments);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    workOrder: true,
    tasks: true,
    subtasks: true,
  });
  const { t } = useTranslate('common');

  // Fetch all tasks for this work order
  const { data: tasksResponse } = useSWR(
    `${endpoints.kanban}?workOrderId=${workOrderId}`,
    (url: string) => axiosInstance.get(url).then((r) => r.data),
    { revalidateOnFocus: true }
  );

  const tasks = tasksResponse?.data?.board?.tasks || [];

  // Update uploadedAttachments when props change (e.g., from SWR refresh)
  useEffect(() => {
    setUploadedAttachments(attachments);
  }, [attachments]);

  // Group all attachments by source
  const groupedAttachments: GroupedAttachment[] = [];

  // 1. Work order attachments
  uploadedAttachments.forEach((att) => {
    groupedAttachments.push({
      source: 'workOrder',
      sourceName: t('workOrder', { defaultValue: 'Work Order' }),
      sourceId: workOrderId,
      attachment: att,
    });
  });

  // 2. Task and subtask attachments
  tasks.forEach((task: any) => {
    // Task attachments (stored as string URLs, not objects)
    if (task.attachments && Array.isArray(task.attachments)) {
      task.attachments.forEach((taskAtt: any) => {
        // Task attachments are strings (URLs), not objects
        if (typeof taskAtt === 'string') {
          // Extract filename from URL
          const urlParts = taskAtt.split('/');
          const filenameWithQuery = urlParts[urlParts.length - 1];
          const filename = decodeURIComponent(filenameWithQuery.split('?')[0]);

          // Guess mime type from file extension
          const ext = filename.split('.').pop()?.toLowerCase() || '';
          let mimetype = 'application/octet-stream';
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) mimetype = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          else if (ext === 'pdf') mimetype = 'application/pdf';
          else if (['doc', 'docx'].includes(ext)) mimetype = 'application/msword';
          else if (['xls', 'xlsx'].includes(ext)) mimetype = 'application/vnd.ms-excel';
          else if (['zip', 'rar'].includes(ext)) mimetype = 'application/zip';

          groupedAttachments.push({
            source: 'task',
            sourceName: t('task', { defaultValue: 'Task' }),
            sourceId: task._id,
            taskTitle: task.name || task.title,
            attachment: {
              name: filename,
              url: taskAtt,
              type: mimetype,
              size: 0, // Size not available for task attachments
            },
          });
        } else if (taskAtt && typeof taskAtt === 'object') {
          // In case task attachments are objects (future compatibility)
          groupedAttachments.push({
            source: 'task',
            sourceName: t('task', { defaultValue: 'Task' }),
            sourceId: task._id,
            taskTitle: task.name || task.title,
            attachment: {
              name: taskAtt.originalName || taskAtt.name || taskAtt.filename,
              url: taskAtt.url,
              type: taskAtt.mimetype || taskAtt.type || 'application/octet-stream',
              size: taskAtt.size || 0,
            },
          });
        }
      });
    }

    // Subtask attachments (stored as objects with metadata)
    if (task.subtasks && Array.isArray(task.subtasks)) {
      task.subtasks.forEach((subtask: any) => {
        if (subtask.attachments && Array.isArray(subtask.attachments)) {
          subtask.attachments.forEach((subtaskAtt: any) => {
            // Subtask attachments are objects with full metadata
            const url = subtaskAtt.url || `/api/v1/uploads/${subtaskAtt.filename}`;
            groupedAttachments.push({
              source: 'subtask',
              sourceName: t('subtask', { defaultValue: 'Subtask' }),
              sourceId: subtask._id,
              taskTitle: task.name || task.title,
              subtaskTitle: subtask.title,
              attachment: {
                name: subtaskAtt.originalName || subtaskAtt.filename || subtaskAtt.name,
                url,
                type: subtaskAtt.mimetype || subtaskAtt.type || 'application/octet-stream',
                size: subtaskAtt.size || 0,
              },
            });
          });
        }
      });
    }
  });

  // Group by source type
  const workOrderAttachments = groupedAttachments.filter((g) => g.source === 'workOrder');
  const taskAttachments = groupedAttachments.filter((g) => g.source === 'task');
  const subtaskAttachments = groupedAttachments.filter((g) => g.source === 'subtask');

  // Convert attachments to file preview format (only work order files are editable)
  const displayFiles = [...uploadedAttachments.map((att) => att.url), ...files];

  const validateFiles = useCallback(
    (filesToValidate: File[]) => {
      // Check number of files
      if (filesToValidate.length > CONFIG.upload.maxFilesPerRequest) {
        toast.error(
          t('maxFilesAllowed', {
            defaultValue: 'Maximum {{count}} files allowed per upload',
            count: CONFIG.upload.maxFilesPerRequest,
          })
        );
        return false;
      }

      // Check file sizes
      const maxSizeBytes = CONFIG.upload.maxFileSizeMB * 1024 * 1024;
      const oversizedFiles = filesToValidate.filter((file) => file.size > maxSizeBytes);

      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map((f) => f.name).join(', ');
        toast.error(
          t('filesTooLarge', {
            defaultValue: 'File(s) too large: {{names}}. Maximum size is {{max}}MB per file.',
            names: fileNames,
            max: CONFIG.upload.maxFileSizeMB,
          })
        );
        return false;
      }

      return true;
    },
    [t]
  );

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
          toast.success(
            t('filesUploaded', {
              defaultValue: '{{count}} file(s) uploaded successfully',
              count: acceptedFiles.length,
            })
          );
        } catch (error: any) {
          console.error('🔧 FRONTEND: Upload failed:', error);
          // Show backend error message if available, otherwise fallback
          const errorMessage =
            error.message ||
            t('uploadFailedPreview', { defaultValue: 'Upload failed. Previewing locally only.' });
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

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return 'solar:gallery-bold';
    if (type.includes('pdf')) return 'solar:file-text-bold';
    if (type.includes('word') || type.includes('document')) return 'solar:document-bold';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'solar:bill-list-bold';
    if (type.includes('zip') || type.includes('archive')) return 'solar:archive-bold';
    return 'solar:file-bold';
  };

  const renderAttachmentGroup = (
    groupTitle: string,
    groupKey: string,
    groupAttachments: GroupedAttachment[],
    icon: string,
    color: string
  ) => {
    if (groupAttachments.length === 0) return null;

    return (
      <Card sx={{ mb: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            p: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => toggleGroup(groupKey)}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              sx={{
                bgcolor: `${color}.lighter`,
                color: `${color}.main`,
                width: 40,
                height: 40,
              }}
            >
              <Iconify icon={icon} width={24} />
            </Avatar>
            <Box>
              <Typography variant="subtitle1">{groupTitle}</Typography>
              <Typography variant="caption" color="text.secondary">
                {groupAttachments.length} {groupAttachments.length === 1 ? 'file' : 'files'}
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small">
            <Iconify
              icon={
                expandedGroups[groupKey]
                  ? 'solar:alt-arrow-up-linear'
                  : 'solar:alt-arrow-down-linear'
              }
            />
          </IconButton>
        </Stack>

        <Collapse in={expandedGroups[groupKey]}>
          <Stack spacing={1} sx={{ p: 2, pt: 0 }}>
            {groupAttachments.map((item, index) => (
              <Card
                key={`${item.sourceId}-${index}`}
                variant="outlined"
                sx={{
                  p: 1.5,
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'background-color 0.2s',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    sx={{
                      bgcolor: 'background.neutral',
                      width: 48,
                      height: 48,
                    }}
                  >
                    <Iconify icon={getFileIcon(item.attachment.type)} width={24} />
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.attachment.name}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      {item.taskTitle && (
                        <Chip
                          label={item.taskTitle}
                          size="small"
                          variant="soft"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                      {item.subtaskTitle && (
                        <Chip
                          label={item.subtaskTitle}
                          size="small"
                          variant="soft"
                          color="secondary"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(item.attachment.size)}
                      </Typography>
                    </Stack>
                  </Box>

                  <IconButton
                    size="small"
                    href={item.attachment.url}
                    target="_blank"
                    sx={{ color: 'primary.main' }}
                  >
                    <Iconify icon="solar:download-bold" width={20} />
                  </IconButton>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Collapse>
      </Card>
    );
  };

  const totalFiles = groupedAttachments.length;

  return (
    <Stack spacing={3}>
      {/* Summary */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={2}>
          <Iconify icon="solar:file-bold-duotone" width={24} />
          <Typography variant="h6">
            {t('allAttachments', { defaultValue: 'All Attachments' })}
          </Typography>
          <Chip label={`${totalFiles} ${totalFiles === 1 ? 'file' : 'files'}`} size="small" />
        </Stack>
      </Stack>

      {/* Upload Section - Only for Work Order */}
      <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.neutral' }}>
        <Stack spacing={2}>
          <Typography variant="subtitle2">
            {t('uploadToWorkOrder', { defaultValue: 'Upload to Work Order' })}
          </Typography>
          <MultiFilePreview
            files={displayFiles}
            onRemove={handleRemoveFile}
            endNode={
              <UploadBox
                onDrop={handleDrop}
                placeholder={
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '8px' }}>
                      {t('uploadLimits', {
                        defaultValue: 'Max {{size}}MB per file, {{count}} files max',
                        size: CONFIG.upload.maxFileSizeMB,
                        count: CONFIG.upload.maxFilesPerRequest,
                      })}
                    </div>
                  </div>
                }
              />
            }
            thumbnail={{ sx: { width: 64, height: 64 } }}
          />
        </Stack>
      </Card>

      {/* Grouped Attachments */}
      {totalFiles === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'background.neutral' }}>
              <Iconify icon="solar:file-text-broken" width={32} />
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              {t('noAttachments', { defaultValue: 'No attachments yet' })}
            </Typography>
          </Stack>
        </Card>
      ) : (
        <>
          {renderAttachmentGroup(
            t('workOrderAttachments', { defaultValue: 'Work Order Files' }),
            'workOrder',
            workOrderAttachments,
            'solar:document-bold-duotone',
            'primary'
          )}

          {renderAttachmentGroup(
            t('taskAttachments', { defaultValue: 'Task Files' }),
            'tasks',
            taskAttachments,
            'solar:checklist-bold-duotone',
            'info'
          )}

          {renderAttachmentGroup(
            t('subtaskAttachments', { defaultValue: 'Subtask Files' }),
            'subtasks',
            subtaskAttachments,
            'solar:list-check-bold-duotone',
            'success'
          )}
        </>
      )}
    </Stack>
  );
}
