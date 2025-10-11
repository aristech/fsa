import { useState } from 'react';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

import { useSubtaskDnd } from '../hooks/use-subtask-dnd';
import { SubtaskAttachments } from './subtask-attachments';

// ----------------------------------------------------------------------

interface ISubtask {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  order: number;
  attachments?: Array<{
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
  }>;
  createdBy: {
    _id: string;
    name: string;
    email?: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface SubtaskItemProps {
  subtask: ISubtask;
  taskId: string;
  isEditing: boolean;
  editingTitle: string;
  isSaving: boolean;
  onToggleCompleted: (subtaskId: string, completed: boolean) => void;
  onStartEdit: (subtask: ISubtask) => void;
  onEditTitleChange: (title: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (subtaskId: string) => void;
  onUploadAttachment: (subtaskId: string, files: File[]) => Promise<void>;
  onDeleteAttachment: (subtaskId: string, attachmentId: string) => Promise<void>;
}

export function SubtaskItem({
  subtask,
  taskId,
  isEditing,
  editingTitle,
  isSaving,
  onToggleCompleted,
  onStartEdit,
  onEditTitleChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onUploadAttachment,
  onDeleteAttachment,
}: SubtaskItemProps) {
  const [showAttachments, setShowAttachments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { subtaskRef, dragHandleRef, state } = useSubtaskDnd(subtask._id, taskId);

  const isDragging = state.type === 'dragging';
  const isDropTarget = state.type === 'subtask-over';

  const dropIndicatorStyles = isDropTarget
    ? {
        '&::before': {
          content: '""',
          position: 'absolute',
          top: state.closestEdge === 'top' ? -1 : 'auto',
          bottom: state.closestEdge === 'bottom' ? -1 : 'auto',
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: 'primary.main',
          zIndex: 1,
        },
      }
    : {};

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      await onUploadAttachment(subtask._id, files);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    await onDeleteAttachment(subtask._id, attachmentId);
  };

  return (
    <Box
      ref={subtaskRef}
      sx={{
        position: 'relative',
        opacity: isDragging ? 0.5 : 1,
        transition: 'opacity 0.2s ease',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        ...dropIndicatorStyles,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          width: '100%',
          minHeight: 40,
        }}
      >
        <Box
          ref={dragHandleRef}
          sx={{
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            opacity: 0.3,
            flexShrink: 0,
            mt: 0.5,
            '&:hover': { opacity: 0.7 },
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <Iconify icon="solar:hamburger-menu-bold" width={16} />
        </Box>

        <Box sx={{ flexShrink: 0, mt: -0.6 }}>
          <Checkbox
            disableRipple
            checked={subtask.completed}
            onChange={(e) => onToggleCompleted(subtask._id, e.target.checked)}
            size="small"
          />
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0, // This is crucial for text wrapping
            width: '100%',
          }}
        >
          {isEditing ? (
            <TextField
              value={editingTitle}
              autoFocus
              disabled={isSaving}
              fullWidth
              multiline
              minRows={1}
              maxRows={6}
              onChange={(e) => onEditTitleChange(e.target.value)}
              onBlur={onSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSaveEdit();
                } else if (e.key === 'Escape') {
                  onCancelEdit();
                }
              }}
              sx={{
                '& .MuiInputBase-root': {
                  alignItems: 'flex-start',
                },
                '& .MuiInputBase-input': {
                  resize: 'none',
                },
              }}
            />
          ) : (
            <Box
              onDoubleClick={() => onStartEdit(subtask)}
              sx={{
                cursor: 'text',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                minHeight: '1em',
                width: '100%',
                textDecoration: subtask.completed ? 'line-through' : 'none',
                color: subtask.completed ? 'text.secondary' : 'text.primary',
                py: 0.5,
                fontSize: '0.9rem',
              }}
            >
              {subtask.title}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            gap: 0.5,
            mt: 0.25,
          }}
        >
          {/* Attachment button */}
          <Tooltip title="Manage attachments">
            <IconButton
              size="small"
              onClick={() => setShowAttachments(!showAttachments)}
              sx={{
                color:
                  subtask.attachments && subtask.attachments.length > 0
                    ? 'primary.main'
                    : 'text.secondary',
                minWidth: 32,
                height: 32,
              }}
            >
              <Iconify icon="eva:attach-fill" width={16} />
              {subtask.attachments && subtask.attachments.length > 0 && (
                <Box
                  component="span"
                  sx={{
                    ml: 0.5,
                    fontSize: '0.75rem',
                    minWidth: 'auto',
                  }}
                >
                  {subtask.attachments.length}
                </Box>
              )}
            </IconButton>
          </Tooltip>

          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(subtask._id)}
            sx={{
              minWidth: 32,
              height: 32,
            }}
          >
            <Iconify icon="mingcute:delete-2-line" width={18} />
          </IconButton>
        </Box>
      </Box>

      {/* Attachments Section */}
      <Collapse in={showAttachments}>
        <Box
          sx={{
            mt: 2,
            ml: 4,
            mr: 1,
            width: 'calc(100% - 40px)', // Account for left margin
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          <SubtaskAttachments
            attachments={subtask.attachments}
            subtaskId={subtask._id}
            onUpload={handleUpload}
            onDelete={handleDeleteAttachment}
            isUploading={isUploading}
          />
        </Box>
      </Collapse>
    </Box>
  );
}
