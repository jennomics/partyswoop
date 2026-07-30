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
      <div className="text-center py-8">
        <p className="text-gray-500">No supplies available right now.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">What do you need?</h2>
      <p className="text-sm text-gray-500 mb-4">Tap to request</p>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      <div className="space-y-2">
        {supplies.map((supply) => (
          <button
            key={supply.id}
            onClick={() => handleTap(supply)}
            disabled={submitting === supply.id}
            className="w-full rounded-lg bg-white border-2 border-gray-200 px-4 py-4 text-left font-medium hover:border-blue-400 hover:shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            🧻 {supply.name}
          </button>
        ))}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}
    </div>
  );
}
