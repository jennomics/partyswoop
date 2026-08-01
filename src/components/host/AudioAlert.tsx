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
      <span className="inline-flex items-center gap-1 text-sm text-green-600 bg-white border-2 border-green-200 rounded-xl px-3 py-2">
        <span className="animate-pulse">🔔</span> Sound on
      </span>
    );
  }

  return (
    <button
      onClick={enable}
      className="text-sm bg-white border-2 border-orange-200 hover:border-orange-400 text-orange-700 font-medium rounded-xl px-3 py-2 transition-all active:scale-95 hover:shadow-md"
    >
      🔇 Enable Sound
    </button>
  );
}
