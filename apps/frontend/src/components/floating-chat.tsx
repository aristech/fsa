'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Fade,
  List,
  Chip,
  Paper,
  Stack,
  Button,
  Popper,
  ListItem,
  TextField,
  IconButton,
  Typography,
  ListItemText,
  InputAdornment,
  ListItemButton,
  CircularProgress,
  ClickAwayListener,
} from '@mui/material';

import { useChatStream, type ChatMessage } from 'src/hooks/useChatStream';

import axiosInstance from 'src/lib/axios';
import { useTranslate } from 'src/locales/use-locales';

import { Iconify } from 'src/components/iconify';

export function FloatingChat() {
  const { t } = useTranslate('dashboard');
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteAnchor, setAutocompleteAnchor] = useState<HTMLElement | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [currentSymbol, setCurrentSymbol] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const actualInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Handle real-time events from AI (e.g., task created/updated)
  const handleEvent = (event: { type: string; data: any }) => {
    if (event.type === 'task_created' || event.type === 'task_updated') {
      // Trigger kanban refresh by dispatching a custom event
      window.dispatchEvent(
        new CustomEvent('kanban-refresh', {
          detail: {
            type: event.type,
            taskId: event.data.taskId,
            title: event.data.title,
          },
        })
      );
    }
  };

  const { messages, send, stop, isStreaming, error, clearMessages, retryLastMessage } =
    useChatStream(handleEvent);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);

  // Helper function to format suggestions for display
  const formatSuggestionDisplay = useCallback(
    (suggestion: any, symbol: string): string => {
      if (typeof suggestion === 'string') {
        return suggestion; // Legacy format
      }

      // Format based on symbol type and database object
      switch (symbol) {
        case '/':
          return `/${suggestion.title || suggestion.name || t('chatbot.autocomplete.untitledTask')}`;
        case '@':
          return `@${suggestion.employeeId || suggestion.firstName + ' ' + suggestion.lastName || t('chatbot.autocomplete.unknownPerson')}`;
        case '#':
          return `#${suggestion.title || suggestion.workOrderNumber || t('chatbot.autocomplete.unknownWorkOrder')}`;
        case '+':
          return `+${suggestion.title || suggestion.name || t('chatbot.autocomplete.unknownProject')}`;
        case '&':
          return `&${suggestion.name || suggestion.company || t('chatbot.autocomplete.unknownClient')}`;
        default:
          return suggestion.toString();
      }
    },
    [t]
  );

  // Helper function to get the replacement text when user selects a suggestion
  const formatSuggestionReplacement = useCallback(
    (suggestion: any, symbol: string): string =>
      // Always return the formatted display text for replacement
      formatSuggestionDisplay(suggestion, symbol),
    [formatSuggestionDisplay]
  );

  // Symbol detection and autocomplete
  const detectSymbolAtCursor = useCallback((text: string, cursorPos: number) => {
    // Find the word at cursor position
    const beforeCursor = text.substring(0, cursorPos);

    // Check if we're inside quotes (ignore symbols in quotes)
    const quotesBefore = (beforeCursor.match(/[^\\]"/g) || []).length;
    if (quotesBefore % 2 === 1) return null; // Inside quotes

    // Look for symbol patterns before cursor
    const symbolMatch = beforeCursor.match(/([@#/+&])([^\s"']*)$/);
    if (symbolMatch) {
      return {
        symbol: symbolMatch[1],
        query: symbolMatch[2],
        startPos: cursorPos - symbolMatch[0].length,
        endPos: cursorPos,
      };
    }
    return null;
  }, []);

  const fetchAutocompleteSuggestions = useCallback(
    async (symbol: string, query: string) => {
      if (!hasToken) return;

      try {
        const token =
          sessionStorage.getItem('jwt_access_token') || localStorage.getItem('jwt_access_token');
        if (!token) return;

        const response = await axiosInstance.get('/api/v1/autocomplete', {
          params: {
            symbol,
            query,
            limit: 5,
            token,
          },
        });

        const data = response.data;

        if (data.success && data.suggestions) {
          setAutocompleteSuggestions(data.suggestions);
          setCurrentSymbol(symbol);
          setShowAutocomplete(data.suggestions.length > 0);
          setSelectedSuggestionIndex(-1);
        } else {
          setAutocompleteSuggestions([]);
          setCurrentSymbol('');
          setShowAutocomplete(false);
          setSelectedSuggestionIndex(-1);
        }
      } catch (err) {
        console.warn('[FloatingChat] Autocomplete error:', err);
        setAutocompleteSuggestions([]);
        setCurrentSymbol('');
        setShowAutocomplete(false);
        setSelectedSuggestionIndex(-1);
      }
    },
    [hasToken]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const newCursorPos = e.target.selectionStart || 0;

      setInput(newValue);
      setCursorPosition(newCursorPos);

      // Check for symbol at cursor
      const symbolInfo = detectSymbolAtCursor(newValue, newCursorPos);

      if (symbolInfo) {
        fetchAutocompleteSuggestions(symbolInfo.symbol, symbolInfo.query);
        setAutocompleteAnchor(e.target);
      } else {
        setShowAutocomplete(false);
        setAutocompleteSuggestions([]);
        setCurrentSymbol('');
      }
    },
    [detectSymbolAtCursor, fetchAutocompleteSuggestions]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: any) => {
      const symbolInfo = detectSymbolAtCursor(input, cursorPosition);
      if (symbolInfo) {
        const replacementText = formatSuggestionReplacement(suggestion, symbolInfo.symbol);
        const beforeSymbol = input.substring(0, symbolInfo.startPos);
        const afterSymbol = input.substring(cursorPosition);
        const newInput = beforeSymbol + replacementText + ' ' + afterSymbol;

        setInput(newInput);
        setShowAutocomplete(false);
        setAutocompleteSuggestions([]);
        setSelectedSuggestionIndex(-1);
        setCurrentSymbol('');

        // Focus back to input and set cursor position
        setTimeout(() => {
          if (actualInputRef.current) {
            actualInputRef.current.focus();
            const newCursorPos = beforeSymbol.length + replacementText.length + 1;
            actualInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
      }
    },
    [input, cursorPosition, detectSymbolAtCursor, formatSuggestionReplacement]
  );

  useEffect(() => {
    const readToken = () => {
      try {
        const token =
          sessionStorage.getItem('jwt_access_token') || localStorage.getItem('jwt_access_token');
        setHasToken(!!token);
      } catch {
        setHasToken(false);
      }
    };

    readToken();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'jwt_access_token') readToken();
    };
    const onFocus = () => readToken();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const hasUnreadAssistantMessage = useMemo(() => {
    if (open || messages.length === 0) return false;
    const last = messages[messages.length - 1];
    return last.role === 'assistant' && (last.content?.length ?? 0) > 0;
  }, [open, messages]);

  const handleSubmit = () => {
    if (!hasToken) return;
    if (input.trim() && !isStreaming) {
      send(input.trim());
      setInput('');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    if (isSystem) return null;

    return (
      <Box
        key={index}
        sx={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        <Paper
          sx={{
            p: 1.25,
            maxWidth: '80%',
            bgcolor: isUser ? 'primary.main' : 'grey.100',
            color: isUser ? 'primary.contrastText' : 'text.primary',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content || (isStreaming && index === messages.length - 1 ? '...' : '')}
          </Typography>

          {!isUser && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
              AI Assistant
            </Typography>
          )}
        </Paper>
      </Box>
    );
  };

  return (
    <>
      {/* Floating Button (right side) */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
        <Box sx={{ position: 'relative' }}>
          <IconButton
            color="primary"
            size="large"
            onClick={() => setOpen((prev) => !prev)}
            sx={{
              bgcolor: 'white',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 3,
              '&:hover': { bgcolor: 'grey.50' },
            }}
          >
            {open ? (
              <Iconify icon="mingcute:close-line" width={24} />
            ) : (
              <Iconify icon="eva:message-circle-fill" width={24} />
            )}
          </IconButton>

          {hasUnreadAssistantMessage && (
            <Box
              sx={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'error.main',
                boxShadow: 2,
              }}
            />
          )}
        </Box>
      </Box>

      {/* Chat Window */}
      <Fade in={open}>
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            bottom: 88,
            right: 24,
            width: 360,
            height: 520,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1299,
            bgcolor: 'background.paper',
            borderRadius: 2,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="subtitle1">Project Assistant</Typography>
            <Box>
              {messages.length > 0 && (
                <IconButton
                  onClick={clearMessages}
                  disabled={isStreaming}
                  color="default"
                  size="small"
                  title="Clear conversation"
                >
                  <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                </IconButton>
              )}
              <IconButton onClick={() => setOpen(false)} size="small" title="Close">
                <Iconify icon="mingcute:close-line" width={18} />
              </IconButton>
            </Box>
          </Box>

          {/* Messages */}
          <Box sx={{ flex: 1, p: 1.5, overflow: 'auto', bgcolor: 'background.neutral' }}>
            {!hasToken && (
              <Paper
                sx={{
                  p: 1.25,
                  mb: 1.25,
                  bgcolor: 'warning.lighter',
                  color: 'warning.darker',
                  borderRadius: 2,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Iconify icon="solar:shield-keyhole-bold" width={16} />
                  <Typography variant="caption">
                    Sign in required: AI uses your account permissions.
                  </Typography>
                </Stack>
              </Paper>
            )}
            {messages.length === 0 ? (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 1.25,
                  textAlign: 'center',
                }}
              >
                <Iconify
                  icon="solar:chat-round-bold-duotone"
                  width={48}
                  sx={{ color: 'text.disabled' }}
                />
                <Typography variant="subtitle2" color="text.secondary">
                  {t('chatbot.startConversation')}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {t('chatbot.conversationHint')}
                </Typography>

                {/* Symbol Guide */}
                <Paper
                  sx={{
                    p: 1.5,
                    bgcolor: 'primary.lighter',
                    border: '1px solid',
                    borderColor: 'primary.light',
                  }}
                >
                  <Typography
                    variant="caption"
                    color="primary.darker"
                    sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                  >
                    {t('chatbot.symbolGuide.title')}
                  </Typography>
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="/" size="small" color="info" sx={{ minWidth: 24, height: 20 }} />
                      <Typography variant="caption" color="text.secondary">
                        {t('chatbot.symbolGuide.tasks')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label="#"
                        size="small"
                        color="secondary"
                        sx={{ minWidth: 24, height: 20 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {t('chatbot.symbolGuide.workOrders')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label="@"
                        size="small"
                        color="primary"
                        sx={{ minWidth: 24, height: 20 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {t('chatbot.symbolGuide.personnel')}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label="&"
                        size="small"
                        color="warning"
                        sx={{ minWidth: 24, height: 20 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {t('chatbot.symbolGuide.clients')}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                  {[
                    t('chatbot.suggestions.createTask'),
                    t('chatbot.suggestions.recentWorkOrders'),
                    t('chatbot.suggestions.kanbanBoard'),
                    t('chatbot.suggestions.highPriorityWorkOrders'),
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
                <Stack spacing={1.25}>{messages.map(renderMessage)}</Stack>
                <div ref={messagesEndRef} />
              </>
            )}

            {error && (
              <Box sx={{ mt: 1.5 }}>
                <Paper
                  sx={{ p: 1.25, bgcolor: 'error.lighter', color: 'error.darker', borderRadius: 2 }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Iconify icon="solar:danger-bold" width={16} />
                    <Typography variant="caption" sx={{ flex: 1 }}>
                      {error}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={retryLastMessage}
                      disabled={isStreaming}
                    >
                      {t('chatbot.error.retry')}
                    </Button>
                  </Stack>
                </Paper>
              </Box>
            )}
          </Box>

          {/* Input */}
          <Box sx={{ p: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
            <TextField
              ref={inputRef}
              fullWidth
              multiline
              maxRows={3}
              size="small"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // If autocomplete is open and a suggestion is selected, select it instead of sending
                  if (
                    showAutocomplete &&
                    selectedSuggestionIndex >= 0 &&
                    selectedSuggestionIndex < autocompleteSuggestions.length
                  ) {
                    handleSuggestionClick(autocompleteSuggestions[selectedSuggestionIndex]);
                    setSelectedSuggestionIndex(-1);
                  } else {
                    setShowAutocomplete(false);
                    handleSubmit();
                  }
                } else if (e.key === 'Escape') {
                  setShowAutocomplete(false);
                  setSelectedSuggestionIndex(-1);
                } else if (showAutocomplete && autocompleteSuggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedSuggestionIndex((prev) =>
                      prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedSuggestionIndex((prev) =>
                      prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
                    );
                  } else if (e.key === 'Tab') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (
                      selectedSuggestionIndex >= 0 &&
                      selectedSuggestionIndex < autocompleteSuggestions.length
                    ) {
                      handleSuggestionClick(autocompleteSuggestions[selectedSuggestionIndex]);
                      setSelectedSuggestionIndex(-1);
                    }
                  }
                }
              }}
              placeholder={t('chatbot.input.placeholder')}
              disabled={isStreaming || !hasToken}
              inputRef={actualInputRef}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {isStreaming ? (
                      <IconButton
                        onClick={stop}
                        color="error"
                        size="small"
                        title={t('chatbot.input.stop')}
                      >
                        <Iconify icon="solar:stop-bold" width={20} />
                      </IconButton>
                    ) : (
                      <IconButton
                        onClick={handleSubmit}
                        disabled={!input.trim() || !hasToken}
                        color="primary"
                        size="small"
                        title={hasToken ? t('chatbot.input.send') : t('chatbot.input.signInToUse')}
                      >
                        <Iconify icon="solar:plain-2-bold" width={20} />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
            />

            {/* Autocomplete Suggestions */}
            <ClickAwayListener onClickAway={() => setShowAutocomplete(false)}>
              <Popper
                open={showAutocomplete && autocompleteSuggestions.length > 0}
                anchorEl={autocompleteAnchor}
                placement="top-start"
                sx={{ zIndex: 1400, maxWidth: 360 }}
              >
                <Paper elevation={3} sx={{ maxHeight: 200, overflow: 'auto' }}>
                  <List dense>
                    {autocompleteSuggestions.map((suggestion, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemButton
                          onClick={() => handleSuggestionClick(suggestion)}
                          sx={{
                            py: 0.5,
                            backgroundColor:
                              selectedSuggestionIndex === index ? 'action.selected' : 'transparent',
                            '&:hover': {
                              backgroundColor:
                                selectedSuggestionIndex === index
                                  ? 'action.selected'
                                  : 'action.hover',
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={currentSymbol}
                                  size="small"
                                  color="primary"
                                  sx={{ minWidth: 24, height: 20, fontSize: '0.75rem' }}
                                />
                                <Typography variant="body2">
                                  {formatSuggestionDisplay(suggestion, currentSymbol).substring(1)}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Popper>
            </ClickAwayListener>

            {isStreaming && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <CircularProgress size={12} />
                <Typography variant="caption" color="text.secondary">
                  {t('chatbot.input.aiThinking')}
                </Typography>
              </Stack>
            )}
          </Box>
        </Paper>
      </Fade>
    </>
  );
}
