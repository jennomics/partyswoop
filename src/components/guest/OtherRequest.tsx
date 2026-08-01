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
      <h2 className="font-zen font-medium text-h3 text-ink mb-s-3">What do you need</h2>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      <form onSubmit={handleSubmit} className="space-y-s-3">
        <div>
          <label className="font-mono text-meta text-ink-50 uppercase block mb-s-1">Describe your request</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe your request"
            className="w-full border-0 border-b border-rule bg-transparent px-0 py-s-1 font-zen text-body text-ink placeholder:text-ink-35 focus:outline-none focus:border-b-ink"
            autoFocus
          />
        </div>
        <button
          type="submit"
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
      </form>
    </div>
  );
}
