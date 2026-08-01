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

  // Handle SSE updates
  useEffect(() => {
    if (!sseEvent) return;
    const data = sseEvent.data as Record<string, unknown>;

    if (sseEvent.type === 'request-update') {
      // Update status of an existing song in the queue
      const updatedId = data.id as string;
      const updatedStatus = data.status as string;
      setSongs((prev) =>
        prev.map((song) =>
          song.id === updatedId ? { ...song, status: updatedStatus } : song
        )
      );
    }

    if (sseEvent.type === 'new-request') {
      // Add new song request to the queue if it is a SONG category
      const category = data.category as string;
      if (category === 'SONG') {
        const newSong: SongQueueItem = {
          id: data.id as string,
          item: data.item as string,
          deliveryValue: data.deliveryValue as string,
          status: data.status as string,
          createdAt: data.createdAt as string,
        };
        setSongs((prev) => [...prev, newSong]);
      }
    }
  }, [sseEvent]);

  if (loading) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Loading song queue">
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
    <div className="space-y-6" role="region" aria-label="Song request queue">
      {/* Now Playing / Up Next */}
      <section aria-labelledby="now-playing-heading">
        <h3
          id="now-playing-heading"
          className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
        >
          Now Playing / Up Next
        </h3>
        {nowPlaying ? (
          <div
            className={`rounded-lg border-2 p-4 ${
              isMine(nowPlaying.id)
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
            aria-current={isMine(nowPlaying.id) ? 'true' : undefined}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">🎶</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg truncate">{nowPlaying.item}</p>
                <p className="text-sm text-gray-500 truncate">
                  Requested by {nowPlaying.deliveryValue}
                </p>
              </div>
              {isMine(nowPlaying.id) && (
                <span className="shrink-0 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  You
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm italic">No songs in queue yet</p>
        )}
      </section>

      {/* In Queue */}
      <section aria-labelledby="in-queue-heading">
        <h3
          id="in-queue-heading"
          className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
        >
          In Queue {inQueue.length > 0 && `(${inQueue.length})`}
        </h3>
        {inQueue.length > 0 ? (
          <ol className="space-y-2" role="list" aria-label="Songs waiting in queue">
            {inQueue.map((song, index) => (
              <li
                key={song.id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  isMine(song.id)
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
                aria-label={`Position ${index + 2}: ${song.item} by ${song.deliveryValue}${isMine(song.id) ? ' (your request)' : ''}`}
              >
                <span className="shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                  {index + 2}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{song.item}</p>
                  <p className="text-xs text-gray-500 truncate">{song.deliveryValue}</p>
                </div>
                {isMine(song.id) && (
                  <span className="shrink-0 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    You
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-gray-400 text-sm italic">No more songs waiting</p>
        )}
      </section>

      {/* Already Played */}
      {alreadyPlayed.length > 0 && (
        <section aria-labelledby="already-played-heading">
          <h3
            id="already-played-heading"
            className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
          >
            Already Played ({alreadyPlayed.length})
          </h3>
          <ul className="space-y-2" role="list" aria-label="Songs already played">
            {alreadyPlayed.map((song) => (
              <li
                key={song.id}
                className={`flex items-center gap-3 rounded-lg border p-3 opacity-60 ${
                  isMine(song.id)
                    ? 'border-blue-300 bg-blue-50/50'
                    : 'border-gray-100 bg-gray-50'
                }`}
                aria-label={`${song.item} by ${song.deliveryValue} - played${isMine(song.id) ? ' (your request)' : ''}`}
              >
                <span className="shrink-0 text-lg" aria-hidden="true">&#10003;</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate line-through text-gray-500">{song.item}</p>
                  <p className="text-xs text-gray-400 truncate">{song.deliveryValue}</p>
                </div>
                {isMine(song.id) && (
                  <span className="shrink-0 text-xs font-medium bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
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
        <div className="text-center py-8">
          <span className="text-4xl" aria-hidden="true">🎵</span>
          <p className="text-gray-500 mt-2">No song requests yet. Be the first!</p>
        </div>
      )}
    </div>
  );
}
