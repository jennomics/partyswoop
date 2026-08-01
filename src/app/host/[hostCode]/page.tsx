'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import RequestQueue from '@/components/host/RequestQueue';
import RequestViews from '@/components/host/RequestViews';
import AudioAlert from '@/components/host/AudioAlert';
import MenuManager from '@/components/host/MenuManager';
import LocationManager from '@/components/host/LocationManager';
import InventoryManager from '@/components/host/InventoryManager';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import Toast from '@/components/ui/Toast';

interface Party {
  id: string;
  name: string;
  guestCode: string;
  hostCode: string;
  createdAt: string;
  expiresAt: string;
  menuItems: MenuItem[];
  locations: Location[];
}

interface MenuItem {
  id: string;
  name: string;
  available: boolean;
  category: 'DRINK' | 'SUPPLY';
  createdAt: string;
}

interface Location {
  id: string;
  name: string;
  code: string;
}

type Tab = 'requests' | 'views' | 'menu' | 'inventory' | 'locations';

export default function HostDashboard() {
  const params = useParams();
  const hostCode = params.hostCode as string;

  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchParty = useCallback(async () => {
    try {
      const res = await fetch(`/api/parties/${hostCode}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Party not found');
      }
      const data = await res.json();
      setParty(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load party');
    } finally {
      setLoading(false);
    }
  }, [hostCode]);

  useEffect(() => {
    fetchParty();
  }, [fetchParty]);

  const guestUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/party/${party?.guestCode}`
    : '';

  const timeRemaining = party
    ? Math.max(0, Math.round((new Date(party.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))
    : 0;

  async function copyGuestLink() {
    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast('Could not copy link');
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (error || !party) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Party Not Found</h1>
          <ErrorMessage message={error || 'This party does not exist or has expired.'} />
        </div>
      </main>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'requests', label: 'Requests' },
    { id: 'views', label: 'Views' },
    { id: 'menu', label: 'Menu' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'locations', label: 'Locations' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-sm text-gray-500 mb-1">{timeRemaining}h remaining</h1>
          <h2 className="text-3xl font-bold mb-4">{party.name}</h2>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={copyGuestLink}
              className="text-sm bg-white border-2 border-gray-200 hover:border-blue-400 hover:shadow-md rounded-xl px-4 py-2 transition-all active:scale-95"
            >
              {copied ? '✓ Copied!' : '🔗 Copy guest link'}
            </button>
            <AudioAlert hostCode={hostCode} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-white border-2 border-gray-200 p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-xs font-medium text-center rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === 'requests' && (
            <RequestQueue hostCode={hostCode} />
          )}
          {activeTab === 'views' && (
            <RequestViews hostCode={hostCode} />
          )}
          {activeTab === 'menu' && (
            <MenuManager hostCode={hostCode} menuItems={party.menuItems} onUpdate={fetchParty} />
          )}
          {activeTab === 'inventory' && (
            <InventoryManager hostCode={hostCode} />
          )}
          {activeTab === 'locations' && (
            <LocationManager hostCode={hostCode} guestCode={party.guestCode} locations={party.locations} onUpdate={fetchParty} />
          )}
        </div>
      </div>

      {toast && <Toast message={toast} type="info" onDismiss={() => setToast('')} />}
    </main>
  );
}
