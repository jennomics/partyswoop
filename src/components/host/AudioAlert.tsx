'use client';

import { useEffect, useRef } from 'react';
import { useAudioAlert } from '@/hooks/useAudioAlert';

interface AudioAlertProps {
  newRequestCount: number;
}

/**
 * Plays an audio alert when the new request count increases.
 * Receives the count from the parent (which does the polling) to avoid duplicate fetches.
 */
export default function AudioAlert({ newRequestCount }: AudioAlertProps) {
  const { isEnabled, enable, playAlert } = useAudioAlert();
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevCountRef.current !== null && newRequestCount > prevCountRef.current && isEnabled) {
      playAlert();
    }
    prevCountRef.current = newRequestCount;
  }, [newRequestCount, isEnabled, playAlert]);

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
