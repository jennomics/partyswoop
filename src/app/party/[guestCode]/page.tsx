'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import DrinkRequest from '@/components/guest/DrinkRequest';
import SupplyRequest from '@/components/guest/SupplyRequest';
import SongRequest from '@/components/guest/SongRequest';
import OtherRequest from '@/components/guest/OtherRequest';
import RequestTracker from '@/components/guest/RequestTracker';
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
      </div>
    </main>
  );
}
