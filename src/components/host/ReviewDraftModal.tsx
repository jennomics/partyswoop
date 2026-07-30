'use client';

import { useState } from 'react';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ReviewDraftModalProps {
  drinks: string[];
  hostCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewDraftModal({ drinks, hostCode, onClose, onSuccess }: ReviewDraftModalProps) {
  const [items, setItems] = useState<string[]>(drinks);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  function updateItem(index: number, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((prev) => [...prev, '']);
  }

  async function handlePublish() {
    const validItems = items.filter((item) => item.trim() !== '');
    if (validItems.length === 0) {
      setError('Add at least one drink to publish');
      return;
    }

    setPublishing(true);
    setError('');

    let successCount = 0;
    const errors: string[] = [];

    for (const name of validItems) {
      try {
        const res = await fetch(`/api/parties/${hostCode}/menu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), category: 'DRINK' }),
        });

        if (!res.ok) {
          const data = await res.json();
          errors.push(data.error || `Failed to add "${name}"`);
        } else {
          successCount++;
        }
      } catch {
        errors.push(`Failed to add "${name}"`);
      }
    }

    setPublishing(false);

    if (errors.length > 0 && successCount === 0) {
      setError(errors[0]);
    } else {
      onSuccess();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Review Detected Drinks</h2>
        <p className="text-sm text-gray-500 mb-4">Edit names, remove unwanted items, or add more before publishing.</p>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        <div className="space-y-2 mb-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Drink name"
              />
              <button
                onClick={() => removeItem(index)}
                className="text-red-400 hover:text-red-600 text-lg px-2"
                aria-label="Remove drink"
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          className="text-sm text-blue-600 hover:text-blue-800 mb-4 block"
        >
          + Add another
        </button>

        <div className="flex gap-3">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {publishing ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" /> Publishing...
              </span>
            ) : (
              'Publish to Menu'
            )}
          </button>
          <button
            onClick={onClose}
            disabled={publishing}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
