'use client';

import { useState, useEffect, useCallback } from 'react';
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

const CATEGORY_LABELS: Record<string, string> = {
  DRINK: 'Drinks',
  SUPPLY: 'Supplies',
  SONG: 'Songs',
  OTHER: 'Other',
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

  // Poll every 3 seconds for near-real-time updates
  useEffect(() => {
    const interval = setInterval(fetchRequests, 3000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchRequests();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchRequests]);

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

  // Always show all 4 categories
  const CATEGORY_ORDER: RequestItem['category'][] = ['DRINK', 'SUPPLY', 'SONG', 'OTHER'];
  const groupedRequests = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: activeRequests.filter((r) => r.category === cat),
  }));

  // Determine which NEW request is the most recent (the one filled thing)
  const newestNewId = activeRequests.find((r) => r.status === 'NEW')?.id ?? null;

  function renderRequestRow(req: RequestItem) {
    const isNew = req.status === 'NEW';
    const isSeen = req.status === 'SEEN';
    const isNewestNew = req.id === newestNewId;

    return (
      <div
        key={req.id}
        className={`flex items-center justify-between gap-2 p-s-2 min-h-[44px] ${
          isNewestNew
            ? 'bg-live text-white border-b border-white/20'
            : isNew
              ? 'border-l-[1.5px] border-l-live border-b border-rule'
              : 'border-b border-rule'
        }`}
      >
        <div className="flex flex-col min-w-0 flex-1">
          <span className={`truncate text-list font-zen ${isNewestNew ? 'text-white font-medium' : isNew ? 'text-ink font-medium' : 'text-ink'}`}>
            {req.item}
          </span>
          <span className={`font-mono text-meta truncate ${isNewestNew ? 'text-white/70' : 'text-ink-50'}`}>
            {req.deliveryType === 'LOCATION' && req.location
              ? req.location.name
              : req.deliveryValue}
            {' / '}{timeAgo(req.createdAt)}
          </span>
          {req.note && (
            <span className={`text-meta truncate mt-0.5 ${isNewestNew ? 'text-white/70' : 'text-ink-35'}`}>
              &quot;{req.note}&quot;
            </span>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {isNew && isNewestNew && (
            <>
              <button
                onClick={() => updateStatus(req.id, 'SEEN')}
                className="border border-white text-white font-mono text-meta uppercase h-12 px-3 min-h-[44px] min-w-[44px]"
                aria-label={`Mark ${req.item} as seen`}
              >
                Seen
              </button>
              <button
                onClick={() => updateStatus(req.id, 'DONE')}
                className="border-[1.5px] border-white text-white font-mono text-meta uppercase h-12 px-3 min-h-[44px] min-w-[44px]"
                aria-label={`Mark ${req.item} as done`}
              >
                Done
              </button>
            </>
          )}
          {isNew && !isNewestNew && (
            <>
              <button
                onClick={() => updateStatus(req.id, 'SEEN')}
                className="border border-ink text-ink font-mono text-meta uppercase h-12 px-3 min-h-[44px] min-w-[44px]"
                aria-label={`Mark ${req.item} as seen`}
              >
                Seen
              </button>
              <button
                onClick={() => updateStatus(req.id, 'DONE')}
                className="border-[1.5px] border-live text-live font-mono text-meta uppercase h-12 px-3 min-h-[44px] min-w-[44px]"
                aria-label={`Mark ${req.item} as done`}
              >
                Done
              </button>
            </>
          )}
          {isSeen && (
            <button
              onClick={() => updateStatus(req.id, 'DONE')}
              className="border-[1.5px] border-live text-live font-mono text-meta uppercase h-12 px-3 min-h-[44px] min-w-[44px]"
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
            className="flex items-center gap-1.5 text-body text-ink-50 min-h-[44px]"
            aria-label="Back to all categories"
          >
            <span className="text-meta">&#8592;</span>
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2 border-b border-rule pb-2">
            <h3 className="text-h3 font-zen font-medium text-ink">
              {CATEGORY_LABELS[selectedCategory]}
            </h3>
            {selectedGroup.items.length > 0 && (
              <span className="font-mono text-body text-ink">
                {selectedGroup.items.length}
              </span>
            )}
          </div>

          {/* Request list */}
          <div>
            {selectedGroup.items.length > 0 ? (
              selectedGroup.items.map(renderRequestRow)
            ) : (
              <div className="flex items-center justify-center py-8">
                <span className="text-body text-ink-35">No active requests</span>
              </div>
            )}
          </div>

          {/* Done requests for this category */}
          {doneRequests.filter((r) => r.category === selectedCategory).length > 0 && (
            <div className="pt-2 border-t border-rule">
              <p className="font-mono text-meta text-ink-35 uppercase mb-2">
                Completed ({doneRequests.filter((r) => r.category === selectedCategory).length})
              </p>
              <div>
                {doneRequests
                  .filter((r) => r.category === selectedCategory)
                  .map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-2 py-2 border-b border-rule last:border-b-0 min-h-[44px]"
                    >
                      <span className="text-list text-ink-35 line-through truncate flex-1">{req.item}</span>
                      <span className="font-mono text-meta text-ink-35">{timeAgo(req.createdAt)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Category grid - 2x2 bordered panels */}
          <div className="grid grid-cols-2 gap-4">
            {groupedRequests.map((group) => {
              const hasNew = group.items.some((r) => r.status === 'NEW');
              return (
                <button
                  key={group.category}
                  type="button"
                  onClick={() => setSelectedCategory(group.category)}
                  className={`p-4 min-h-[120px] text-left flex flex-col ${
                    hasNew
                      ? 'bg-live border border-live'
                      : 'border border-rule'
                  }`}
                  aria-label={`${CATEGORY_LABELS[group.category]} - ${group.items.length} requests${hasNew ? ', new requests pending' : ''}. Tap to view.`}
                >
                  <span className={`font-mono text-meta uppercase ${
                    hasNew ? 'text-white/70' : 'text-ink-50'
                  }`}>
                    {CATEGORY_LABELS[group.category].toUpperCase()}
                  </span>
                  <span className={`font-mono text-h2 mt-2 ${
                    hasNew ? 'text-white' : group.items.length > 0 ? 'text-ink' : 'text-ink-35'
                  }`}>
                    {group.items.length > 0 ? group.items.length : 'None'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Completed requests - collapsed toggle */}
          {doneRequests.length > 0 && (
            <div className="pt-1">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="w-full flex items-center justify-center gap-2 text-body text-ink-35 min-h-[44px]"
                aria-expanded={showCompleted}
              >
                <span className="text-meta" aria-hidden="true">
                  {showCompleted ? '\u25BC' : '\u25B6'}
                </span>
                <span className="font-mono text-meta uppercase">
                  {showCompleted ? 'Hide' : 'Show'} completed ({doneRequests.length})
                </span>
              </button>
              {showCompleted && (
                <div className="mt-2 border-t border-rule">
                  {doneRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-2 py-2 border-b border-rule last:border-b-0 min-h-[44px]"
                    >
                      <span className="font-mono text-meta text-ink-35 uppercase">{req.category}</span>
                      <span className="text-list text-ink-35 line-through truncate flex-1">{req.item}</span>
                      <span className="font-mono text-meta text-ink-35">{timeAgo(req.createdAt)}</span>
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
