'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function HomePage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create party');
      }

      const party = await res.json();
      router.push(`/host/${party.hostCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-s-2">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-zen text-h1 font-medium mb-s-1">PartySwoop</h1>
        <p className="text-ink-72 text-body mb-s-5">
          Party supply and drink request management made simple.
        </p>

        <form onSubmit={handleCreate} className="space-y-s-3">
          <div>
            <label className="block text-left font-mono text-meta uppercase tracking-wide text-ink-50 mb-s-1">
              Party name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              className="w-full border-b border-rule bg-transparent px-0 py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-ink focus:outline-none"
              disabled={loading}
            />
          </div>

          {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 border-[1.5px] border-live text-live text-body font-medium disabled:border-ink-35 disabled:text-ink-35 focus:outline-none focus:ring-1 focus:ring-ink"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-s-1">
                <LoadingSpinner size="sm" /> Creating...
              </span>
            ) : (
              'Create a party'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
