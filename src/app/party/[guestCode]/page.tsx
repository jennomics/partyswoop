'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import DrinkRequest from '@/components/guest/DrinkRequest';
import SupplyRequest from '@/components/guest/SupplyRequest';
import SongRequest from '@/components/guest/SongRequest';
import OtherRequest from '@/components/guest/OtherRequest';
import RequestTracker from '@/components/guest/RequestTracker';
import SongQueue from '@/components/guest/SongQueue';
import SupplyQueue from '@/components/guest/SupplyQueue';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

interface MenuItem {
  id: string;
  name: string;
  available: boolean;
  category: 'DRINK' | 'SUPPLY';
}

interface LocationInfo {
  id: string;
  name: string;
  code: string;
}

interface PartyData {
  name: string;
  menuItems: MenuItem[];
  locations: LocationInfo[];
  currentLocation: LocationInfo | null;
}

type Category = 'drink' | 'supply' | 'song' | 'other';
type Sheet = Category | 'songQueue' | 'supplyQueue' | 'tracker' | null;

interface SubmittedRequest {
  id: string;
  item: string;
  note: string | null;
  category: string;
}

export default function GuestPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const guestCode = params.guestCode as string;
  const locationCode = searchParams.get('loc');

  const [party, setParty] = useState<PartyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSheet, setActiveSheet] = useState<Sheet>(null);
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedRequest | null>(null);
  const [myRequestIds, setMyRequestIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem(`partyswoop:songIds:${guestCode}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [mySupplyRequestIds, setMySupplyRequestIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem(`partyswoop:supplyIds:${guestCode}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(`partyswoop:songIds:${guestCode}`, JSON.stringify(myRequestIds));
    } catch {
      // sessionStorage may be unavailable
    }
  }, [myRequestIds, guestCode]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`partyswoop:supplyIds:${guestCode}`, JSON.stringify(mySupplyRequestIds));
    } catch {
      // sessionStorage may be unavailable
    }
  }, [mySupplyRequestIds, guestCode]);

  const fetchParty = useCallback(async () => {
    try {
      const url = locationCode
        ? `/api/party/${guestCode}?loc=${locationCode}`
        : `/api/party/${guestCode}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Party not found');
      }
      const data = await res.json();
      setParty(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load party');
    } finally {
      setLoading(false);
    }
  }, [guestCode, locationCode]);

  useEffect(() => {
    fetchParty();
  }, [fetchParty]);

  function handleRequestSubmitted(request: SubmittedRequest) {
    setSubmittedRequest(request);
    if (request.category === 'SONG') {
      setMyRequestIds((prev) => [...prev, request.id]);
    }
    if (request.category === 'SUPPLY') {
      setMySupplyRequestIds((prev) => [...prev, request.id]);
    }
    setActiveSheet('tracker');
  }

  function closeSheet() {
    setActiveSheet(null);
    setSubmittedRequest(null);
  }

  if (loading) {
    return (
      <main className="flex h-dvh items-center justify-center bg-paper">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (error || !party) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center p-s-2 bg-paper">
        <ErrorMessage message={error || 'This party does not exist or has ended.'} />
      </main>
    );
  }

  const drinks = party.menuItems.filter((i) => i.category === 'DRINK');
  const supplies = party.menuItems.filter((i) => i.category === 'SUPPLY');

  const categories: { id: Category; label: string }[] = [
    { id: 'drink', label: 'A drink' },
    { id: 'supply', label: 'A supply' },
    { id: 'song', label: 'A song' },
    { id: 'other', label: 'Something else' },
  ];

  return (
    <main className="h-dvh bg-paper flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 pt-s-3 pb-s-2 px-s-2">
        <p className="font-mono text-meta uppercase tracking-wide text-ink-50">{party.name}</p>
        <h1 className="font-zen text-h2 font-medium text-ink mt-s-1">Need something?</h1>
        {party.currentLocation && (
          <p className="font-mono text-meta text-ink-50 mt-s-1">
            {party.currentLocation.name}
          </p>
        )}
      </div>

      {/* Category grid - 2x2 bordered panels matching host design */}
      <div className="flex-1 flex flex-col px-s-2 min-h-0">
        <div className="w-full max-w-sm mx-auto grid grid-cols-2 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveSheet(cat.id)}
              className="border border-rule p-4 min-h-[120px] text-left flex flex-col focus:outline-none focus:ring-1 focus:ring-ink"
              aria-label={`Request ${cat.label.toLowerCase()}`}
            >
              <span className="font-mono text-meta text-ink-50 uppercase">
                {cat.label.toUpperCase()}
              </span>
            </button>
          ))}
        </div>

        {/* Queue links */}
        <div className="flex gap-s-3 mt-s-4 max-w-sm mx-auto w-full">
          <button
            onClick={() => setActiveSheet('songQueue')}
            className="text-body text-ink-50 underline h-11 flex items-center focus:outline-none focus:ring-1 focus:ring-ink"
            aria-label="View song request queue"
          >
            Song queue
          </button>
          <button
            onClick={() => setActiveSheet('supplyQueue')}
            className="text-body text-ink-50 underline h-11 flex items-center focus:outline-none focus:ring-1 focus:ring-ink"
            aria-label="View supply request queue"
          >
            Supply queue
          </button>
        </div>
      </div>

      {/* Panel overlay */}
      {activeSheet && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            onClick={closeSheet}
            aria-hidden="true"
          />
          {/* Panel */}
          <div className="relative mt-auto bg-paper h-full flex flex-col border-t border-rule">
            {/* Header with close */}
            <div className="shrink-0 flex items-center justify-between px-s-2 pt-s-2 pb-s-1 border-b border-rule">
              <div />
              <button
                onClick={closeSheet}
                className="h-11 flex items-center text-body text-ink underline focus:outline-none focus:ring-1 focus:ring-ink"
                aria-label="Close"
              >
                Close
              </button>
            </div>
            {/* Panel content - scrollable */}
            <div className="flex-1 overflow-y-auto px-s-2 py-s-2 min-h-0">
              {activeSheet === 'drink' && (
                <DrinkRequest
                  guestCode={guestCode}
                  drinks={drinks}
                  currentLocation={party.currentLocation}
                  onSubmitted={handleRequestSubmitted}
                />
              )}
              {activeSheet === 'supply' && (
                <SupplyRequest
                  guestCode={guestCode}
                  supplies={supplies}
                  currentLocation={party.currentLocation}
                  onSubmitted={handleRequestSubmitted}
                />
              )}
              {activeSheet === 'song' && (
                <SongRequest guestCode={guestCode} onSubmitted={handleRequestSubmitted} />
              )}
              {activeSheet === 'other' && (
                <OtherRequest guestCode={guestCode} onSubmitted={handleRequestSubmitted} />
              )}
              {activeSheet === 'songQueue' && (
                <SongQueue guestCode={guestCode} myRequestIds={myRequestIds} />
              )}
              {activeSheet === 'supplyQueue' && (
                <SupplyQueue guestCode={guestCode} myRequestIds={mySupplyRequestIds} partyName={party.name} />
              )}
              {activeSheet === 'tracker' && submittedRequest && (
                <div>
                  <RequestTracker
                    guestCode={guestCode}
                    requestId={submittedRequest.id}
                    item={submittedRequest.item}
                    note={submittedRequest.note}
                    category={submittedRequest.category}
                  />
                  <button
                    onClick={closeSheet}
                    className="mt-s-3 h-11 text-body text-ink underline focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    Make another request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
