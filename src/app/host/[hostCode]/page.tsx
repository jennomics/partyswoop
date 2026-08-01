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

const TAB_ICONS: Record<Tab, string> = {
  requests: '📋',
  views: '👁',
  menu: '🍽',
  inventory: '📦',
  locations: '📍',
};

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
      <main className="flex h-dvh items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (error || !party) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center p-4 bg-gray-50">
        <div className="text-center">
          <h1 className="text-lg font-bold mb-2">Party Not Found</h1>
          <ErrorMessage message={error || 'This party does not exist or has expired.'} />
        </div>
      </main>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'requests', label: 'Requests' },
    { id: 'views', label: 'Views' },
    { id: 'menu', label: 'Menu' },
    { id: 'inventory', label: 'Stock' },
    { id: 'locations', label: 'Locs' },
  ];

  return (
    <main className="h-dvh bg-gray-50 flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="shrink-0 px-3 pt-2 pb-1.5 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between gap-2 max-w-sm mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold truncate">{party.name}</h1>
            <span className="text-[10px] text-gray-400 shrink-0">{timeRemaining}h</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={copyGuestLink}
              className="text-[11px] bg-gray-50 border border-gray-200 hover:border-blue-400 rounded-lg px-2 py-1 transition-all active:scale-95"
            >
              {copied ? '✓' : '🔗 Share'}
            </button>
            <AudioAlert hostCode={hostCode} />
          </div>
        </div>
      </div>

      {/* Content area - fills available space with internal scroll */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2">
        <div className="max-w-sm mx-auto">
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

      {/* Bottom Tab Bar - fixed */}
      <nav className="shrink-0 bg-white border-t border-gray-200 safe-area-pb" aria-label="Host navigation">
        <div className="flex max-w-sm mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-1.5 pt-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label={tab.label}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className="text-base leading-none">{TAB_ICONS[tab.id]}</span>
              <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {toast && <Toast message={toast} type="info" onDismiss={() => setToast('')} />}
    </main>
  );
}
