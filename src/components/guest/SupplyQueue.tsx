'use client';

import { useCallback } from 'react';
import { usePolling } from '@/hooks/usePolling';
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

export default function SupplyQueue({ guestCode, myRequestIds, partyName: _partyName }: SupplyQueueProps) {
  const transform = useCallback((json: unknown) => {
    const data = json as { supplies: SupplyQueueItem[] };
    return data.supplies;
  }, []);

  const { data: supplies, loading, error } = usePolling<SupplyQueueItem[]>({
    url: `/api/party/${guestCode}/requests/supplies`,
    intervalMs: 3000,
    transform,
  });

  if (loading) {
    return (
      <div className="flex justify-center py-s-4" role="status" aria-label="Loading supply queue">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  const beingDelivered = (supplies || []).filter((s) => s.status === 'SEEN');
  const inQueue = (supplies || []).filter((s) => s.status === 'NEW');
  const delivered = (supplies || []).filter((s) => s.status === 'DONE');

  const isMine = (id: string) => myRequestIds.includes(id);

  return (
    <div role="region" aria-label="Supply request queue">
      {/* Being Delivered */}
      <section aria-labelledby="being-delivered-heading" className="mb-s-4">
        <h3
          id="being-delivered-heading"
          className="font-mono text-meta text-ink-50 uppercase mb-s-2"
        >
          Being delivered {beingDelivered.length > 0 && `(${beingDelivered.length})`}
        </h3>
        {beingDelivered.length > 0 ? (
          <ul role="list" aria-label="Supplies being delivered">
            {beingDelivered.map((supply) => (
              <li
                key={supply.id}
                className="bg-live px-s-2 py-s-2 min-h-[44px] mb-s-1"
                aria-label={`${supply.item} to ${getDestination(supply)} - being delivered${isMine(supply.id) ? ' (your request)' : ''}`}
              >
                <div className="flex items-center">
                  <div className="flex-1 min-w-0">
                    <p className="font-zen font-medium text-list text-white truncate">{supply.item}</p>
                    <p className="font-mono text-meta text-white/70 truncate">
                      To: {getDestination(supply)}
                    </p>
                  </div>
                  {isMine(supply.id) && (
                    <span className="shrink-0 font-mono text-meta text-white/70 ml-s-2">
                      You
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-35 font-zen text-body">No supplies being delivered right now</p>
        )}
      </section>

      {/* In Queue */}
      <section aria-labelledby="supply-queue-heading" className="mb-s-4">
        <h3
          id="supply-queue-heading"
          className="font-mono text-meta text-ink-50 uppercase mb-s-2"
        >
          In queue {inQueue.length > 0 && `(${inQueue.length})`}
        </h3>
        {inQueue.length > 0 ? (
          <ol role="list" aria-label="Supplies waiting in queue">
            {inQueue.map((supply, index) => (
              <li
                key={supply.id}
                className="flex items-center border-b border-rule py-s-2 min-h-[44px]"
                aria-label={`Position ${index + 1}: ${supply.item} to ${getDestination(supply)}${isMine(supply.id) ? ' (your request)' : ''}`}
              >
                <span className="shrink-0 w-8 font-mono text-meta text-ink">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-zen text-list text-ink truncate">{supply.item}</p>
                  <p className="font-mono text-meta text-ink-50 truncate">
                    To: {getDestination(supply)}
                  </p>
                </div>
                {isMine(supply.id) && (
                  <span className="shrink-0 font-mono text-meta text-ink-50 ml-s-2">
                    You
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-ink-35 font-zen text-body">No supplies waiting in queue</p>
        )}
      </section>

      {/* Delivered */}
      {delivered.length > 0 && (
        <section aria-labelledby="delivered-heading" className="mb-s-4">
          <h3
            id="delivered-heading"
            className="font-mono text-meta text-ink-50 uppercase mb-s-2"
          >
            Delivered ({delivered.length})
          </h3>
          <ul role="list" aria-label="Supplies already delivered">
            {delivered.map((supply) => (
              <li
                key={supply.id}
                className="flex items-center border-b border-rule py-s-2 min-h-[44px]"
                aria-label={`${supply.item} to ${getDestination(supply)} - delivered${isMine(supply.id) ? ' (your request)' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-zen text-list text-ink-35 line-through truncate">{supply.item}</p>
                  <p className="font-mono text-meta text-ink-35 truncate">
                    To: {getDestination(supply)}
                  </p>
                </div>
                {isMine(supply.id) && (
                  <span className="shrink-0 font-mono text-meta text-ink-50 ml-s-2">
                    You
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Empty state */}
      {(supplies || []).length === 0 && (
        <div className="py-s-4">
          <p className="text-ink-50 font-zen text-body">No supply requests yet</p>
        </div>
      )}
    </div>
  );
}
