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
        key = req.deliveryType === 'NAME' ? req.deliveryValue : 'Location-based deliveries';
        break;
      case 'location':
        key = req.location?.name || req.deliveryValue || 'No location';
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
    const countDiff = groups[b].length - groups[a].length;
    if (countDiff !== 0) return countDiff;
    return a.localeCompare(b);
  });

  const groupByTabs: { id: GroupBy; label: string }[] = [
    { id: 'guest', label: 'By guest' },
    { id: 'location', label: 'By location' },
    { id: 'item', label: 'By item' },
  ];

  return (
    <div className="space-y-4">
      {/* Group-by tabs - ruled underline style */}
      <div role="tablist" aria-label="Group requests by" className="flex border-b border-rule">
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
            className={`flex-1 py-3 text-list font-zen min-h-[44px] ${
              groupBy === tab.id
                ? 'text-ink border-b-[1.5px] border-ink font-medium'
                : 'text-ink-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-s-3">
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="font-mono text-meta text-ink-50 uppercase">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="border-b border-rule bg-transparent px-1 py-1 text-list font-zen text-ink focus:border-ink focus:outline-none min-h-[44px]"
          >
            <option value="ALL">All</option>
            <option value="NEW">New</option>
            <option value="SEEN">Seen</option>
            <option value="DONE">Done</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="category-filter" className="font-mono text-meta text-ink-50 uppercase">
            Category
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="border-b border-rule bg-transparent px-1 py-1 text-list font-zen text-ink focus:border-ink focus:outline-none min-h-[44px]"
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
      <p className="font-mono text-meta text-ink-35">
        {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} in {sortedGroupKeys.length} group{sortedGroupKeys.length !== 1 ? 's' : ''}
      </p>

      {/* Tabpanel content */}
      <div
        role="tabpanel"
        id={`tabpanel-${groupBy}`}
        aria-labelledby={`tab-${groupBy}`}
      >
        {sortedGroupKeys.length === 0 && (
          <div className="text-center py-12 text-ink-50">
            <p className="text-body">No requests match filters</p>
            <p className="text-meta mt-1">Try adjusting the status or category filter</p>
          </div>
        )}

        {sortedGroupKeys.map((groupKey) => {
          const groupReqs = groups[groupKey];
          const isExpanded = expandedGroups.has(groupKey);
          const newCount = groupReqs.filter((r) => r.status === 'NEW').length;
          const seenCount = groupReqs.filter((r) => r.status === 'SEEN').length;
          const doneCount = groupReqs.filter((r) => r.status === 'DONE').length;

          // Only the most recent NEW request in the group gets bg-live fill
          const sortedGroupReqs = [...groupReqs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const newestNewInGroup = sortedGroupReqs.find((r) => r.status === 'NEW')?.id ?? null;

          return (
            <div key={groupKey} className="border-b border-rule">
              <button
                onClick={() => toggleGroup(groupKey)}
                aria-expanded={isExpanded}
                aria-controls={`group-content-${groupKey}`}
                className="w-full flex items-center justify-between p-s-2 min-h-[44px] text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-meta text-ink-50"
                    aria-hidden="true"
                  >
                    {isExpanded ? '\u25BC' : '\u25B6'}
                  </span>
                  <span className="font-zen text-list text-ink truncate">{groupKey}</span>
                  <span className="font-mono text-meta text-ink-50">
                    {groupReqs.length}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0 ml-2 font-mono text-meta">
                  {newCount > 0 && (
                    <span className="text-live">
                      {newCount} new
                    </span>
                  )}
                  {seenCount > 0 && (
                    <span className="text-ink-72">
                      {seenCount} seen
                    </span>
                  )}
                  {doneCount > 0 && (
                    <span className="text-ink-35">
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
                  className="border-t border-rule"
                >
                  {sortedGroupReqs.map((req) => {
                      const isNewestNew = req.id === newestNewInGroup;
                      const isNew = req.status === 'NEW';

                      return (
                        <div
                          key={req.id}
                          className={`flex items-center gap-3 px-s-2 py-2 border-b border-rule last:border-b-0 min-h-[44px] ${
                            isNewestNew
                              ? 'bg-live text-white'
                              : isNew
                                ? 'border-l-[1.5px] border-l-live'
                                : ''
                          }`}
                        >
                          <span className={`font-mono text-meta uppercase ${
                            isNewestNew ? 'text-white/70' : 'text-ink-50'
                          }`} aria-label={req.category}>
                            {req.category}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-list font-zen truncate ${
                                isNewestNew ? 'text-white' :
                                isNew ? 'text-ink font-medium' :
                                req.status === 'DONE' ? 'text-ink-35 line-through' : 'text-ink'
                              }`}>{req.item}</span>
                              <span className={`font-mono text-meta ${
                                isNewestNew ? 'text-white/70' :
                                req.status === 'DONE' ? 'text-ink-35' : 'text-ink-72'
                              }`}>
                                {req.status.toLowerCase()}
                              </span>
                            </div>
                            <div className={`font-mono text-meta mt-0.5 ${
                              isNewestNew ? 'text-white/70' : 'text-ink-35'
                            }`}>
                              {groupBy !== 'guest' && req.deliveryType === 'NAME' && (
                                <span>{req.deliveryValue} / </span>
                              )}
                              {groupBy !== 'location' && (
                                <span>
                                  {req.deliveryType === 'LOCATION'
                                    ? `${req.location?.name || req.deliveryValue}`
                                    : ''}{' '}
                                </span>
                              )}
                              <span>{timeAgo(req.createdAt)}</span>
                            </div>
                            {req.note && (
                              <p className={`text-meta mt-0.5 truncate ${
                                isNewestNew ? 'text-white/70' : 'text-ink-35'
                              }`}>
                                Note: {req.note}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
