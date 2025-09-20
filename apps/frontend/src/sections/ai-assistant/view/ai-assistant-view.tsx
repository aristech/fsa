'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { useChatStream, type ChatMessage } from 'src/hooks/useChatStream';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function AIAssistantView() {
  const [input, setInput] = useState('');
  const { messages, send, stop, isStreaming, error, clearMessages, retryLastMessage } = useChatStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = () => {
    if (input.trim() && !isStreaming) {
      send(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    if (isSystem) return null; // Don't show system messages

    return (
      <Box
        key={index}
        sx={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          mb: 2,
        }}
      >
        <Paper
          sx={{
            p: 2,
            maxWidth: '70%',
            bgcolor: isUser ? 'primary.main' : 'grey.100',
            color: isUser ? 'primary.contrastText' : 'text.primary',
            borderRadius: 2,
            position: 'relative',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message.content || (isStreaming && index === messages.length - 1 ? '...' : '')}
          </Typography>

          {!isUser && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 1,
                opacity: 0.7,
                fontSize: '0.75rem',
              }}
            >
              AI Assistant
            </Typography>
          )}
        </Paper>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg">
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" gutterBottom>
            AI Assistant
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ask questions about your work orders, projects, and tasks. I can help you find information,
            get updates, and understand your field service operations.
          </Typography>
        </Box>

        {/* Chat Interface */}
        <Card sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
          {/* Messages Area */}
          <Box
            sx={{
              flex: 1,
              p: 2,
              overflow: 'auto',
              bgcolor: 'background.neutral',
            }}
          >
            {messages.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Iconify
                  icon="solar:chat-round-bold-duotone"
                  width={64}
                  sx={{ color: 'text.disabled' }}
                />
                <Typography variant="h6" color="text.secondary">
                  Start a conversation
                </Typography>
                <Typography variant="body2" color="text.disabled" textAlign="center">
                  Try asking about your work orders, kanban board, or any field service questions
                </Typography>

                {/* Suggested prompts */}
                <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                  {[
                    'Show me my recent work orders',
                    'What\'s on my kanban board?',
                    'List high priority work orders',
                  ].map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outlined"
                      size="small"
                      onClick={() => setInput(prompt)}
                      sx={{ textTransform: 'none' }}
                    >
                      {prompt}
                    </Button>
                  ))}
                </Stack>
              </Box>
            ) : (
              <>
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </>
            )}

            {error && (
              <Box sx={{ mt: 2 }}>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: 'error.lighter',
                    color: 'error.darker',
                    borderRadius: 2,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Iconify icon="solar:danger-bold" width={16} />
                    <Typography variant="body2">{error}</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={retryLastMessage}
                      disabled={isStreaming}
                    >
                      Retry
                    </Button>
                  </Stack>
                </Paper>
              </Box>
            )}
          </Box>

          {/* Input Area */}
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about your field service operations..."
                disabled={isStreaming}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {isStreaming ? (
                        <IconButton
                          onClick={stop}
                          color="error"
                          size="small"
                        >
                          <Iconify icon="solar:stop-bold" width={20} />
                        </IconButton>
                      ) : (
                        <IconButton
                          onClick={handleSubmit}
                          disabled={!input.trim() || isStreaming}
                          color="primary"
                          size="small"
                        >
                          <Iconify icon="solar:plain-2-bold" width={20} />
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                }}
              />

              {messages.length > 0 && (
                <IconButton
                  onClick={clearMessages}
                  disabled={isStreaming}
                  color="default"
                  size="small"
                  title="Clear conversation"
                >
                  <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                </IconButton>
              )}
            </Stack>

            {isStreaming && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <CircularProgress size={12} />
                <Typography variant="caption" color="text.secondary">
                  AI is thinking...
                </Typography>
              </Stack>
            )}
          </Box>
        </Card>

        {/* Helper Information */}
        <Paper sx={{ p: 2, bgcolor: 'background.neutral' }}>
          <Typography variant="subtitle2" gutterBottom>
            What can I help you with?
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              • View and filter your work orders
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Check your kanban board status
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Get details about specific work orders
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Find information based on priorities, status, or assignments
            </Typography>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}