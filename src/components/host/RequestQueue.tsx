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

  // Sort newest first within each group
  activeRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  doneRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Group active requests by category
  const categories: RequestItem['category'][] = ['DRINK', 'SUPPLY', 'SONG', 'OTHER'];
  const CATEGORY_LABELS: Record<string, string> = {
    DRINK: 'Drinks',
    SUPPLY: 'Supplies',
    SONG: 'Songs',
    OTHER: 'Other',
  };
  const groupedRequests = categories
    .map((cat) => ({
      category: cat,
      items: activeRequests.filter((r) => r.category === cat),
    }))
    .filter((group) => group.items.length > 0);

  function renderRequestRow(req: RequestItem) {
    return (
      <div
        key={req.id}
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all ${
          req.status === 'NEW'
            ? 'bg-blue-50 border border-blue-200'
            : 'bg-gray-50 border border-gray-100'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{req.item}</span>
            {req.status === 'NEW' && (
              <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" aria-label="New request" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <span className="truncate">
              {req.deliveryType === 'LOCATION'
                ? `📍 ${req.location?.name || req.deliveryValue}`
                : `👤 ${req.deliveryValue}`}
            </span>
            {req.note && <span className="truncate text-gray-400">· {req.note}</span>}
            <span className="shrink-0 text-gray-400">{timeAgo(req.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {req.status === 'NEW' && (
            <>
              <button
                onClick={() => updateStatus(req.id, 'SEEN')}
                className="rounded-md bg-yellow-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-yellow-600 transition-all active:scale-95"
              >
                Seen
              </button>
              <button
                onClick={() => updateStatus(req.id, 'DONE')}
                className="rounded-md bg-green-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-600 transition-all active:scale-95"
              >
                Done
              </button>
            </>
          )}
          {req.status === 'SEEN' && (
            <button
              onClick={() => updateStatus(req.id, 'DONE')}
              className="rounded-md bg-green-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-600 transition-all active:scale-95"
            >
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {updateError && <ErrorMessage message={updateError} onDismiss={() => setUpdateError('')} />}

      {requests.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No requests yet</p>
          <p className="text-sm mt-1">Share your guest link to get started</p>
        </div>
      )}

      {/* Active requests grouped by category tiles */}
      {groupedRequests.map((group) => (
        <section
          key={group.category}
          className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          aria-label={`${CATEGORY_LABELS[group.category]} requests`}
        >
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-lg">{CATEGORY_ICONS[group.category]}</span>
            <h3 className="text-sm font-semibold text-gray-700">{CATEGORY_LABELS[group.category]}</h3>
            <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gray-200 text-xs font-medium text-gray-600">
              {group.items.length}
            </span>
          </div>
          <div className="p-2 space-y-1.5">
            {group.items.map(renderRequestRow)}
          </div>
        </section>
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
