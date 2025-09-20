import { useTranslation } from 'react-i18next';
import { useRef, useState, useCallback } from 'react';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
};

export type StreamEvent = {
  type: 'token' | 'tool_delta' | 'done' | 'error' | 'event';
  data?: string;
  error?: string;
};

// ----------------------------------------------------------------------

export function useChatStream(onEvent?: (event: { type: string; data: any }) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const { i18n } = useTranslation();

  const send = useCallback(
    (input: string) => {
      if (!input.trim() || isStreaming) return;

      setError(null);
      const userMessage: ChatMessage = { role: 'user', content: input.trim() };
      const nextMessages = [...messages, userMessage];

      // Add user message and prepare for assistant response
      setMessages([...nextMessages, { role: 'assistant', content: '' }]);

      const state = encodeURIComponent(JSON.stringify({ messages: nextMessages }));
      const url = `${CONFIG.serverUrl}/api/v1/ai/chat/stream?state=${state}`;

      // Get JWT token from storage
      const token =
        sessionStorage.getItem('jwt_access_token') || localStorage.getItem('jwt_access_token');

      // Get current language from localStorage (i18next storage)
      const getLanguageFromStorage = () => {
        try {
          return localStorage.getItem('i18nextLng');
        } catch (err) {
          console.warn('[AI] Could not access localStorage for language:', err);
          return null;
        }
      };

      const language = getLanguageFromStorage() || i18n.language || 'en';
      console.debug('[AI] Language detected:', {
        fromLocalStorage: getLanguageFromStorage(),
        fromI18n: i18n.language,
        final: language,
      });

      // Create EventSource with custom headers using a trick since EventSource doesn't support custom headers
      // We'll pass the token and language as query parameters instead
      const urlWithAuth = token
        ? `${url}&token=${encodeURIComponent(token)}&lang=${language}`
        : `${url}&lang=${language}`;

      console.debug('[AI] Opening SSE', { url, hasToken: !!token, language });
      const es = new EventSource(urlWithAuth);
      esRef.current = es;
      setIsStreaming(true);

      let accumulatedContent = '';

      es.onmessage = (e) => {
        // Raw event for debugging
        // console.debug('[AI] SSE message raw:', e.data);
        try {
          const event: StreamEvent = JSON.parse(e.data);

          if (event.type === 'token' && event.data) {
            accumulatedContent += event.data;
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: 'assistant', content: accumulatedContent };
              return copy;
            });
          } else if (event.type === 'tool_delta' && event.data) {
            // Tool call in progress - could show a loading indicator
            console.debug('[AI] Tool delta:', event.data);
          } else if (event.type === 'event' && event.data) {
            // Handle real-time events (e.g., task created/updated)
            try {
              const eventData = JSON.parse(event.data);
              console.debug('[AI] Event received:', eventData);
              if (onEvent) {
                onEvent(eventData);
              }
            } catch (err) {
              console.warn('[AI] Failed to parse event data:', err);
            }
          } else if (event.type === 'done') {
            es.close();
            setIsStreaming(false);
          } else if (event.type === 'error') {
            setError(event.error || 'Stream error occurred');
            es.close();
            setIsStreaming(false);
          }
        } catch (err) {
          console.warn('Failed to parse SSE event:', (err as any)?.data);
        }
      };

      es.onerror = (err) => {
        console.error('SSE connection error:', err);
        console.error('EventSource readyState:', es.readyState);
        console.error('EventSource URL:', urlWithAuth);

        // More detailed error message
        let errorMessage = 'Connection error occurred';
        if (es.readyState === EventSource.CLOSED) {
          errorMessage = 'Connection was closed by server';
        } else if (es.readyState === EventSource.CONNECTING) {
          errorMessage = 'Failed to connect to server';
        }

        setError(errorMessage);
        es.close();
        setIsStreaming(false);
      };

      es.onopen = () => {
        console.debug('[AI] SSE connection opened');
      };
    },
    [messages, isStreaming, onEvent, i18n.language]
  );

  const stop = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const retryLastMessage = useCallback(() => {
    if (messages.length >= 2) {
      const lastUserMessage = messages[messages.length - 2];
      if (lastUserMessage.role === 'user') {
        // Remove the last assistant message and retry
        setMessages((prev) => prev.slice(0, -1));
        send(lastUserMessage.content);
      }
    }
  }, [messages, send]);

  return {
    messages,
    send,
    stop,
    isStreaming,
    error,
    clearMessages,
    retryLastMessage,
    setMessages,
  };
}
