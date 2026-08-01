'use client';

import { useState } from 'react';
import ErrorMessage from '@/components/ui/ErrorMessage';
import Toast from '@/components/ui/Toast';

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

interface SupplyRequestProps {
  guestCode: string;
  supplies: MenuItem[];
  currentLocation: LocationInfo | null;
  onSubmitted: (request: { id: string; item: string; note: string | null; category: string }) => void;
}

export default function SupplyRequest({ guestCode, supplies, currentLocation, onSubmitted }: SupplyRequestProps) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  async function handleTap(supply: MenuItem) {
    if (submitting) return;
    setSubmitting(supply.id);
    setError('');

    try {
      const res = await fetch(`/api/party/${guestCode}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'SUPPLY',
          item: supply.name,
          deliveryType: currentLocation ? 'LOCATION' : 'NAME',
          deliveryValue: currentLocation ? currentLocation.name : supply.name,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      const data = await res.json();
      onSubmitted({ id: data.id, item: supply.name, note: null, category: 'SUPPLY' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(null);
    }
  }

  if (supplies.length === 0) {
    return (
      <div className="py-s-4">
        <p className="text-ink-50 font-zen text-body">No supplies available right now.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-zen font-medium text-h3 text-ink mb-s-1">What do you need</h2>
      <p className="font-mono text-meta text-ink-50 uppercase mb-s-3">Tap to request</p>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      <div>
        {supplies.map((supply) => (
          <button
            key={supply.id}
            onClick={() => handleTap(supply)}
            disabled={submitting === supply.id}
            className="w-full border-b border-rule px-0 py-s-2 text-left font-zen text-list text-ink min-h-[44px] hover:text-ink-72 transition-colors duration-[180ms] ease-[cubic-bezier(.2,.6,.3,1)] disabled:opacity-50"
          >
            {supply.name}
          </button>
        ))}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}
    </div>
  );
}
