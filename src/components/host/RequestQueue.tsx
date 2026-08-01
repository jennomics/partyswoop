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
  const [selectedCategory, setSelectedCategory] = useState<RequestItem['category'] | null>(null);

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

  function renderRequestRow(req: RequestItem) {
    return (
      <div
        key={req.id}
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm ${
          req.status === 'NEW'
            ? 'bg-blue-50 border border-blue-100'
            : 'bg-gray-50 border border-gray-100'
        }`}
      >
        <div className="flex flex-col min-w-0 flex-1">
          <span className="truncate font-medium text-gray-800">{req.item}</span>
          <span className="text-xs text-gray-500 truncate">
            {req.deliveryType === 'LOCATION' && req.location
              ? `📍 ${req.location.name}`
              : `👤 ${req.deliveryValue}`}
            {' · '}{timeAgo(req.createdAt)}
          </span>
          {req.note && (
            <span className="text-xs text-gray-400 truncate mt-0.5">
              &quot;{req.note}&quot;
            </span>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          {req.status === 'NEW' && (
            <>
              <button
                onClick={() => updateStatus(req.id, 'SEEN')}
                className="rounded-md bg-yellow-500 px-2 py-1 text-xs font-medium text-white hover:bg-yellow-600 active:scale-95 transition-transform"
                aria-label={`Mark ${req.item} as seen`}
              >
                Seen
              </button>
              <button
                onClick={() => updateStatus(req.id, 'DONE')}
                className="rounded-md bg-green-500 px-2 py-1 text-xs font-medium text-white hover:bg-green-600 active:scale-95 transition-transform"
                aria-label={`Mark ${req.item} as done`}
              >
                Done
              </button>
            </>
          )}
          {req.status === 'SEEN' && (
            <button
              onClick={() => updateStatus(req.id, 'DONE')}
              className="rounded-md bg-green-500 px-2 py-1 text-xs font-medium text-white hover:bg-green-600 active:scale-95 transition-transform"
              aria-label={`Mark ${req.item} as done`}
            >
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  // Expanded category view
  const selectedGroup = selectedCategory
    ? groupedRequests.find((g) => g.category === selectedCategory)
    : null;

  return (
    <div className="space-y-3">
      {updateError && <ErrorMessage message={updateError} onDismiss={() => setUpdateError('')} />}

      {/* Expanded category panel */}
      {selectedCategory && selectedGroup ? (
        <div className="space-y-2">
          {/* Back button and header */}
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors py-1"
            aria-label="Back to all categories"
          >
            <span className="text-xs">←</span>
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2 px-1">
            <span className="text-2xl">{CATEGORY_ICONS[selectedCategory]}</span>
            <h3 className="text-lg font-bold text-gray-800">
              {CATEGORY_LABELS[selectedCategory]}
            </h3>
            {selectedGroup.items.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {selectedGroup.items.length}
              </span>
            )}
          </div>

          {/* Request list */}
          <div className="space-y-2">
            {selectedGroup.items.length > 0 ? (
              selectedGroup.items.map(renderRequestRow)
            ) : (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-gray-400">No active requests</span>
              </div>
            )}
          </div>

          {/* Done requests for this category */}
          {doneRequests.filter((r) => r.category === selectedCategory).length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-400 mb-1.5 px-1">
                Completed ({doneRequests.filter((r) => r.category === selectedCategory).length})
              </p>
              <div className="space-y-1">
                {doneRequests
                  .filter((r) => r.category === selectedCategory)
                  .map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400"
                    >
                      <span className="text-sm line-through truncate flex-1">{req.item}</span>
                      <span className="text-xs">{timeAgo(req.createdAt)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 2x2 category tile grid - compact, clickable tiles */}
          <div className="grid grid-cols-2 gap-2">
            {groupedRequests.map((group) => (
              <button
                key={group.category}
                type="button"
                onClick={() => setSelectedCategory(group.category)}
                className={`rounded-xl border-2 bg-white flex flex-col items-center justify-center p-4 min-h-[100px] transition-all active:scale-95 ${
                  group.items.length > 0
                    ? 'border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md'
                    : 'border-dashed border-gray-200 hover:border-gray-300'
                }`}
                aria-label={`${CATEGORY_LABELS[group.category]} - ${group.items.length} requests. Tap to view.`}
              >
                <span className="text-3xl mb-1">{CATEGORY_ICONS[group.category]}</span>
                <span className={`text-sm font-semibold ${
                  group.items.length > 0 ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {CATEGORY_LABELS[group.category]}
                </span>
                {group.items.length > 0 ? (
                  <span className="mt-1 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {group.items.length}
                  </span>
                ) : (
                  <span className="mt-1 text-xs text-gray-300">None</span>
                )}
              </button>
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
        </>
      )}
    </div>
  );
}
