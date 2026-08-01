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
        ? `/api/party/${guestCode}?location=${locationCode}`
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
      <main className="flex h-dvh items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (error || !party) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center p-4 bg-gray-50">
        <ErrorMessage message={error || 'This party does not exist or has ended.'} />
      </main>
    );
  }

  const drinks = party.menuItems.filter((i) => i.category === 'DRINK');
  const supplies = party.menuItems.filter((i) => i.category === 'SUPPLY');

  return (
    <main className="h-dvh bg-gray-50 flex flex-col overflow-hidden">
      {/* Header - compact */}
      <div className="shrink-0 pt-3 pb-2 px-4 text-center">
        <p className="text-[11px] text-gray-400 leading-tight">{party.name}</p>
        <h1 className="text-xl font-bold leading-tight">Need something?</h1>
        {party.currentLocation && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            📍 {party.currentLocation.name}
          </p>
        )}
      </div>

      {/* Main content - category grid fills available space */}
      <div className="flex-1 flex flex-col justify-center px-4 pb-2 min-h-0">
        <div className="grid grid-cols-2 gap-2.5 max-w-xs mx-auto w-full">
          <button
            onClick={() => setActiveSheet('drink')}
            className="flex flex-col items-center justify-center rounded-xl bg-white border-2 border-gray-200 py-5 px-3 hover:border-blue-400 hover:shadow-md transition-all active:scale-95"
            aria-label="Request a drink"
          >
            <span className="text-2xl mb-1">🍺</span>
            <span className="text-xs font-medium">A Drink</span>
          </button>
          <button
            onClick={() => setActiveSheet('supply')}
            className="flex flex-col items-center justify-center rounded-xl bg-white border-2 border-gray-200 py-5 px-3 hover:border-blue-400 hover:shadow-md transition-all active:scale-95"
            aria-label="Request a supply"
          >
            <span className="text-2xl mb-1">🧻</span>
            <span className="text-xs font-medium">A Supply</span>
          </button>
          <button
            onClick={() => setActiveSheet('song')}
            className="flex flex-col items-center justify-center rounded-xl bg-white border-2 border-gray-200 py-5 px-3 hover:border-blue-400 hover:shadow-md transition-all active:scale-95"
            aria-label="Request a song"
          >
            <span className="text-2xl mb-1">🎵</span>
            <span className="text-xs font-medium">A Song</span>
          </button>
          <button
            onClick={() => setActiveSheet('other')}
            className="flex flex-col items-center justify-center rounded-xl bg-white border-2 border-gray-200 py-5 px-3 hover:border-blue-400 hover:shadow-md transition-all active:scale-95"
            aria-label="Request something else"
          >
            <span className="text-2xl mb-1">💬</span>
            <span className="text-xs font-medium">Other</span>
          </button>
        </div>

        {/* Queue links */}
        <div className="flex justify-center gap-4 mt-3">
          <button
            onClick={() => setActiveSheet('songQueue')}
            className="text-[11px] text-gray-400 hover:text-blue-600 transition-colors"
            aria-label="View song request queue"
          >
            🎵 Song Queue
          </button>
          <button
            onClick={() => setActiveSheet('supplyQueue')}
            className="text-[11px] text-gray-400 hover:text-blue-600 transition-colors"
            aria-label="View supply request queue"
          >
            🧻 Supply Queue
          </button>
        </div>
      </div>

      {/* Bottom Sheet Overlay */}
      {activeSheet && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeSheet}
            aria-hidden="true"
          />
          {/* Sheet */}
          <div className="relative mt-auto bg-white rounded-t-2xl max-h-[85dvh] flex flex-col shadow-xl">
            {/* Handle + close */}
            <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100">
              <div className="w-8" />
              <div className="w-10 h-1 rounded-full bg-gray-300" />
              <button
                onClick={closeSheet}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-lg"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            {/* Sheet content - scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
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
                    className="w-full mt-4 rounded-lg border border-gray-300 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
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
