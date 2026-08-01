'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSSE } from '@/hooks/useSSE';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

interface SongQueueItem {
  id: string;
  item: string;
  deliveryValue: string;
  status: string;
  createdAt: string;
}

interface SongQueueProps {
  guestCode: string;
  myRequestIds: string[];
}

export default function SongQueue({ guestCode, myRequestIds }: SongQueueProps) {
  const [songs, setSongs] = useState<SongQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sseEvent = useSSE(`/api/party/${guestCode}/events`, ['request-update', 'new-request']);

  const fetchSongs = useCallback(async () => {
    try {
      const res = await fetch(`/api/party/${guestCode}/requests/songs`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load song queue');
      }
      const data = await res.json();
      setSongs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load song queue');
    } finally {
      setLoading(false);
    }
  }, [guestCode]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  useEffect(() => {
    if (!sseEvent) return;
    const data = sseEvent.data as Record<string, unknown> | null | undefined;
    if (!data || typeof data !== 'object') return;

    if (sseEvent.type === 'request-update') {
      const updatedId = data.id as string | undefined;
      const updatedStatus = data.status as string | undefined;
      if (!updatedId || !updatedStatus) return;
      setSongs((prev) =>
        prev.map((song) =>
          song.id === updatedId ? { ...song, status: updatedStatus } : song
        )
      );
    }

    if (sseEvent.type === 'new-request') {
      const category = data.category as string | undefined;
      if (category !== 'SONG') return;
      const id = data.id as string | undefined;
      const item = data.item as string | undefined;
      const deliveryValue = data.deliveryValue as string | undefined;
      const status = data.status as string | undefined;
      const createdAt = data.createdAt as string | undefined;
      if (!id || !item || !deliveryValue || !status || !createdAt) return;
      const newSong: SongQueueItem = { id, item, deliveryValue, status, createdAt };
      setSongs((prev) => [...prev, newSong]);
    }
  }, [sseEvent]);

  if (loading) {
    return (
      <div className="flex justify-center py-s-4" role="status" aria-label="Loading song queue">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  const pendingSongs = songs.filter((s) => s.status === 'NEW' || s.status === 'SEEN');
  const doneSongs = songs.filter((s) => s.status === 'DONE');

  const nowPlaying = pendingSongs.length > 0 ? pendingSongs[0] : null;
  const inQueue = pendingSongs.slice(1);
  const alreadyPlayed = [...doneSongs].reverse();

  const isMine = (id: string) => myRequestIds.includes(id);

  return (
    <div role="region" aria-label="Song request queue">
      {/* Now Playing / Up Next */}
      <section aria-labelledby="now-playing-heading" className="mb-s-4">
        <h3
          id="now-playing-heading"
          className="font-mono text-meta text-ink-50 uppercase mb-s-2"
        >
          Now playing
        </h3>
        {nowPlaying ? (
          <div
            className="bg-live px-s-2 py-s-2 min-h-[44px] flex items-center"
            aria-current={isMine(nowPlaying.id) ? 'true' : undefined}
          >
            <div className="flex-1 min-w-0">
              <p className="font-zen font-medium text-list text-white truncate">{nowPlaying.item}</p>
              <p className="font-mono text-meta text-white/70 truncate">
                {nowPlaying.deliveryValue}
              </p>
            </div>
            {isMine(nowPlaying.id) && (
              <span className="shrink-0 font-mono text-meta text-white/70 ml-s-2">
                You
              </span>
            )}
          </div>
        ) : (
          <p className="text-ink-35 font-zen text-body">No songs in queue yet</p>
        )}
      </section>

      {/* In Queue */}
      <section aria-labelledby="in-queue-heading" className="mb-s-4">
        <h3
          id="in-queue-heading"
          className="font-mono text-meta text-ink-50 uppercase mb-s-2"
        >
          In queue {inQueue.length > 0 && `(${inQueue.length})`}
        </h3>
        {inQueue.length > 0 ? (
          <ol role="list" aria-label="Songs waiting in queue">
            {inQueue.map((song, index) => (
              <li
                key={song.id}
                className="flex items-center border-b border-rule py-s-2 min-h-[44px]"
                aria-label={`Position ${index + 2}: ${song.item} by ${song.deliveryValue}${isMine(song.id) ? ' (your request)' : ''}`}
              >
                <span className="shrink-0 w-8 font-mono text-meta text-ink">
                  {index + 2}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-zen text-list text-ink truncate">{song.item}</p>
                  <p className="font-mono text-meta text-ink-50 truncate">{song.deliveryValue}</p>
                </div>
                {isMine(song.id) && (
                  <span className="shrink-0 font-mono text-meta text-ink-50 ml-s-2">
                    You
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-ink-35 font-zen text-body">No more songs waiting</p>
        )}
      </section>

      {/* Already Played */}
      {alreadyPlayed.length > 0 && (
        <section aria-labelledby="already-played-heading" className="mb-s-4">
          <h3
            id="already-played-heading"
            className="font-mono text-meta text-ink-50 uppercase mb-s-2"
          >
            Already played ({alreadyPlayed.length})
          </h3>
          <ul role="list" aria-label="Songs already played">
            {alreadyPlayed.map((song) => (
              <li
                key={song.id}
                className="flex items-center border-b border-rule py-s-2 min-h-[44px]"
                aria-label={`${song.item} by ${song.deliveryValue} - played${isMine(song.id) ? ' (your request)' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-zen text-list text-ink-35 line-through truncate">{song.item}</p>
                  <p className="font-mono text-meta text-ink-35 truncate">{song.deliveryValue}</p>
                </div>
                {isMine(song.id) && (
                  <span className="shrink-0 font-mono text-meta text-ink-50 ml-s-2">
                    You
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Empty state */}
      {songs.length === 0 && (
        <div className="py-s-4">
          <p className="text-ink-50 font-zen text-body">No song requests yet</p>
        </div>
      )}
    </div>
  );
}
