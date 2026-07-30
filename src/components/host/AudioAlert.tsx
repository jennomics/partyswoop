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
      <span className="inline-flex items-center gap-1 text-sm text-green-600 bg-green-50 rounded px-2 py-1">
        <span className="animate-pulse">🔔</span> Sound on
      </span>
    );
  }

  return (
    <button
      onClick={enable}
      className="text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium rounded px-3 py-1 transition-colors"
    >
      🔇 Enable Sound Alerts
    </button>
  );
}
