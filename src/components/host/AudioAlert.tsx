'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAudioAlert } from '@/hooks/useAudioAlert';

interface AudioAlertProps {
  hostCode: string;
}

interface RequestItem {
  id: string;
  status: string;
}

export default function AudioAlert({ hostCode }: AudioAlertProps) {
  const { isEnabled, enable, playAlert } = useAudioAlert();
  const [requestCount, setRequestCount] = useState<number | null>(null);
  const prevCountRef = useRef<number | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/parties/${hostCode}/requests`);
      if (!res.ok) return;
      const data: RequestItem[] = await res.json();
      const newCount = data.filter((r) => r.status === 'NEW').length;
      setRequestCount(newCount);
    } catch {
      // Silent fail for polling
    }
  }, [hostCode]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 3000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchRequests();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchRequests]);

  useEffect(() => {
    if (requestCount === null) return;
    if (prevCountRef.current !== null && requestCount > prevCountRef.current && isEnabled) {
      playAlert();
    }
    prevCountRef.current = requestCount;
  }, [requestCount, isEnabled, playAlert]);

  if (isEnabled) {
    return (
      <span className="inline-flex items-center gap-1.5 min-h-[44px] px-2">
        <span className="inline-block w-[6px] h-[6px] rounded-full bg-live" aria-hidden="true" />
        <span className="font-mono text-meta text-ink-50">alerts on</span>
      </span>
    );
  }

  return (
    <button
      onClick={enable}
      className="underline font-mono text-meta text-ink min-h-[44px] px-2"
    >
      enable alerts
    </button>
  );
}
