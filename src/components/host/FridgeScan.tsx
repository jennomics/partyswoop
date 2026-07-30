'use client';

import { useState, useRef } from 'react';
import ReviewDraftModal from './ReviewDraftModal';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface FridgeScanProps {
  hostCode: string;
  onSuccess: () => void;
}

export default function FridgeScan({ hostCode, onSuccess }: FridgeScanProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [detectedDrinks, setDetectedDrinks] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;

    const imageFiles = Array.from(selected).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length > 5) {
      setError('Please select up to 5 photos');
      return;
    }
    setFiles(imageFiles);
    setError('');
  }

  async function handleScan() {
    if (files.length === 0) return;
    setScanning(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const res = await fetch(`/api/parties/${hostCode}/scan`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Scan failed');
      }

      if (data.fallback) {
        throw new Error(data.error || 'Could not detect drinks from the photos');
      }

      setDetectedDrinks(data.drinks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed. Try adding drinks manually.');
    } finally {
      setScanning(false);
    }
  }

  function handleModalClose() {
    setDetectedDrinks(null);
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handlePublishSuccess() {
    handleModalClose();
    onSuccess();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="text-sm file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
        <button
          onClick={handleScan}
          disabled={files.length === 0 || scanning}
          className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {scanning ? (
            <span className="flex items-center gap-1">
              <LoadingSpinner size="sm" /> Scanning...
            </span>
          ) : (
            '📷 Scan Photos'
          )}
        </button>
      </div>

      {files.length > 0 && !scanning && (
        <p className="text-xs text-gray-500">{files.length} photo{files.length > 1 ? 's' : ''} selected</p>
      )}

      {error && (
        <div className="space-y-2">
          <ErrorMessage message={error} onDismiss={() => setError('')} />
          <button
            onClick={() => { setError(''); setFiles([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Add drinks manually instead
          </button>
        </div>
      )}

      {detectedDrinks && (
        <ReviewDraftModal
          drinks={detectedDrinks}
          hostCode={hostCode}
          onClose={handleModalClose}
          onSuccess={handlePublishSuccess}
        />
      )}
    </div>
  );
}
