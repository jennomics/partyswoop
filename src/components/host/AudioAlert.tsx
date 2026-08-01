'use client';

import { useEffect, useRef } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { useAudioAlert } from '@/hooks/useAudioAlert';

interface AudioAlertProps {
  hostCode: string;
}

export default function AudioAlert({ hostCode }: AudioAlertProps) {
  const { isEnabled, enable, playAlert } = useAudioAlert();
  const sseEvent = useSSE(`/api/parties/${hostCode}/events`, ['new-request']);
  const prevEventRef = useRef(sseEvent);

  useEffect(() => {
    if (sseEvent && sseEvent !== prevEventRef.current && isEnabled) {
      playAlert();
    }
    prevEventRef.current = sseEvent;
  }, [sseEvent, isEnabled, playAlert]);

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
