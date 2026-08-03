'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePollingOptions<T> {
  url: string;
  intervalMs?: number;
  enabled?: boolean;
  transform?: (data: unknown) => T;
}

interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

/**
 * Generic polling hook that fetches a URL at a set interval.
 * Respects document.visibilityState: pauses when hidden, refetches on visible.
 */
export function usePolling<T = unknown>({
  url,
  intervalMs = 3000,
  enabled = true,
  transform,
}: UsePollingOptions<T>): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Request failed');
      }
      const json = await res.json();
      const result = transform ? transform(json) : (json as T);
      setData(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [url, transform]);

  useEffect(() => {
    if (!enabled) return;

    fetchData();

    function startPolling() {
      stopPolling();
      intervalRef.current = setInterval(fetchData, intervalMs);
    }

    function stopPolling() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchData();
        startPolling();
      } else {
        stopPolling();
      }
    }

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, fetchData, intervalMs]);

  return { data, loading, error, refetch: fetchData };
}
