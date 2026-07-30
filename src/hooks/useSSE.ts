'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface SSEEvent {
  type: string;
  data: unknown;
}

export function useSSE(url: string, eventTypes: string[]) {
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stabilize eventTypes reference to prevent recreating connections on every render
  const eventTypesRef = useRef(eventTypes);
  eventTypesRef.current = eventTypes;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(url);
    eventSourceRef.current = es;

    for (const eventType of eventTypesRef.current) {
      es.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent({ type: eventType, data });
        } catch {
          setLastEvent({ type: eventType, data: event.data });
        }
      });
    }

    es.onerror = () => {
      es.close();
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return lastEvent;
}
