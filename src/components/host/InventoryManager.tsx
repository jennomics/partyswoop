'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSSE } from '@/hooks/useSSE';
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
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editThreshold, setEditThreshold] = useState('');

  const sseEvent = useSSE(`/api/parties/${hostCode}/events`, [
    'inventory-update',
    'menu-update',
  ]);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch(`/api/parties/${hostCode}/inventory`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch inventory');
      }
      const data = await res.json();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [hostCode]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // React to SSE events for live updates
  useEffect(() => {
    if (sseEvent) {
      fetchInventory();
    }
  }, [sseEvent, fetchInventory]);

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

  function renderStatusBadge(item: InventoryItem) {
    if (item.isOutOfStock) {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
          role="status"
          aria-label={`${item.name} is out of stock`}
        >
          Out
        </span>
      );
    }
    if (item.isLowStock) {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
          role="status"
          aria-label={`${item.name} is low on stock`}
        >
          Low
        </span>
      );
    }
    return null;
  }

  function renderItem(item: InventoryItem) {
    const isEditing = editingId === item.id;

    return (
      <div
        key={item.id}
        className={`flex flex-col gap-2 py-3 px-3 border-b border-gray-100 last:border-b-0 ${
          item.isOutOfStock ? 'bg-red-50/50' : item.isLowStock ? 'bg-yellow-50/50' : ''
        }`}
        role="listitem"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className={`text-sm font-medium truncate ${
                item.isOutOfStock ? 'text-red-600 line-through' : ''
              }`}
            >
              {item.name}
            </span>
            {renderStatusBadge(item)}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-gray-600 tabular-nums">
              {item.quantity !== null ? item.quantity : '\u221E'}
            </span>
            {!isEditing && (
              <button
                onClick={() => startEditing(item)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                aria-label={`Edit quantity for ${item.name}`}
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex flex-col gap-2 pl-0 mt-1">
            <div className="flex items-center gap-2">
              <label htmlFor={`qty-${item.id}`} className="text-xs text-gray-500 w-16">
                Qty:
              </label>
              <input
                id={`qty-${item.id}`}
                type="number"
                min="0"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                placeholder="Unlimited"
                className="w-24 rounded-lg border-2 border-gray-200 px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveQuantity(item.id);
                  if (e.key === 'Escape') cancelEditing();
                }}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor={`threshold-${item.id}`} className="text-xs text-gray-500 w-16">
                Alert at:
              </label>
              <input
                id={`threshold-${item.id}`}
                type="number"
                min="0"
                value={editThreshold}
                onChange={(e) => setEditThreshold(e.target.value)}
                className="w-24 rounded-lg border-2 border-gray-200 px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveQuantity(item.id);
                  if (e.key === 'Escape') cancelEditing();
                }}
              />
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => saveQuantity(item.id)}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-all active:scale-95"
              >
                Save
              </button>
              <button
                onClick={cancelEditing}
                className="text-xs text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSection(title: string, sectionItems: InventoryItem[]) {
    if (sectionItems.length === 0) return null;

    const lowStockCount = sectionItems.filter((i) => i.isLowStock).length;
    const outOfStockCount = sectionItems.filter((i) => i.isOutOfStock).length;

    return (
      <section aria-labelledby={`inventory-${title.toLowerCase()}`}>
        <div className="flex items-center justify-between mb-2">
          <h2
            id={`inventory-${title.toLowerCase()}`}
            className="text-sm text-gray-500 font-medium"
          >
            {title}
          </h2>
          <div className="flex gap-2">
            {lowStockCount > 0 && (
              <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                {lowStockCount} low
              </span>
            )}
            {outOfStockCount > 0 && (
              <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                {outOfStockCount} out
              </span>
            )}
          </div>
        </div>
        <div
          className="rounded-xl bg-white border-2 border-gray-200"
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
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
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
