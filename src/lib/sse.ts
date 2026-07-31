/**
 * In-process SSE Event Bus
 *
 * IMPORTANT: This event bus is an in-memory singleton that only delivers events
 * within the same Node.js process. It will NOT work across multiple server instances,
 * containers, or serverless functions. For multi-instance deployments, replace with
 * Redis pub/sub, Postgres LISTEN/NOTIFY, or another distributed messaging system.
 *
 * For this MVP, single-process deployment (e.g., `next start` on one container) is
 * the expected production topology.
 *
 * TODO: On Cloudflare Workers, each request runs in an isolated context with no
 * shared memory. This singleton will not deliver events across requests. Replace
 * with Durable Objects (one per party, holding WebSocket connections) or
 * Cloudflare Pub/Sub for production Workers deployment.
 */

type SSECallback = (eventType: string, data: unknown) => void;

interface Subscriber {
  id: string;
  callback: SSECallback;
}

/** Heartbeat interval in milliseconds (30s keeps connections alive through proxies/ALBs) */
export const SSE_HEARTBEAT_INTERVAL_MS = 30_000;

class SSEEventBus {
  private subscribers: Map<string, Subscriber[]> = new Map();
  private subscriberCounter = 0;

  /**
   * Subscribe to events for a specific party.
   * Returns an unsubscribe function.
   */
  subscribe(partyId: string, callback: SSECallback): () => void {
    const id = String(++this.subscriberCounter);
    const subscriber: Subscriber = { id, callback };

    const existing = this.subscribers.get(partyId) || [];
    existing.push(subscriber);
    this.subscribers.set(partyId, existing);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(partyId);
      if (subs) {
        const filtered = subs.filter((s) => s.id !== id);
        if (filtered.length === 0) {
          this.subscribers.delete(partyId);
        } else {
          this.subscribers.set(partyId, filtered);
        }
      }
    };
  }

  /**
   * Publish an event to all subscribers of a party.
   * Event types: 'menu-update', 'request-update', 'new-request'
   */
  publish(partyId: string, eventType: string, data: unknown): void {
    const subs = this.subscribers.get(partyId);
    if (subs) {
      for (const sub of subs) {
        try {
          sub.callback(eventType, data);
        } catch {
          // Don't let one subscriber's error affect others
        }
      }
    }
  }
}

// Singleton instance - survives hot reloads in development
const globalForSSE = globalThis as unknown as {
  sseEventBus: SSEEventBus | undefined;
};

export const sseEventBus = globalForSSE.sseEventBus ?? new SSEEventBus();

if (process.env.NODE_ENV !== 'production') {
  globalForSSE.sseEventBus = sseEventBus;
}
