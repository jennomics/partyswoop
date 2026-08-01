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

  // Always show all 4 categories in a 2x2 grid (even when empty)
  const CATEGORY_ORDER: RequestItem['category'][] = ['DRINK', 'SUPPLY', 'SONG', 'OTHER'];
  const CATEGORY_LABELS: Record<string, string> = {
    DRINK: 'Drinks',
    SUPPLY: 'Supplies',
    SONG: 'Songs',
    OTHER: 'Other',
  };
  const groupedRequests = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: activeRequests.filter((r) => r.category === cat),
  }));

  function renderCompactRequest(req: RequestItem) {
    return (
      <div
        key={req.id}
        className={`flex items-center justify-between gap-1 px-2 py-1 rounded-md text-xs ${
          req.status === 'NEW'
            ? 'bg-blue-50'
            : 'bg-gray-50'
        }`}
      >
        <span className="truncate flex-1 font-medium text-gray-800">{req.item}</span>
        <div className="flex gap-1 shrink-0">
          {req.status === 'NEW' && (
            <>
              <button
                onClick={() => updateStatus(req.id, 'SEEN')}
                className="rounded bg-yellow-500 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-yellow-600 active:scale-95"
                aria-label={`Mark ${req.item} as seen`}
              >
                Seen
              </button>
              <button
                onClick={() => updateStatus(req.id, 'DONE')}
                className="rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-green-600 active:scale-95"
                aria-label={`Mark ${req.item} as done`}
              >
                Done
              </button>
            </>
          )}
          {req.status === 'SEEN' && (
            <button
              onClick={() => updateStatus(req.id, 'DONE')}
              className="rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-green-600 active:scale-95"
              aria-label={`Mark ${req.item} as done`}
            >
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {updateError && <ErrorMessage message={updateError} onDismiss={() => setUpdateError('')} />}

      {/* 2x2 category tile grid - always visible */}
      <div className="grid grid-cols-2 gap-2">
        {groupedRequests.map((group) => (
          <section
            key={group.category}
            className={`rounded-xl border-2 bg-white flex flex-col overflow-hidden min-h-[120px] ${
              group.items.length > 0
                ? 'border-gray-200 shadow-sm'
                : 'border-dashed border-gray-200'
            }`}
            aria-label={`${CATEGORY_LABELS[group.category]} requests`}
          >
            {/* Tile header */}
            <div className={`flex items-center gap-1.5 px-2.5 py-2 border-b ${
              group.items.length > 0
                ? 'border-gray-200 bg-gray-50'
                : 'border-gray-100 bg-gray-50/50'
            }`}>
              <span className="text-base">{CATEGORY_ICONS[group.category]}</span>
              <span className={`text-xs font-semibold ${
                group.items.length > 0 ? 'text-gray-700' : 'text-gray-400'
              }`}>
                {CATEGORY_LABELS[group.category]}
              </span>
              {group.items.length > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[1.1rem] h-4 px-1 rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                  {group.items.length}
                </span>
              )}
            </div>
            {/* Tile content */}
            <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
              {group.items.length > 0 ? (
                group.items.map(renderCompactRequest)
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className="text-[11px] text-gray-300">No requests</span>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Completed requests - collapsed toggle */}
      {doneRequests.length > 0 && (
        <div className="pt-1">
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
