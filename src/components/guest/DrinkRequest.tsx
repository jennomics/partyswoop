'use client';

import { useState } from 'react';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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

interface DrinkRequestProps {
  guestCode: string;
  drinks: MenuItem[];
  currentLocation: LocationInfo | null;
  onSubmitted: (request: { id: string; item: string; note: string | null; category: string }) => void;
}

export default function DrinkRequest({ guestCode, drinks, currentLocation, onSubmitted }: DrinkRequestProps) {
  const [selectedDrink, setSelectedDrink] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<'LOCATION' | 'NAME'>(currentLocation ? 'LOCATION' : 'NAME');
  const [deliveryName, setDeliveryName] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!selectedDrink) return;
    if (deliveryType === 'NAME' && !deliveryName.trim()) {
      setError('Please enter your name so the host can find you');
      return;
    }

    setSubmitting(true);
    setError('');

    const deliveryValue = deliveryType === 'LOCATION'
      ? currentLocation?.name || ''
      : deliveryName.trim();

    try {
      const res = await fetch(`/api/party/${guestCode}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'DRINK',
          item: selectedDrink,
          note: note.trim() || null,
          deliveryType,
          deliveryValue,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      const data = await res.json();
      onSubmitted({ id: data.id, item: selectedDrink, note: note.trim() || null, category: 'DRINK' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  if (drinks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No drinks available right now.</p>
      </div>
    );
  }

  // Step 1: Select a drink
  if (!selectedDrink) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Pick a drink</h2>
        <div className="space-y-2">
          {drinks.map((drink) => (
            <button
              key={drink.id}
              onClick={() => setSelectedDrink(drink.name)}
              className="w-full rounded-lg bg-white border-2 border-gray-200 px-4 py-4 text-left font-medium hover:border-blue-400 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              🍺 {drink.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Delivery target
  return (
    <div>
      <h2 className="text-xl font-bold mb-2">How should we get it to you?</h2>
      <p className="text-sm text-gray-500 mb-4">Selected: {selectedDrink}</p>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      <div className="space-y-3 mb-4">
        {currentLocation && (
          <button
            onClick={() => setDeliveryType('LOCATION')}
            className={`w-full rounded-lg border-2 px-4 py-4 text-left transition-all ${
              deliveryType === 'LOCATION'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <span className="font-medium">📍 Bring it here</span>
            <span className="block text-sm text-gray-500 mt-0.5">{currentLocation.name}</span>
          </button>
        )}

        <button
          onClick={() => setDeliveryType('NAME')}
          className={`w-full rounded-lg border-2 px-4 py-4 text-left transition-all ${
            deliveryType === 'NAME'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-blue-300'
          }`}
        >
          <span className="font-medium">👋 Find me</span>
          <span className="block text-sm text-gray-500 mt-0.5">Tell us your name</span>
        </button>
      </div>

      {deliveryType === 'NAME' && (
        <input
          type="text"
          value={deliveryName}
          onChange={(e) => setDeliveryName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 mb-4 focus:outline-none focus:border-blue-500"
          autoFocus
        />
      )}

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
        className="w-full rounded-lg border border-gray-300 px-4 py-3 mb-4 text-sm focus:outline-none focus:border-blue-500"
      />

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" /> Sending...
          </span>
        ) : (
          'Send Request'
        )}
      </button>
    </div>
  );
}
