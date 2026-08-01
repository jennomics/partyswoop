'use client';

import { useState } from 'react';
import FridgeScan from './FridgeScan';
import ErrorMessage from '@/components/ui/ErrorMessage';
import Toast from '@/components/ui/Toast';

interface MenuItem {
  id: string;
  name: string;
  available: boolean;
  category: 'DRINK' | 'SUPPLY';
  createdAt: string;
}

interface MenuManagerProps {
  hostCode: string;
  menuItems: MenuItem[];
  onUpdate: () => void;
}

export default function MenuManager({ hostCode, menuItems, onUpdate }: MenuManagerProps) {
  const [newDrinkName, setNewDrinkName] = useState('');
  const [newSupplyName, setNewSupplyName] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const drinks = menuItems.filter((i) => i.category === 'DRINK');
  const supplies = menuItems.filter((i) => i.category === 'SUPPLY');

  async function addItem(name: string, category: 'DRINK' | 'SUPPLY') {
    if (!name.trim()) return;
    setError('');

    try {
      const res = await fetch(`/api/parties/${hostCode}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), category }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add item');
      }

      if (category === 'DRINK') setNewDrinkName('');
      else setNewSupplyName('');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    }
  }

  async function toggleAvailability(item: MenuItem) {
    try {
      const res = await fetch(`/api/parties/${hostCode}/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !item.available }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update item');
      }
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle availability');
      onUpdate(); // Revert
    }
  }

  async function deleteItem(itemId: string) {
    try {
      const res = await fetch(`/api/parties/${hostCode}/menu/${itemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete item');
      }
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  }

  async function renameItem(itemId: string) {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/parties/${hostCode}/menu/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to rename item');
      }
      setEditingId(null);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename item');
    }
  }

  function startEditing(item: MenuItem) {
    setEditingId(item.id);
    setEditingName(item.name);
  }

  function renderItem(item: MenuItem) {
    return (
      <div key={item.id} className="flex items-center gap-2 py-3 border-b border-rule last:border-b-0 min-h-[44px]">
        {editingId === item.id ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={() => renameItem(item.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') renameItem(item.id);
              if (e.key === 'Escape') setEditingId(null);
            }}
            className="flex-1 border-b border-ink bg-transparent px-1 py-1 text-list font-zen text-ink focus:outline-none focus:border-live"
            autoFocus
          />
        ) : (
          <span
            className={`flex-1 text-list font-zen cursor-pointer ${!item.available ? 'text-ink-35 line-through' : 'text-ink'}`}
            onClick={() => startEditing(item)}
            title="Click to edit"
          >
            {item.name}
          </span>
        )}
        <button
          onClick={() => toggleAvailability(item)}
          className="relative shrink-0 flex items-center justify-center w-[44px] h-[44px]"
          role="switch"
          aria-checked={item.available}
          aria-label={`Toggle ${item.name} availability`}
        >
          <span
            className={`inline-block w-[6px] h-[6px] rounded-full ${
              item.available ? 'bg-live' : 'bg-rule'
            }`}
          />
        </button>
        <button
          onClick={() => deleteItem(item.id)}
          className="text-ink-50 underline text-meta min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={`Delete ${item.name}`}
        >
          remove
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Drinks section */}
      <section>
        <h2 className="font-mono text-meta text-ink-50 uppercase mb-s-3">Drinks</h2>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newDrinkName}
            onChange={(e) => setNewDrinkName(e.target.value)}
            placeholder="Add a drink"
            className="flex-1 border-b border-rule bg-transparent px-1 py-2 text-list font-zen text-ink placeholder:text-ink-35 focus:outline-none focus:border-ink min-h-[44px]"
            onKeyDown={(e) => { if (e.key === 'Enter') addItem(newDrinkName, 'DRINK'); }}
          />
          <button
            onClick={() => addItem(newDrinkName, 'DRINK')}
            className="border-[1.5px] border-live text-live font-mono text-meta uppercase h-12 px-4 min-h-[44px]"
          >
            Add
          </button>
        </div>

        <FridgeScan hostCode={hostCode} onSuccess={() => { onUpdate(); setToast('Drinks added to menu'); }} />

        <div className="mt-3 border-t border-rule">
          {drinks.length === 0 ? (
            <p className="text-body text-ink-35 py-4">No drinks yet</p>
          ) : (
            drinks.map(renderItem)
          )}
        </div>
      </section>

      {/* Supplies section */}
      <section>
        <h2 className="font-mono text-meta text-ink-50 uppercase mb-s-3">Supplies</h2>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newSupplyName}
            onChange={(e) => setNewSupplyName(e.target.value)}
            placeholder="Add a supply"
            className="flex-1 border-b border-rule bg-transparent px-1 py-2 text-list font-zen text-ink placeholder:text-ink-35 focus:outline-none focus:border-ink min-h-[44px]"
            onKeyDown={(e) => { if (e.key === 'Enter') addItem(newSupplyName, 'SUPPLY'); }}
          />
          <button
            onClick={() => addItem(newSupplyName, 'SUPPLY')}
            className="border-[1.5px] border-live text-live font-mono text-meta uppercase h-12 px-4 min-h-[44px]"
          >
            Add
          </button>
        </div>

        <div className="border-t border-rule">
          {supplies.length === 0 ? (
            <p className="text-body text-ink-35 py-4">No supplies yet</p>
          ) : (
            supplies.map(renderItem)
          )}
        </div>
      </section>

      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}
    </div>
  );
}
