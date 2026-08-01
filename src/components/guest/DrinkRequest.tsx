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
      <div className="py-s-4">
        <p className="text-ink-50 font-zen text-body">No drinks available right now.</p>
      </div>
    );
  }

  // Step 1: Select a drink
  if (!selectedDrink) {
    return (
      <div>
        <h2 className="font-zen font-medium text-h3 text-ink mb-s-3">Pick a drink</h2>
        <div>
          {drinks.map((drink) => (
            <button
              key={drink.id}
              onClick={() => setSelectedDrink(drink.name)}
              className="w-full border-b border-rule px-0 py-s-2 text-left font-zen text-list text-ink min-h-[44px] hover:text-ink-72 transition-colors duration-[180ms] ease-[cubic-bezier(.2,.6,.3,1)]"
            >
              {drink.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Delivery target
  return (
    <div>
      <h2 className="font-zen font-medium text-h3 text-ink mb-s-1">How should we get it to you</h2>
      <p className="font-mono text-meta text-ink-50 uppercase mb-s-3">Selected: {selectedDrink}</p>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      <div className="mb-s-3">
        {currentLocation && (
          <button
            onClick={() => setDeliveryType('LOCATION')}
            className={`w-full border-b px-0 py-s-2 text-left min-h-[44px] transition-colors duration-[180ms] ease-[cubic-bezier(.2,.6,.3,1)] ${
              deliveryType === 'LOCATION'
                ? 'border-l-[1.5px] border-l-ink border-b-rule pl-s-2'
                : 'border-rule'
            }`}
          >
            <span className="font-zen text-list text-ink block">Bring it here</span>
            <span className="font-mono text-meta text-ink-50 block mt-[4px]">{currentLocation.name}</span>
          </button>
        )}

        <button
          onClick={() => setDeliveryType('NAME')}
          className={`w-full border-b px-0 py-s-2 text-left min-h-[44px] transition-colors duration-[180ms] ease-[cubic-bezier(.2,.6,.3,1)] ${
            deliveryType === 'NAME'
              ? 'border-l-[1.5px] border-l-ink border-b-rule pl-s-2'
              : 'border-rule'
          }`}
        >
          <span className="font-zen text-list text-ink block">Find me</span>
          <span className="font-mono text-meta text-ink-50 block mt-[4px]">Tell us your name</span>
        </button>
      </div>

      {deliveryType === 'NAME' && (
        <div className="mb-s-3">
          <label className="font-mono text-meta text-ink-50 uppercase block mb-s-1">Your name</label>
          <input
            type="text"
            value={deliveryName}
            onChange={(e) => setDeliveryName(e.target.value)}
            placeholder="Your name"
            className="w-full border-0 border-b border-rule bg-transparent px-0 py-s-1 font-zen text-body text-ink placeholder:text-ink-35 focus:outline-none focus:border-b-ink"
            autoFocus
          />
        </div>
      )}

      <div className="mb-s-3">
        <label className="font-mono text-meta text-ink-50 uppercase block mb-s-1">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note"
          className="w-full border-0 border-b border-rule bg-transparent px-0 py-s-1 font-zen text-body text-ink placeholder:text-ink-35 focus:outline-none focus:border-b-ink"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-12 border-[1.5px] border-live bg-transparent text-live font-zen font-medium text-body disabled:opacity-50 transition-colors duration-[180ms] ease-[cubic-bezier(.2,.6,.3,1)] focus:outline-none focus:ring-1 focus:ring-ink"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-s-1">
            <LoadingSpinner size="sm" /> Sending...
          </span>
        ) : (
          'Send request'
        )}
      </button>
    </div>
  );
}
