'use client';

import { usePolling } from '@/hooks/usePolling';
import { useCallback } from 'react';

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
  const transform = useCallback((json: unknown) => {
    const data = json as { status?: Status };
    return data.status || 'NEW';
  }, []);

  const { data: status } = usePolling<Status>({
    url: `/api/party/${guestCode}/requests/${requestId}`,
    intervalMs: 3000,
    transform,
  });

  const currentStatus = status || 'NEW';
  const currentStepIndex = STEPS.indexOf(currentStatus);

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
        {currentStatus === 'NEW' && (
          <p className="font-zen text-body text-ink-72">Your request has been sent to the host.</p>
        )}
        {currentStatus === 'SEEN' && (
          <p className="inline-block bg-live text-white font-zen font-medium text-body px-s-2 py-s-1">
            The host has seen your request.
          </p>
        )}
        {currentStatus === 'DONE' && (
          <p className="font-zen text-body text-ink-35">All done. Your request is complete.</p>
        )}
      </div>
    </div>
  );
}
