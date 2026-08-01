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
      <div key={item.id} className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-b-0">
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
            className="flex-1 rounded-lg border-2 border-gray-200 px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
            autoFocus
          />
        ) : (
          <span
            className={`flex-1 text-sm cursor-pointer ${!item.available ? 'text-gray-400 line-through' : ''}`}
            onClick={() => startEditing(item)}
            title="Click to edit"
          >
            {item.name}
          </span>
        )}
        <button
          onClick={() => toggleAvailability(item)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            item.available ? 'bg-green-500' : 'bg-gray-300'
          }`}
          role="switch"
          aria-checked={item.available}
          aria-label={`Toggle ${item.name} availability`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
              item.available ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <button
          onClick={() => deleteItem(item.id)}
          className="text-red-400 hover:text-red-600 text-sm px-1 transition-colors"
          aria-label={`Delete ${item.name}`}
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Drinks section */}
      <section>
        <h2 className="text-sm text-gray-500 mb-3 font-medium">Drinks</h2>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newDrinkName}
            onChange={(e) => setNewDrinkName(e.target.value)}
            placeholder="Add a drink..."
            className="flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            onKeyDown={(e) => { if (e.key === 'Enter') addItem(newDrinkName, 'DRINK'); }}
          />
          <button
            onClick={() => addItem(newDrinkName, 'DRINK')}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-all active:scale-95"
          >
            Add
          </button>
        </div>

        <FridgeScan hostCode={hostCode} onSuccess={() => { onUpdate(); setToast('Drinks added to menu!'); }} />

        <div className="mt-3 rounded-xl bg-white border-2 border-gray-200 p-3">
          {drinks.length === 0 ? (
            <p className="text-sm text-gray-400 py-2 text-center">No drinks yet. Add some or scan your fridge!</p>
          ) : (
            drinks.map(renderItem)
          )}
        </div>
      </section>

      {/* Supplies section */}
      <section>
        <h2 className="text-sm text-gray-500 mb-3 font-medium">Supplies</h2>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newSupplyName}
            onChange={(e) => setNewSupplyName(e.target.value)}
            placeholder="Add a supply..."
            className="flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            onKeyDown={(e) => { if (e.key === 'Enter') addItem(newSupplyName, 'SUPPLY'); }}
          />
          <button
            onClick={() => addItem(newSupplyName, 'SUPPLY')}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-all active:scale-95"
          >
            Add
          </button>
        </div>

        <div className="rounded-xl bg-white border-2 border-gray-200 p-3">
          {supplies.length === 0 ? (
            <p className="text-sm text-gray-400 py-2 text-center">No supplies yet.</p>
          ) : (
            supplies.map(renderItem)
          )}
        </div>
      </section>

      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}
    </div>
  );
}
