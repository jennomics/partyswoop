'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSSE } from '@/hooks/useSSE';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

interface SupplyQueueItem {
  id: string;
  item: string;
  deliveryType: string;
  deliveryValue: string;
  status: string;
  createdAt: string;
  location: { id: string; name: string | null } | null;
}

interface SupplyQueueProps {
  guestCode: string;
  myRequestIds: string[];
  partyName: string;
}

function getDestination(supply: SupplyQueueItem): string {
  if (supply.deliveryType === 'LOCATION' && supply.location?.name) {
    return supply.location.name;
  }
  return supply.deliveryValue;
}

export default function SupplyQueue({ guestCode, myRequestIds, partyName }: SupplyQueueProps) {
  const [supplies, setSupplies] = useState<SupplyQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sseEvent = useSSE(`/api/party/${guestCode}/events`, ['request-update', 'new-request']);

  const fetchSupplies = useCallback(async () => {
    try {
      const res = await fetch(`/api/party/${guestCode}/requests/supplies`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load supply queue');
      }
      const data = await res.json();
      setSupplies(data.supplies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load supply queue');
    } finally {
      setLoading(false);
    }
  }, [guestCode]);

  useEffect(() => {
    fetchSupplies();
  }, [fetchSupplies]);

  // Handle SSE updates
  useEffect(() => {
    if (!sseEvent) return;
    const data = sseEvent.data as Record<string, unknown> | null | undefined;
    if (!data || typeof data !== 'object') return;

    if (sseEvent.type === 'request-update') {
      const updatedId = data.id as string | undefined;
      const updatedStatus = data.status as string | undefined;
      if (!updatedId || !updatedStatus) return;
      setSupplies((prev) =>
        prev.map((supply) =>
          supply.id === updatedId ? { ...supply, status: updatedStatus } : supply
        )
      );
    }

    if (sseEvent.type === 'new-request') {
      const category = data.category as string | undefined;
      if (category !== 'SUPPLY') return;
      const id = data.id as string | undefined;
      const item = data.item as string | undefined;
      const deliveryType = data.deliveryType as string | undefined;
      const deliveryValue = data.deliveryValue as string | undefined;
      const status = data.status as string | undefined;
      const createdAt = data.createdAt as string | undefined;
      if (!id || !item || !deliveryType || !deliveryValue || !status || !createdAt) return;
      const location = data.location as { id: string; name: string | null } | null | undefined;
      const newSupply: SupplyQueueItem = {
        id,
        item,
        deliveryType,
        deliveryValue,
        status,
        createdAt,
        location: location ?? null,
      };
      setSupplies((prev) => [...prev, newSupply]);
    }
  }, [sseEvent]);

  if (loading) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Loading supply queue">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  const beingDelivered = supplies.filter((s) => s.status === 'SEEN');
  const inQueue = supplies.filter((s) => s.status === 'NEW');
  const delivered = supplies.filter((s) => s.status === 'DONE');

  const isMine = (id: string) => myRequestIds.includes(id);

  return (
    <div className="space-y-6" role="region" aria-label="Supply request queue">
      {/* Being Delivered */}
      <section aria-labelledby="being-delivered-heading">
        <h3
          id="being-delivered-heading"
          className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
        >
          Being Delivered {beingDelivered.length > 0 && `(${beingDelivered.length})`}
        </h3>
        {beingDelivered.length > 0 ? (
          <ul className="space-y-2" role="list" aria-label="Supplies being delivered">
            {beingDelivered.map((supply) => (
              <li
                key={supply.id}
                className={`rounded-lg border-2 p-4 ${
                  isMine(supply.id)
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
                aria-label={`${supply.item} to ${getDestination(supply)} - being delivered${isMine(supply.id) ? ' (your request)' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">🚚</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{supply.item}</p>
                    <p className="text-sm text-gray-600 truncate">
                      To: {getDestination(supply)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Delivered by: {partyName}
                    </p>
                  </div>
                  {isMine(supply.id) && (
                    <span className="shrink-0 text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      You
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm italic">No supplies being delivered right now</p>
        )}
      </section>

      {/* In Queue */}
      <section aria-labelledby="supply-queue-heading">
        <h3
          id="supply-queue-heading"
          className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
        >
          In Queue {inQueue.length > 0 && `(${inQueue.length})`}
        </h3>
        {inQueue.length > 0 ? (
          <ol className="space-y-2" role="list" aria-label="Supplies waiting in queue">
            {inQueue.map((supply, index) => (
              <li
                key={supply.id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  isMine(supply.id)
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
                aria-label={`Position ${index + 1}: ${supply.item} to ${getDestination(supply)}${isMine(supply.id) ? ' (your request)' : ''}`}
              >
                <span className="shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{supply.item}</p>
                  <p className="text-xs text-gray-500 truncate">
                    To: {getDestination(supply)}
                  </p>
                </div>
                {isMine(supply.id) && (
                  <span className="shrink-0 text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    You
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-gray-400 text-sm italic">No supplies waiting in queue</p>
        )}
      </section>

      {/* Delivered */}
      {delivered.length > 0 && (
        <section aria-labelledby="delivered-heading">
          <h3
            id="delivered-heading"
            className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
          >
            Delivered ({delivered.length})
          </h3>
          <ul className="space-y-2" role="list" aria-label="Supplies already delivered">
            {delivered.map((supply) => (
              <li
                key={supply.id}
                className={`flex items-center gap-3 rounded-lg border p-3 opacity-60 ${
                  isMine(supply.id)
                    ? 'border-green-300 bg-green-50/50'
                    : 'border-gray-100 bg-gray-50'
                }`}
                aria-label={`${supply.item} to ${getDestination(supply)} - delivered${isMine(supply.id) ? ' (your request)' : ''}`}
              >
                <span className="shrink-0 text-lg" aria-hidden="true">&#10003;</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate line-through text-gray-500">{supply.item}</p>
                  <p className="text-xs text-gray-400 truncate">
                    To: {getDestination(supply)}
                  </p>
                </div>
                {isMine(supply.id) && (
                  <span className="shrink-0 text-xs font-medium bg-green-100 text-green-600 px-2 py-1 rounded-full">
                    You
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Empty state */}
      {supplies.length === 0 && (
        <div className="text-center py-8">
          <span className="text-4xl" aria-hidden="true">🧻</span>
          <p className="text-gray-500 mt-2">No supply requests yet. Be the first!</p>
        </div>
      )}
    </div>
  );
}
