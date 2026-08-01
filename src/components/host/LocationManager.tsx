'use client';

import { useState, useEffect } from 'react';
import ErrorMessage from '@/components/ui/ErrorMessage';
import Toast from '@/components/ui/Toast';
import QRPrintView from './QRPrintView';

interface Location {
  id: string;
  name: string;
  code: string;
}

interface LocationManagerProps {
  hostCode: string;
  guestCode: string;
  locations: Location[];
  onUpdate: () => void;
}

export default function LocationManager({ hostCode, guestCode, locations, onUpdate }: LocationManagerProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [printLocation, setPrintLocation] = useState<Location | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    // Generate QR codes for all locations
    async function generateQRCodes() {
      try {
        const QRCode = (await import('qrcode')).default;
        const codes: Record<string, string> = {};
        for (const loc of locations) {
          const url = `${baseUrl}/party/${guestCode}?loc=${loc.code}`;
          codes[loc.id] = await QRCode.toDataURL(url, { width: 200, margin: 2 });
        }
        setQrImages(codes);
      } catch {
        // QR generation failed silently
      }
    }
    if (locations.length > 0 && baseUrl) {
      generateQRCodes();
    }
  }, [locations, guestCode, baseUrl]);

  async function addLocation() {
    if (!newName.trim()) return;
    setError('');

    try {
      const res = await fetch(`/api/parties/${hostCode}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create location');
      }

      setNewName('');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location');
    }
  }

  async function copyLink(location: Location) {
    const url = `${baseUrl}/party/${guestCode}?loc=${location.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast(`Link copied for ${location.name}`);
    } catch {
      setToast('Could not copy link');
    }
  }

  return (
    <div className="space-y-4">
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Location name (e.g. Kitchen, Pool)"
          className="flex-1 border-b border-rule bg-transparent px-1 py-2 text-list font-zen text-ink placeholder:text-ink-35 focus:outline-none focus:border-ink min-h-[44px]"
          onKeyDown={(e) => { if (e.key === 'Enter') addLocation(); }}
        />
        <button
          onClick={addLocation}
          className="border-[1.5px] border-live text-live font-mono text-meta uppercase h-12 px-4 min-h-[44px]"
        >
          Add
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-8 text-ink-50">
          <p className="text-body">No locations yet</p>
          <p className="text-meta mt-1">Add locations to generate QR codes for each area of your party</p>
        </div>
      ) : (
        <div className="border-t border-rule">
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-start gap-3 py-3 border-b border-rule min-h-[44px]">
              {qrImages[loc.id] && (
                <img src={qrImages[loc.id]} alt={`QR for ${loc.name}`} className="h-16 w-16" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-list font-zen text-ink">{loc.name}</h3>
                <p className="font-mono text-meta text-ink-50 truncate">
                  {baseUrl}/party/{guestCode}?loc={loc.code}
                </p>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => copyLink(loc)}
                    className="underline text-meta text-ink min-h-[44px] flex items-center"
                  >
                    copy link
                  </button>
                  <button
                    onClick={() => setPrintLocation(loc)}
                    className="underline text-meta text-ink min-h-[44px] flex items-center"
                  >
                    print qr
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {printLocation && qrImages[printLocation.id] && (
        <QRPrintView
          locationName={printLocation.name}
          qrDataUrl={qrImages[printLocation.id]}
          onClose={() => setPrintLocation(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}
    </div>
  );
}
