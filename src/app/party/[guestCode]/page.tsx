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

type Category = 'drink' | 'supply' | 'song' | 'other' | null;
type View = 'main' | 'songQueue' | 'supplyQueue';

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
  const [selectedCategory, setSelectedCategory] = useState<Category>(null);
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedRequest | null>(null);
  const [currentView, setCurrentView] = useState<View>('main');
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

  // Persist myRequestIds to sessionStorage whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem(`partyswoop:songIds:${guestCode}`, JSON.stringify(myRequestIds));
    } catch {
      // sessionStorage may be unavailable in some contexts
    }
  }, [myRequestIds, guestCode]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`partyswoop:supplyIds:${guestCode}`, JSON.stringify(mySupplyRequestIds));
    } catch {
      // sessionStorage may be unavailable in some contexts
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
  }

  function handleBack() {
    setSelectedCategory(null);
  }

  function handleNewRequest() {
    setSubmittedRequest(null);
    setSelectedCategory(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (error || !party) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <ErrorMessage message={error || 'This party does not exist or has ended.'} />
      </main>
    );
  }

  // Show song queue view
  if (currentView === 'songQueue') {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-sm mx-auto">
          <button
            onClick={() => setCurrentView('main')}
            className="text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            &larr; Back
          </button>
          <h2 className="text-xl font-bold mb-4">Song Queue</h2>
          <SongQueue guestCode={guestCode} myRequestIds={myRequestIds} />
        </div>
      </main>
    );
  }

  // Show supply queue view
  if (currentView === 'supplyQueue') {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-sm mx-auto">
          <button
            onClick={() => setCurrentView('main')}
            className="text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            &larr; Back
          </button>
          <h2 className="text-xl font-bold mb-4">Supply Queue</h2>
          <SupplyQueue guestCode={guestCode} myRequestIds={mySupplyRequestIds} partyName={party.name} />
        </div>
      </main>
    );
  }

  // Show request tracker if a request was submitted
  if (submittedRequest) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-sm mx-auto">
          <RequestTracker
            guestCode={guestCode}
            requestId={submittedRequest.id}
            item={submittedRequest.item}
            note={submittedRequest.note}
            category={submittedRequest.category}
          />
          {submittedRequest.category === 'SONG' && (
            <div className="mt-6">
              <SongQueue guestCode={guestCode} myRequestIds={myRequestIds} />
            </div>
          )}
          {submittedRequest.category === 'SUPPLY' && (
            <div className="mt-6">
              <SupplyQueue guestCode={guestCode} myRequestIds={mySupplyRequestIds} partyName={party.name} />
            </div>
          )}
          <button
            onClick={handleNewRequest}
            className="w-full mt-6 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Make another request
          </button>
        </div>
      </main>
    );
  }

  const drinks = party.menuItems.filter((i) => i.category === 'DRINK');
  const supplies = party.menuItems.filter((i) => i.category === 'SUPPLY');

  // Show category-specific form
  if (selectedCategory === 'drink') {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-sm mx-auto">
          <button onClick={handleBack} className="text-sm text-blue-600 hover:text-blue-800 mb-4">
            &larr; Back
          </button>
          <DrinkRequest
            guestCode={guestCode}
            drinks={drinks}
            currentLocation={party.currentLocation}
            onSubmitted={handleRequestSubmitted}
          />
        </div>
      </main>
    );
  }

  if (selectedCategory === 'supply') {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-sm mx-auto">
          <button onClick={handleBack} className="text-sm text-blue-600 hover:text-blue-800 mb-4">
            &larr; Back
          </button>
          <SupplyRequest
            guestCode={guestCode}
            supplies={supplies}
            currentLocation={party.currentLocation}
            onSubmitted={handleRequestSubmitted}
          />
        </div>
      </main>
    );
  }

  if (selectedCategory === 'song') {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-sm mx-auto">
          <button onClick={handleBack} className="text-sm text-blue-600 hover:text-blue-800 mb-4">
            &larr; Back
          </button>
          <SongRequest guestCode={guestCode} onSubmitted={handleRequestSubmitted} />
        </div>
      </main>
    );
  }

  if (selectedCategory === 'other') {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-sm mx-auto">
          <button onClick={handleBack} className="text-sm text-blue-600 hover:text-blue-800 mb-4">
            &larr; Back
          </button>
          <OtherRequest guestCode={guestCode} onSubmitted={handleRequestSubmitted} />
        </div>
      </main>
    );
  }

  // Category selection screen
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-sm mx-auto text-center">
        <h1 className="text-sm text-gray-500 mb-1">{party.name}</h1>
        <h2 className="text-3xl font-bold mb-8">Need something?</h2>

        {party.currentLocation && (
          <p className="text-sm text-gray-500 mb-4">
            📍 {party.currentLocation.name}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedCategory('drink')}
            className="flex flex-col items-center justify-center rounded-xl bg-white border-2 border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all active:scale-95 min-h-[120px]"
          >
            <span className="text-3xl mb-2">🍺</span>
            <span className="font-medium">A Drink</span>
          </button>
          <button
            onClick={() => setSelectedCategory('supply')}
            className="flex flex-col items-center justify-center rounded-xl bg-white border-2 border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all active:scale-95 min-h-[120px]"
          >
            <span className="text-3xl mb-2">🧻</span>
            <span className="font-medium">A Supply</span>
          </button>
          <button
            onClick={() => setSelectedCategory('song')}
            className="flex flex-col items-center justify-center rounded-xl bg-white border-2 border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all active:scale-95 min-h-[120px]"
          >
            <span className="text-3xl mb-2">🎵</span>
            <span className="font-medium">A Song</span>
          </button>
          <button
            onClick={() => setSelectedCategory('other')}
            className="flex flex-col items-center justify-center rounded-xl bg-white border-2 border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all active:scale-95 min-h-[120px]"
          >
            <span className="text-3xl mb-2">💬</span>
            <span className="font-medium">Other</span>
          </button>
        </div>

        <button
          onClick={() => setCurrentView('songQueue')}
          className="mt-6 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          aria-label="View song request queue"
        >
          🎵 View Song Queue
        </button>

        <button
          onClick={() => setCurrentView('supplyQueue')}
          className="mt-2 text-sm text-gray-500 hover:text-blue-600 transition-colors block mx-auto"
          aria-label="View supply request queue"
        >
          🧻 View Supply Queue
        </button>
      </div>
    </main>
  );
}
