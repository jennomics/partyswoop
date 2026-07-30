'use client';

import { useState } from 'react';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface OtherRequestProps {
  guestCode: string;
  onSubmitted: (request: { id: string; item: string; note: string | null; category: string }) => void;
}

export default function OtherRequest({ guestCode, onSubmitted }: OtherRequestProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please describe what you need');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/party/${guestCode}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'OTHER',
          item: text.trim(),
          deliveryType: 'NAME',
          deliveryValue: text.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      const data = await res.json();
      onSubmitted({ id: data.id, item: text.trim(), note: null, category: 'OTHER' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">What do you need?</h2>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your request"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:border-blue-500"
          autoFocus
        />
        <button
          type="submit"
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
      </form>
    </div>
  );
}
