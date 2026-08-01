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
      <main className="flex h-dvh items-center justify-center bg-paper">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (error || !party) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center p-s-2 bg-paper">
        <div className="text-center">
          <h1 className="font-zen text-h3 font-medium mb-s-1">Party not found</h1>
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
    { id: 'locations', label: 'Locations' },
  ];

  return (
    <main className="h-dvh bg-paper flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-s-2 pt-s-2 pb-s-1 bg-paper border-b border-rule">
        <div className="flex items-center justify-between gap-s-1 max-w-sm mx-auto">
          <div className="flex items-center gap-s-1 min-w-0">
            <h1 className="font-zen text-body font-medium truncate text-ink">{party.name}</h1>
            <span className="font-mono text-meta text-ink-50 shrink-0">{timeRemaining}h</span>
          </div>
          <div className="flex items-center gap-s-1 shrink-0">
            <button
              onClick={copyGuestLink}
              className="h-12 px-s-2 border border-ink text-ink text-meta font-mono uppercase tracking-wide hover:bg-live-wash focus:outline-none focus:ring-1 focus:ring-ink"
            >
              {copied ? 'Copied' : 'Share link'}
            </button>
            <AudioAlert hostCode={hostCode} />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto min-h-0 px-s-2 py-s-2">
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

      {/* Bottom Tab Bar */}
      <nav className="shrink-0 bg-paper border-t border-rule safe-area-pb" aria-label="Host navigation">
        <div className="flex max-w-sm mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center h-11 text-meta font-mono uppercase tracking-wide border-b-[1.5px] focus:outline-none focus:ring-1 focus:ring-ink ${
                activeTab === tab.id
                  ? 'text-ink border-ink'
                  : 'text-ink-50 border-transparent'
              }`}
              aria-label={tab.label}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {toast && <Toast message={toast} type="info" onDismiss={() => setToast('')} />}
    </main>
  );
}
