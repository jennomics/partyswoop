'use client';

import { useState, useEffect, useCallback } from 'react';

interface RequestTrackerProps {
  guestCode: string;
  requestId: string;
  item: string;
  note: string | null;
  category: string;
}

type Status = 'NEW' | 'SEEN' | 'DONE';

const STEPS: Status[] = ['NEW', 'SEEN', 'DONE'];
const STEP_LABELS: Record<Status, string> = {
  NEW: 'Sent',
  SEEN: 'Seen',
  DONE: 'Done',
};

export default function RequestTracker({ guestCode, requestId, item, note }: RequestTrackerProps) {
  const [status, setStatus] = useState<Status>('NEW');

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

  // Poll every 3 seconds for near-real-time updates
  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, 3000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        pollStatus();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollStatus]);

  const currentStepIndex = STEPS.indexOf(status);

  return (
    <div className="text-center">
      <div className="mb-s-4">
        <h2 className="font-zen font-medium text-h3 text-ink">{item}</h2>
        {note && <p className="font-zen text-body text-ink-50 mt-s-1">{note}</p>}
      </div>

      {/* Progress tracker - three text labels separated by rules */}
      <div className="flex items-center justify-between mb-s-4">
        {STEPS.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const isComplete = index < currentStepIndex;
          const isFuture = index > currentStepIndex;

          return (
            <div key={step} className="flex items-center flex-1">
              {index > 0 && (
                <div className="flex-1 h-px bg-rule" />
              )}
              <span
                className={`font-mono text-meta uppercase px-s-2 ${
                  isCurrent
                    ? 'text-live'
                    : isComplete
                      ? 'text-ink'
                      : isFuture
                        ? 'text-ink-35'
                        : ''
                }`}
              >
                {STEP_LABELS[step]}
              </span>
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-px bg-rule" />
              )}
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div className="mt-s-4">
        {status === 'NEW' && (
          <p className="font-zen text-body text-ink-72">Your request has been sent to the host.</p>
        )}
        {status === 'SEEN' && (
          <p className="inline-block bg-live text-white font-zen font-medium text-body px-s-2 py-s-1">
            The host has seen your request.
          </p>
        )}
        {status === 'DONE' && (
          <p className="font-zen text-body text-ink-35">All done. Your request is complete.</p>
        )}
      </div>
    </div>
  );
}
