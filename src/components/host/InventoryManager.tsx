'use client';

import { useState } from 'react';
import { usePolling } from '@/hooks/usePolling';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface InventoryItem {
  id: string;
  name: string;
  available: boolean;
  category: 'DRINK' | 'SUPPLY';
  quantity: number | null;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

interface InventoryManagerProps {
  hostCode: string;
}

export default function InventoryManager({ hostCode }: InventoryManagerProps) {
  const { data: inventoryData, loading, error: pollError, refetch: fetchInventory } = usePolling<{ items: InventoryItem[] }>({
    url: `/api/parties/${hostCode}/inventory`,
    intervalMs: 3000,
  });
  const items = inventoryData?.items || [];
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editThreshold, setEditThreshold] = useState('');

  async function saveQuantity(itemId: string) {
    setError('');
    const quantity = editQuantity.trim() === '' ? null : parseInt(editQuantity, 10);
    const lowStockThreshold = editThreshold.trim() === ''
      ? 3
      : parseInt(editThreshold, 10);

    if (quantity !== null && (isNaN(quantity) || quantity < 0)) {
      setError('Quantity must be a non-negative number or blank for unlimited.');
      return;
    }

    if (isNaN(lowStockThreshold) || lowStockThreshold < 0) {
      setError('Threshold must be a non-negative number.');
      return;
    }

    try {
      const res = await fetch(`/api/parties/${hostCode}/menu/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, lowStockThreshold }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update inventory');
      }

      setEditingId(null);
      fetchInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update inventory');
    }
  }

  function startEditing(item: InventoryItem) {
    setEditingId(item.id);
    setEditQuantity(item.quantity !== null ? String(item.quantity) : '');
    setEditThreshold(String(item.lowStockThreshold));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditQuantity('');
    setEditThreshold('');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const drinks = items.filter((i) => i.category === 'DRINK');
  const supplies = items.filter((i) => i.category === 'SUPPLY');

  function renderItem(item: InventoryItem) {
    const isEditing = editingId === item.id;

    return (
      <div
        key={item.id}
        className="flex flex-col gap-2 py-3 px-0 border-b border-rule last:border-b-0 min-h-[44px]"
        role="listitem"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {item.isLowStock && !item.isOutOfStock && (
              <span className="inline-block w-[6px] h-[6px] rounded-full bg-live shrink-0" aria-hidden="true" />
            )}
            <span
              className={`text-list font-zen truncate ${
                item.isOutOfStock ? 'text-ink-35 line-through' : 'text-ink'
              }`}
            >
              {item.name}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-body text-ink tabular-nums">
              {item.quantity !== null ? item.quantity : '\u221E'}
            </span>
            {!isEditing && (
              <button
                onClick={() => startEditing(item)}
                className="underline text-meta text-ink-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={`Edit quantity for ${item.name}`}
              >
                edit
              </button>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center gap-2">
              <label htmlFor={`qty-${item.id}`} className="font-mono text-meta text-ink-50 uppercase w-16">
                Qty
              </label>
              <input
                id={`qty-${item.id}`}
                type="number"
                min="0"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                placeholder="Unlimited"
                className="w-24 border-b border-rule bg-transparent px-1 py-1 text-list font-mono text-ink focus:outline-none focus:border-ink min-h-[44px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveQuantity(item.id);
                  if (e.key === 'Escape') cancelEditing();
                }}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor={`threshold-${item.id}`} className="font-mono text-meta text-ink-50 uppercase w-16">
                Alert at
              </label>
              <input
                id={`threshold-${item.id}`}
                type="number"
                min="0"
                value={editThreshold}
                onChange={(e) => setEditThreshold(e.target.value)}
                className="w-24 border-b border-rule bg-transparent px-1 py-1 text-list font-mono text-ink focus:outline-none focus:border-ink min-h-[44px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveQuantity(item.id);
                  if (e.key === 'Escape') cancelEditing();
                }}
              />
            </div>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => saveQuantity(item.id)}
                className="border-[1.5px] border-live text-live font-mono text-meta uppercase h-12 px-4 min-h-[44px]"
              >
                Save
              </button>
              <button
                onClick={cancelEditing}
                className="underline text-meta text-ink min-h-[44px] flex items-center"
              >
                cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSection(title: string, sectionItems: InventoryItem[]) {
    if (sectionItems.length === 0) return null;

    const lowStockCount = sectionItems.filter((i) => i.isLowStock && !i.isOutOfStock).length;
    const outOfStockCount = sectionItems.filter((i) => i.isOutOfStock).length;

    return (
      <section aria-labelledby={`inventory-${title.toLowerCase()}`}>
        <div className="flex items-center justify-between mb-2 border-b border-rule pb-2">
          <h2
            id={`inventory-${title.toLowerCase()}`}
            className="font-mono text-meta text-ink-50 uppercase"
          >
            {title}
          </h2>
          <div className="flex gap-3 font-mono text-meta">
            {lowStockCount > 0 && (
              <span className="text-live">
                {lowStockCount} low
              </span>
            )}
            {outOfStockCount > 0 && (
              <span className="text-ink-35">
                {outOfStockCount} out
              </span>
            )}
          </div>
        </div>
        <div
          role="list"
          aria-label={`${title} inventory items`}
        >
          {sectionItems.map(renderItem)}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6" role="region" aria-label="Inventory management">
      {(error || pollError) && <ErrorMessage message={error || pollError} onDismiss={() => setError('')} />}

      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-body text-ink-50">
            No items in your menu yet. Add items from the Menu tab, then set quantities here.
          </p>
        </div>
      ) : (
        <>
          {renderSection('Drinks', drinks)}
          {renderSection('Supplies', supplies)}
        </>
      )}
    </div>
  );
}
