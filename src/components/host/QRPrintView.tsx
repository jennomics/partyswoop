'use client';

import { useEffect } from 'react';

interface QRPrintViewProps {
  locationName: string;
  qrDataUrl: string;
  onClose: () => void;
}

export default function QRPrintView({ locationName, qrDataUrl, onClose }: QRPrintViewProps) {
  useEffect(() => {
    // Trigger print after a short delay to let the UI render
    const timer = setTimeout(() => {
      window.print();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Print-only content */}
      <div className="fixed inset-0 z-[100] bg-paper print-view">
        <div className="flex min-h-screen flex-col items-center justify-center p-8">
          <h1 className="text-h1 font-zen font-medium text-ink mb-6">{locationName}</h1>
          <img src={qrDataUrl} alt={`QR code for ${locationName}`} className="w-64 h-64 mb-6" />
          <p className="text-h2 font-zen text-ink">Need something? Scan me.</p>
        </div>
        <button
          onClick={onClose}
          className="fixed top-4 right-4 border border-ink text-ink font-mono text-meta uppercase h-12 px-4 min-h-[44px] bg-paper print:hidden"
        >
          Close
        </button>
      </div>
    </>
  );
}
