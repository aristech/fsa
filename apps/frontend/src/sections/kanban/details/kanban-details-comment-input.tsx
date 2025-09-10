import { mutate } from 'swr';
import { useRef, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import InputBase from '@mui/material/InputBase';

import axiosInstance from 'src/lib/axios';

import { toast } from 'src/components/snackbar';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type Props = {
  taskId: string;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  onCommentSent?: () => void;
};

export function KanbanDetailsCommentInput({ taskId, onStartTyping, onStopTyping, onCommentSent }: Props) {
  const { user } = useAuthContext();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmitComment = useCallback(async () => {
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await axiosInstance.post(`/api/v1/comments/${taskId}`, {
        message: message.trim(),
        messageType: 'text',
      });
      
      setMessage('');
      mutate(`/api/v1/comments/${taskId}`);
      toast.success('Comment added');
      
      // Notify parent to scroll to bottom
      onCommentSent?.();
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  }, [taskId, message, isSubmitting]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      handleSubmitComment();
    }
  }, [handleSubmitComment]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newMessage = event.target.value;
    setMessage(newMessage);

    // Handle typing indicators
    if (newMessage.length > 0 && !isTyping) {
      setIsTyping(true);
      onStartTyping?.();
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onStopTyping?.();
    }, 2000);

    // Stop typing immediately if message is empty
    if (newMessage.length === 0 && isTyping) {
      setIsTyping(false);
      onStopTyping?.();
    }
  }, [isTyping, onStartTyping, onStopTyping]);

  const handleBlur = useCallback(() => {
    // Stop typing when input loses focus
    if (isTyping) {
      setIsTyping(false);
      onStopTyping?.();
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [isTyping, onStopTyping]);

  return (
    <Box
      sx={{
        py: 3,
        gap: 2,
        px: 2.5,
        display: 'flex',
      }}
    >
      <Avatar>
        {user?.firstName && user?.lastName 
          ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
          : user?.email?.charAt(0).toUpperCase() || 'U'
        }
      </Avatar>

      <Paper variant="outlined" sx={{ p: 1, flexGrow: 1, bgcolor: 'transparent' }}>
        <InputBase 
          fullWidth 
          multiline 
          rows={2} 
          placeholder="Type a message (Ctrl+Enter to send)" 
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          onBlur={handleBlur}
          sx={{ px: 1 }} 
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            onClick={handleSubmitComment}
            disabled={!message.trim() || isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Comment'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
