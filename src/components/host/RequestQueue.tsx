'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSSE } from '@/hooks/useSSE';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface RequestItem {
  id: string;
  category: 'DRINK' | 'SUPPLY' | 'SONG' | 'OTHER';
  item: string;
  note: string | null;
  deliveryType: 'LOCATION' | 'NAME';
  deliveryValue: string;
  status: 'NEW' | 'SEEN' | 'DONE';
  createdAt: string;
  location?: { name: string } | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  DRINK: '🍺',
  SUPPLY: '🧻',
  SONG: '🎵',
  OTHER: '💬',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function RequestQueue({ hostCode }: { hostCode: string }) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const sseEvent = useSSE(`/api/parties/${hostCode}/events`, ['new-request', 'request-update']);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/parties/${hostCode}/requests`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load requests');
      }
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [hostCode]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Polling fallback: refetch when tab becomes visible (handles missed SSE events)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchRequests();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchRequests]);

  // Handle SSE events
  useEffect(() => {
    if (!sseEvent) return;

    if (sseEvent.type === 'new-request') {
      const newReq = sseEvent.data as RequestItem;
      setRequests((prev) => [newReq, ...prev.filter((r) => r.id !== newReq.id)]);
    } else if (sseEvent.type === 'request-update') {
      const updated = sseEvent.data as RequestItem;
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
    }
  }, [sseEvent]);

  async function updateStatus(requestId: string, status: 'SEEN' | 'DONE') {
    setUpdateError('');
    // Optimistic update
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status } : r))
    );

    try {
      const res = await fetch(`/api/parties/${hostCode}/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update request');
      }
    } catch (err) {
      // Revert optimistic update
      fetchRequests();
      setUpdateError(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  if (loading) {
    return <LoadingSpinner size="md" />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  const activeRequests = requests.filter((r) => r.status !== 'DONE');
  const doneRequests = requests.filter((r) => r.status === 'DONE');

  // Sort newest first
  activeRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  doneRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-3">
      {updateError && <ErrorMessage message={updateError} onDismiss={() => setUpdateError('')} />}

      {requests.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No requests yet</p>
          <p className="text-sm mt-1">Share your guest link to get started</p>
        </div>
      )}

      {/* Active requests */}
      {activeRequests.map((req) => (
        <div
          key={req.id}
          className={`rounded-xl border-2 p-4 transition-all ${
            req.status === 'NEW'
              ? 'border-blue-300 bg-white shadow-sm'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{CATEGORY_ICONS[req.category]}</span>
                <span className="font-medium truncate">{req.item}</span>
              </div>
              {req.note && (
                <p className="text-sm text-gray-600 ml-7">Note: {req.note}</p>
              )}
              <p className="text-sm text-gray-500 ml-7">
                {req.deliveryType === 'LOCATION'
                  ? `📍 ${req.location?.name || req.deliveryValue}`
                  : `👤 ${req.deliveryValue}`}
              </p>
              <p className="text-xs text-gray-400 ml-7 mt-1">{timeAgo(req.createdAt)}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {req.status === 'NEW' && (
                <>
                  <button
                    onClick={() => updateStatus(req.id, 'SEEN')}
                    className="rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600 transition-all active:scale-95"
                  >
                    Seen
                  </button>
                  <button
                    onClick={() => updateStatus(req.id, 'DONE')}
                    className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 transition-all active:scale-95"
                  >
                    Done
                  </button>
                </>
              )}
              {req.status === 'SEEN' && (
                <button
                  onClick={() => updateStatus(req.id, 'DONE')}
                  className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 transition-all active:scale-95"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Completed requests - collapsed toggle */}
      {doneRequests.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
            aria-expanded={showCompleted}
          >
            <span className="text-xs transition-transform duration-150" style={{ transform: showCompleted ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
            {showCompleted ? 'Hide' : 'Show'} completed ({doneRequests.length})
          </button>
          {showCompleted && (
            <div className="space-y-1 mt-2">
              {doneRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400"
                >
                  <span className="text-sm">{CATEGORY_ICONS[req.category]}</span>
                  <span className="text-sm line-through truncate flex-1">{req.item}</span>
                  <span className="text-xs">{timeAgo(req.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
