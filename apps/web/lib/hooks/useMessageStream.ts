'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface StreamEvent {
  type: 'connected' | 'message' | 'typing' | 'read';
  conversationId?: string;
  message?: unknown;
  senderAddress?: string;
}

export function useMessageStream(conversationId: string | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data: StreamEvent = JSON.parse(event.data);

        switch (data.type) {
          case 'message':
            queryClient.invalidateQueries({ queryKey: ['messages', data.conversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            break;
          case 'read':
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            break;
        }
      } catch {
        // Ignore malformed events
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (!conversationId) {
      setIsConnected(false);
      return;
    }

    const es = new EventSource(`/api/messages/stream?conversationId=${conversationId}`);
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);
    es.onmessage = handleMessage;
    es.onerror = () => {
      es.close();
      setIsConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [conversationId, handleMessage]);

  return { isConnected };
}
