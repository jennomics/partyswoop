'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSSE } from '@/hooks/useSSE';

interface RequestTrackerProps {
  guestCode: string;
  requestId: string;
  item: string;
  note: string | null;
  category: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  DRINK: '🍺',
  SUPPLY: '🧻',
  SONG: '🎵',
  OTHER: '💬',
};

type Status = 'NEW' | 'SEEN' | 'DONE';

const STEPS: Status[] = ['NEW', 'SEEN', 'DONE'];
const STEP_LABELS: Record<Status, string> = {
  NEW: 'Sent',
  SEEN: 'Seen',
  DONE: 'Done',
};

export default function RequestTracker({ guestCode, requestId, item, note, category }: RequestTrackerProps) {
  const [status, setStatus] = useState<Status>('NEW');
  const sseEvent = useSSE(`/api/party/${guestCode}/events`, ['request-update']);

  // Handle SSE updates
  useEffect(() => {
    if (!sseEvent) return;
    const data = sseEvent.data as { id?: string; status?: Status };
    if (data.id === requestId && data.status) {
      setStatus(data.status);
    }
  }, [sseEvent, requestId]);

  // Poll on visibility change (for returning guests)
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/party/${guestCode}/requests/${requestId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status) setStatus(data.status);
      }
    } catch {
      // Silent fail for polling
    }
  }, [guestCode, requestId]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        pollStatus();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pollStatus]);

  const currentStepIndex = STEPS.indexOf(status);

  return (
    <div className="text-center">
      <div className="mb-6">
        <span className="text-3xl">{CATEGORY_ICONS[category] || '💬'}</span>
        <h2 className="text-lg font-bold mt-2">{item}</h2>
        {note && <p className="text-sm text-gray-500 mt-1">{note}</p>}
      </div>

      {/* Progress tracker */}
      <div className="flex items-center justify-between px-4 mb-4">
        {STEPS.map((step, index) => {
          const isComplete = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isSeen = step === 'SEEN';

          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div
                    className={`flex-1 h-1 rounded ${
                      index <= currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                )}
                <div
                  className={`shrink-0 rounded-full flex items-center justify-center transition-all ${
                    isSeen && isCurrent
                      ? 'w-14 h-14 bg-yellow-400 text-white shadow-lg shadow-yellow-200 animate-bounce'
                      : isCurrent
                        ? 'w-10 h-10 bg-blue-500 text-white shadow-md'
                        : isComplete
                          ? 'w-10 h-10 bg-blue-500 text-white'
                          : 'w-10 h-10 bg-gray-200 text-gray-400'
                  }`}
                >
                  {isComplete && index < currentStepIndex ? (
                    <span className="text-sm">&#10003;</span>
                  ) : (
                    <span className={`text-xs font-bold ${isSeen && isCurrent ? 'text-lg' : ''}`}>
                      {index + 1}
                    </span>
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 rounded ${
                      index < currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isSeen && isCurrent
                    ? 'text-yellow-600 text-sm font-bold'
                    : isCurrent
                      ? 'text-blue-600 font-bold'
                      : isComplete
                        ? 'text-blue-600'
                        : 'text-gray-400'
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div className="mt-6 rounded-lg bg-white border border-gray-200 p-4">
        {status === 'NEW' && (
          <p className="text-gray-600">Your request has been sent to the host!</p>
        )}
        {status === 'SEEN' && (
          <p className="text-yellow-700 font-medium text-lg">
            The host has seen your request!
          </p>
        )}
        {status === 'DONE' && (
          <p className="text-green-600 font-medium">All done! Your request is complete.</p>
        )}
      </div>
    </div>
  );
}
