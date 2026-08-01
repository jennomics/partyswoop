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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="w-full max-w-md border border-rule bg-paper p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-h3 font-zen font-medium text-ink mb-2">Review detected drinks</h2>
        <p className="text-body text-ink-72 mb-4">Edit names, remove unwanted items, or add more before publishing.</p>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        <div className="space-y-2 mb-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2 border-b border-rule">
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                className="flex-1 border-none bg-transparent px-1 py-2 text-list font-zen text-ink placeholder:text-ink-35 focus:outline-none min-h-[44px]"
                placeholder="Drink name"
              />
              <button
                onClick={() => removeItem(index)}
                className="text-ink-50 min-w-[44px] min-h-[44px] flex items-center justify-center text-body"
                aria-label="Remove drink"
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          className="underline text-meta text-ink min-h-[44px] mb-4 block"
        >
          Add another
        </button>

        <div className="flex gap-3">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 border-[1.5px] border-live text-live font-mono text-meta uppercase h-12 min-h-[44px] disabled:opacity-50"
          >
            {publishing ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" /> Publishing
              </span>
            ) : (
              'Publish to menu'
            )}
          </button>
          <button
            onClick={onClose}
            disabled={publishing}
            className="border border-ink text-ink font-mono text-meta uppercase h-12 px-4 min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
