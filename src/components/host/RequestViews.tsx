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

type GroupBy = 'guest' | 'location' | 'item';
type StatusFilter = 'NEW' | 'SEEN' | 'DONE' | 'ALL';
type CategoryFilter = 'DRINK' | 'SUPPLY' | 'SONG' | 'OTHER' | 'ALL';

const CATEGORY_ICONS: Record<string, string> = {
  DRINK: '🍺',
  SUPPLY: '🧻',
  SONG: '🎵',
  OTHER: '💬',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  SEEN: 'bg-yellow-100 text-yellow-800',
  DONE: 'bg-green-100 text-green-800',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function groupRequests(requests: RequestItem[], groupBy: GroupBy): Record<string, RequestItem[]> {
  const groups: Record<string, RequestItem[]> = {};

  for (const req of requests) {
    let key: string;
    switch (groupBy) {
      case 'guest':
        key = req.deliveryType === 'NAME' ? req.deliveryValue : 'Location-based Deliveries';
        break;
      case 'location':
        key = req.location?.name || req.deliveryValue || 'No Location';
        break;
      case 'item':
        key = req.item;
        break;
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(req);
  }

  return groups;
}

export default function RequestViews({ hostCode }: { hostCode: string }) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('guest');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  // Handle SSE events for real-time updates
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

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  if (loading) {
    return <LoadingSpinner size="md" />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  // Apply filters
  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && req.category !== categoryFilter) return false;
    return true;
  });

  const groups = groupRequests(filteredRequests, groupBy);
  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    // Sort by count descending, then alphabetically
    const countDiff = groups[b].length - groups[a].length;
    if (countDiff !== 0) return countDiff;
    return a.localeCompare(b);
  });

  const groupByTabs: { id: GroupBy; label: string }[] = [
    { id: 'guest', label: 'By Guest' },
    { id: 'location', label: 'By Location' },
    { id: 'item', label: 'By Item' },
  ];

  return (
    <div className="space-y-4">
      {/* Group-by tabs */}
      <div role="tablist" aria-label="Group requests by" className="flex rounded-lg border border-gray-200 overflow-hidden">
        {groupByTabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={groupBy === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setGroupBy(tab.id)}
            onKeyDown={(e) => {
              const currentIndex = groupByTabs.findIndex((t) => t.id === groupBy);
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % groupByTabs.length;
                setGroupBy(groupByTabs[nextIndex].id);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + groupByTabs.length) % groupByTabs.length;
                setGroupBy(groupByTabs[prevIndex].id);
              }
            }}
            tabIndex={groupBy === tab.id ? 0 : -1}
            className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
              groupBy === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All</option>
            <option value="NEW">New</option>
            <option value="SEEN">Seen</option>
            <option value="DONE">Done</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="category-filter" className="text-sm font-medium text-gray-700">
            Category:
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All</option>
            <option value="DRINK">Drinks</option>
            <option value="SUPPLY">Supplies</option>
            <option value="SONG">Songs</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Results summary */}
      <p className="text-sm text-gray-500">
        {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} in {sortedGroupKeys.length} group{sortedGroupKeys.length !== 1 ? 's' : ''}
      </p>

      {/* Tabpanel content */}
      <div
        role="tabpanel"
        id={`tabpanel-${groupBy}`}
        aria-labelledby={`tab-${groupBy}`}
        className="space-y-2"
      >
        {sortedGroupKeys.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No requests match filters</p>
            <p className="text-sm mt-1">Try adjusting the status or category filter</p>
          </div>
        )}

        {sortedGroupKeys.map((groupKey) => {
          const groupRequests = groups[groupKey];
          const isExpanded = expandedGroups.has(groupKey);
          const newCount = groupRequests.filter((r) => r.status === 'NEW').length;
          const seenCount = groupRequests.filter((r) => r.status === 'SEEN').length;
          const doneCount = groupRequests.filter((r) => r.status === 'DONE').length;

          return (
            <div key={groupKey} className="rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleGroup(groupKey)}
                aria-expanded={isExpanded}
                aria-controls={`group-content-${groupKey}`}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-sm transition-transform duration-150"
                    aria-hidden="true"
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  >
                    ▶
                  </span>
                  <span className="font-medium truncate">{groupKey}</span>
                  <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5">
                    {groupRequests.length}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  {newCount > 0 && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5">
                      {newCount} new
                    </span>
                  )}
                  {seenCount > 0 && (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5">
                      {seenCount} seen
                    </span>
                  )}
                  {doneCount > 0 && (
                    <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs px-1.5 py-0.5">
                      {doneCount} done
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div
                  id={`group-content-${groupKey}`}
                  role="region"
                  aria-label={`Requests for ${groupKey}`}
                  className="border-t border-gray-100"
                >
                  {groupRequests
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50"
                      >
                        <span className="text-base" aria-label={req.category}>
                          {CATEGORY_ICONS[req.category]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{req.item}</span>
                            <span className={`inline-flex items-center rounded-full text-xs px-1.5 py-0.5 ${STATUS_COLORS[req.status]}`}>
                              {req.status.toLowerCase()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {groupBy !== 'guest' && req.deliveryType === 'NAME' && (
                              <span>👤 {req.deliveryValue} · </span>
                            )}
                            {groupBy !== 'location' && (
                              <span>
                                {req.deliveryType === 'LOCATION'
                                  ? `📍 ${req.location?.name || req.deliveryValue}`
                                  : ''}{' '}
                              </span>
                            )}
                            <span>{timeAgo(req.createdAt)}</span>
                          </div>
                          {req.note && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                              Note: {req.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
