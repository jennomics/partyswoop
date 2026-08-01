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
      <span className="inline-flex items-center gap-0.5 text-[11px] text-green-600 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
        <span className="animate-pulse">🔔</span>
      </span>
    );
  }

  return (
    <button
      onClick={enable}
      className="text-[11px] bg-gray-50 border border-orange-200 hover:border-orange-400 text-orange-700 font-medium rounded-lg px-2 py-1 transition-all active:scale-95"
    >
      🔇
    </button>
  );
}
